import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import { BaseModal } from "../components/ui/BaseModal";
import { Alert, EmptyState, ErrorState, LoadingState } from "../components/ui/Feedback";
import { ApiError } from "../services/http";
import { sectorsService, type Sector } from "./sectors";
import { formDraftService, normalizeDraftItems, type DraftItem, type DraftReadiness, type FormDraft, type FormVersion, type VersionDetail } from "./formDraft";
import { questionsService, type CatalogQuestion } from "./questions";
import { QuestionPreview } from "./QuestionPreview";
import { SectorQrDialog } from "./SectorQrDialog";

const requirementNames: Record<string, string> = {
  shift_ranges: "planilha de turnos", nps: "pergunta NPS", standard_questions: "pergunta padrão",
};
const requirement = (value: string) => requirementNames[value] ?? value;
const errorMessage = (cause: unknown) => cause instanceof ApiError ? cause.message : "Não foi possível concluir a operação.";
const formatPublishedAt = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

export function SectorQuestionsPage({ sectorId }: { sectorId: number; canManageStandards?: boolean }) {
  const [draft, setDraft] = useState<FormDraft | null>(null);
  const [sector, setSector] = useState<Sector | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [readiness, setReadiness] = useState<DraftReadiness | null>(null);
  const [versions, setVersions] = useState<FormVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<VersionDetail | null>(null);
  const [expandedVersionId, setExpandedVersionId] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<CatalogQuestion[]>([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const allowNavigation = useRef(false);

  const load = useCallback(async () => {
    const [state, ready, history, available, sectors] = await Promise.all([
      formDraftService.get(sectorId), formDraftService.readiness(sectorId),
      formDraftService.history(sectorId), questionsService.catalog(sectorId),
      sectorsService.list(),
    ]);
    setDraft(state); setSector(sectors.find((item) => item.id === sectorId) ?? null); setItems(normalizeDraftItems(state.items)); setReadiness(ready); setVersions(history);
    setCatalog(available.items.filter((item) => !item.deletedAt)); setCatalogPage(1); setCatalogTotal(available.total);
    setDirty(false); setConflict(false);
  }, [sectorId]);
  useEffect(() => { load().catch((cause) => setError(errorMessage(cause))); }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const navigate = (event: Event) => { if (allowNavigation.current) { allowNavigation.current = false; return; } event.preventDefault(); setShowLeaveConfirm(true); };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("fhdod:beforeNavigate", navigate);
    return () => { window.removeEventListener("beforeunload", warn); window.removeEventListener("fhdod:beforeNavigate", navigate); };
  }, [dirty]);
  const leaveWithoutSaving = () => { allowNavigation.current = true; setShowLeaveConfirm(false); window.dispatchEvent(new Event("fhdod:beforeNavigate", { cancelable: true })); };

  const change = (next: DraftItem[]) => { setItems(normalizeDraftItems(next)); setDirty(true); setMessage(undefined); };
  const move = (index: number, delta: number) => {
    const copy = [...items]; const target = index + delta;
    if (target < 0 || target >= copy.length || copy[index].isNps || copy[target].isNps) return;
    [copy[index], copy[target]] = [copy[target], copy[index]]; change(copy);
  };
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setError(undefined); setMessage(undefined);
    try { await operation(); }
    catch (cause) {
      const apiError = cause instanceof ApiError ? cause : null;
      if (apiError?.code === "DRAFT_CONFLICT") setConflict(true);
      if (apiError?.code === "FORM_NOT_READY") {
        const details = apiError.details as { missingRequirements?: string[] } | undefined;
        setError(details?.missingRequirements?.map(requirement).join(", ") ?? apiError.message);
      } else setError(errorMessage(cause));
    } finally { setBusy(false); }
  };
  const save = () => run(async () => {
    if (!draft) return;
    const result = await formDraftService.save(sectorId, draft.revision, items);
    await load(); setMessage(result.draftStatus === "drafting" ? "Rascunho salvo. A versão publicada não mudou." : "A composição é igual à versão atual.");
  });
  const discard = () => run(async () => {
    if (!draft || !window.confirm("Descartar todas as alterações do rascunho deste setor?")) return;
    if (dirty) { await load(); setMessage("Alterações locais descartadas."); return; }
    await formDraftService.discard(sectorId, draft.revision); await load(); setMessage("Rascunho descartado.");
  });
  const publish = () => run(async () => {
    if (!draft || dirty || draft.draftStatus !== "drafting") return;
    if (!window.confirm("Publicar esta revisão para novas avaliações?")) return;
    const result = await formDraftService.publish(sectorId, draft.revision);
    await load(); setMessage(result.published ? `Versão ${result.versionNumber} publicada.` : "Nenhuma mudança na versão publicada.");
  });
  const restore = (versionId: number) => run(async () => {
    if (!draft || dirty || !window.confirm("Copiar esta versão histórica para o rascunho? A publicação continuará manual.")) return;
    await formDraftService.restore(sectorId, versionId, draft.revision); await load();
    setSelectedVersion(null); setMessage("Versão copiada para o rascunho. Revise e publique quando estiver pronta.");
  });
  const addCatalog = (question: CatalogQuestion) => {
    if (items.some((item) => item.questionId === question.id)) return;
    const versionId = question.questionVersionId ?? question.versionId;
    if (!versionId) { setError("O catálogo não informou o ID da versão da pergunta. Consulte a integração do backend."); return; }
    const entry: DraftItem = { questionId: question.id, sourceQuestionVersionId: versionId, questionKind: "standard", isNps: question.isNps, text: question.text, position: items.length + 1 };
    change(question.isNps ? [...items.filter((item) => !item.isNps), entry] : [...items.filter((item) => !item.isNps), entry, ...items.filter((item) => item.isNps)]);
  };
  if (error && !draft) return <ErrorState />;
  if (!draft) return <LoadingState />;
  const available = catalog.filter((question) => !items.some((item) => item.questionId === question.id));
  return <section>
    <div className="fhdod-editor-intro"><div className="fhdod-page-heading"><div><p className="eyebrow">Setor {sectorId}</p><h1>Editor do formulário</h1>
      <p>Vigente: {draft.publishedVersionId ? `versão ID ${draft.publishedVersionId}` : "sem publicação"} · Rascunho: {draft.draftStatus === "drafting" ? `revisão ${draft.revision}` : "nenhum"}</p>
    </div><div className="fhdod-editor-heading-actions">{sector && <Button type="button" variant="secondary" onClick={() => document.getElementById("sector-question-editor")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Pergunta setorial</Button>}{sector && draft.publishedVersionId && <Button type="button" variant="secondary" onClick={() => setQrOpen(true)}>QR Code</Button>}</div></div></div>
    <p className="text-secondary">Setor selecionado: <strong>{sector?.name ?? sectorId}</strong>{sector?.code ? ` (${sector.code})` : ""}</p>
    {message && <Alert tone="success">{message}</Alert>}
    {error && <Alert tone="danger">{error}</Alert>}
    {conflict && <Alert tone="warning">Outra alteração foi salva. Sua edição local continua na tela. <Button type="button" variant="secondary" onClick={() => { if (window.confirm("Descartar a edição local e carregar a revisão mais recente?")) void load().catch((cause) => setError(errorMessage(cause))); }}>Recarregar revisão</Button></Alert>}
    {dirty && <Alert tone="warning">Há alterações locais ainda não salvas.</Alert>}
    <section className="fhdod-profile-card mb-3"><h2 className="h5">Composição candidata</h2>
      {!items.length && <EmptyState title="Sem perguntas">Adicione uma pergunta para preparar o formulário.</EmptyState>}
      {items.map((item, index) => <div className="border-bottom py-3" key={item.questionId ?? `new-${index}`}>
        <div className="d-flex justify-content-between gap-2"><strong>{index + 1}. {item.isNps ? "NPS" : item.questionKind === "standard" ? "Padrão" : "Setorial"}</strong>
          <div className="d-flex flex-wrap gap-1"><Button type="button" variant="tertiary" disabled={busy || item.isNps || index === 0} aria-label={`Subir pergunta ${index + 1}`} onClick={() => move(index, -1)}>↑</Button>
            <Button type="button" variant="tertiary" disabled={busy || item.isNps || index === items.length - 1 || items[index + 1]?.isNps} aria-label={`Descer pergunta ${index + 1}`} onClick={() => move(index, 1)}>↓</Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={() => change(items.filter((_, position) => position !== index))}>Remover</Button></div></div>
        <label className="form-label" htmlFor={`draft-question-${index}`}>Texto da pergunta</label>
        <textarea id={`draft-question-${index}`} className="form-control" maxLength={2000} rows={2} value={item.text} disabled={!item.canEditContent && item.questionId !== null}
          onChange={(event) => change(items.map((existing, position) => position === index ? { ...existing, text: event.target.value } : existing))} />
        {!item.canEditContent && item.questionId !== null && <small className="text-secondary">Conteúdo protegido: {item.isNps ? "o NPS global não pode ser editado neste formulário." : "esta é uma pergunta global e você não possui permissão para editá-la."}</small>}
      </div>)}
    </section>
    <QuestionPreview items={items} />
    <section id="sector-question-editor" className="fhdod-profile-card mb-3"><h2 className="h5">Adicionar pergunta setorial</h2>
      <label className="form-label" htmlFor="new-sector-question">Texto</label><textarea id="new-sector-question" className="form-control mb-2" maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} />
      <Button type="button" disabled={!text.trim() || busy} onClick={() => { change([...items.filter((item) => !item.isNps), { questionId: null, sourceQuestionVersionId: null, questionKind: "sector", isNps: false, text: text.trim(), position: items.length + 1, canEditContent: true }, ...items.filter((item) => item.isNps)]); setText(""); }}>Adicionar ao rascunho</Button>
    </section>
    <section className="fhdod-profile-card mb-3"><h2 className="h5">Perguntas disponíveis</h2><p className="text-secondary">Perguntas do catálogo que podem ser adicionadas a este formulário.</p>
      {available.length === 0 ? <p>Nenhum item disponível para associação nesta página do catálogo.</p> : available.map((question) => <div className="d-flex justify-content-between gap-2 border-bottom py-2" key={question.id}><span>{question.text} {question.isNps ? "(NPS)" : ""}</span><Button type="button" variant="secondary" disabled={busy} onClick={() => addCatalog(question)}>Associar</Button></div>)}
      {catalogPage * 100 < catalogTotal && <Button type="button" variant="tertiary" disabled={busy} onClick={() => { void run(async () => { const next = catalogPage + 1; const result = await questionsService.catalog(sectorId, next); setCatalog((current) => [...current, ...result.items.filter((item) => !item.deletedAt)]); setCatalogPage(next); setCatalogTotal(result.total); }); }}>Carregar mais perguntas</Button>}
    </section>
    <div className="fhdod-editor-actions d-flex flex-wrap gap-2 mb-3"><Button type="button" variant="secondary" loading={busy} disabled={!dirty || conflict} onClick={() => { void save(); }}>Salvar rascunho</Button>
      <Button type="button" variant="tertiary" disabled={busy || (draft.draftStatus !== "drafting" && !dirty)} onClick={() => { void discard(); }}>Descartar</Button>
      <Button type="button" variant="secondary" disabled={busy} onClick={() => { void run(async () => { setReadiness(await formDraftService.readiness(sectorId)); }); }}>Verificar prontidão</Button>
      <Button type="button" disabled={busy || dirty || conflict || draft.draftStatus !== "drafting" || readiness?.status !== "active"} onClick={() => { void publish(); }}>Publicar</Button></div>
    {readiness && <Alert tone={readiness.status === "active" ? "success" : "warning"}>{readiness.status === "active" ? "Configuração pronta para publicação." : `Pendente: ${readiness.missingRequirements.map(requirement).join(", ")}`}</Alert>}
    <section className="fhdod-profile-card mt-3"><h2 className="h5">Histórico de versões</h2>
      {versions.length === 0 ? <p>Nenhuma versão publicada.</p> : versions.map((version) => <div className="d-flex justify-content-between gap-2 border-bottom py-2" key={version.id}><span>Versão {version.versionNumber}{version.current ? " · vigente" : ""}<small className="d-block text-secondary">Publicada em {formatPublishedAt(version.publishedAt)}</small></span><Button type="button" variant="tertiary" aria-expanded={expandedVersionId === version.id} onClick={() => { if (expandedVersionId === version.id) { setExpandedVersionId(null); setSelectedVersion(null); return; } void run(async () => { setSelectedVersion(await formDraftService.version(sectorId, version.id)); setExpandedVersionId(version.id); }); }}>{expandedVersionId === version.id ? "Fechar" : "Visualizar"}</Button></div>)}
      {selectedVersion && expandedVersionId === selectedVersion.versionId && <div className="mt-3"><h3 className="h6">Versão {versions.find((version) => version.id === selectedVersion.versionId)?.versionNumber ?? selectedVersion.versionId}</h3><QuestionPreview items={selectedVersion.items} /><Button type="button" disabled={busy || dirty || conflict} onClick={() => { void restore(selectedVersion.versionId); }}>Restaurar para rascunho</Button></div>}
    </section>
    <SectorQrDialog sector={qrOpen ? sector : null} onClose={() => setQrOpen(false)} />
    <BaseModal open={showLeaveConfirm} title="Alterações não salvas" onRequestClose={() => setShowLeaveConfirm(false)}>
      <p>Você possui alterações no formulário que ainda não foram salvas. Se sair agora, essas alterações serão perdidas.</p>
      <div className="d-flex flex-wrap justify-content-end gap-2"><Button type="button" variant="tertiary" onClick={() => setShowLeaveConfirm(false)}>Continuar editando</Button><Button type="button" variant="destructive" onClick={leaveWithoutSaving}>Sair sem salvar</Button></div>
    </BaseModal>
  </section>;
}
