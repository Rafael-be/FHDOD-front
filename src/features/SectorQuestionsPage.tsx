import { useEffect, useState, type FormEvent } from "react";
import { BaseModal } from "../components/ui/BaseModal";
import { Button } from "../components/ui/Button";
import { Alert, EmptyState, ErrorState, LoadingState } from "../components/ui/Feedback";
import { ApiError } from "../services/http";
import { questionsService, type Question } from "./questions";
import { QuestionOrderPanel } from "./QuestionOrderPanel";
import { QuestionPreview } from "./QuestionPreview";

export function SectorQuestionsPage({ sectorId, canManageStandards }: { sectorId: number; canManageStandards: boolean }) {
  const [questions, setQuestions] = useState<Question[] | null>(null); const [error, setError] = useState(false); const [modal, setModal] = useState<"create" | "edit" | "deactivate" | "reactivate" | null>(null); const [selected, setSelected] = useState<Question | null>(null); const [message, setMessage] = useState<string>();
  const load = () => { setError(false); questionsService.list(sectorId, true).then(setQuestions).catch(() => setError(true)); };
  useEffect(load, [sectorId]);
  if (error) return <ErrorState />; if (!questions) return <LoadingState />;
  const own = questions.filter((question) => question.questionKind === "sector" && !question.isNps); const standards = questions.filter((question) => question.questionKind === "standard" && !question.isNps); const nps = questions.find((question) => question.isNps);
  return <section><div className="fhdod-page-heading"><div><p className="eyebrow">Setor {sectorId}</p><h1>Perguntas</h1><p>Pré-visualização administrativa do formulário efetivo deste setor.</p></div><Button onClick={() => setModal("create")}>Nova pergunta</Button></div>{message && <Alert tone="success">{message}</Alert>}<QuestionPreview questions={questions.filter((question) => question.deletedAt === null)} /><QuestionGroup title="Perguntas do setor" questions={own} editable onSelect={(question, action) => { setSelected(question); setModal(action); }} /><QuestionOrderPanel title="perguntas do setor" questions={own.filter((question) => question.deletedAt === null)} onSave={async (ids) => { await questionsService.reorderSector(sectorId, ids); setMessage("Ordem das perguntas atualizada."); load(); }} /><QuestionGroup title="Perguntas padrão aplicadas" questions={standards} editable={canManageStandards} onSelect={(question, action) => { setSelected(question); setModal(action); }} />{canManageStandards && <QuestionOrderPanel title="perguntas padrão" questions={standards.filter((question) => question.deletedAt === null)} onSave={async (ids) => { await questionsService.reorderStandard(sectorId, ids); setMessage("Ordem das perguntas padrão atualizada."); load(); }} />}{nps ? <QuestionGroup title="NPS vigente" questions={[nps]} editable={false} onSelect={() => undefined} /> : <Alert tone="info">Este setor ainda não possui NPS vigente.</Alert>}<QuestionDialog mode={modal} question={selected} onClose={() => setModal(null)} onDone={async (text) => { setModal(null); setMessage(text); load(); }} sectorId={sectorId} /></section>;
}

function QuestionGroup({ title, questions, editable, onSelect }: { title: string; questions: Question[]; editable: boolean; onSelect: (question: Question, action: "edit" | "deactivate" | "reactivate") => void }) { if (!questions.length) return <EmptyState title={title}>Nenhuma pergunta nesta seção.</EmptyState>; return <section className="mb-4"><h2 className="h4">{title}</h2>{questions.map((question) => <article className="fhdod-profile-card mb-3" key={question.id}><div className="d-flex justify-content-between gap-3"><div><p className="mb-1">{question.text}</p><small className="text-secondary">Escala {question.scaleMin}–{question.scaleMax} · versão {question.versionNumber}{question.deletedAt ? " · inativa" : ""}</small></div>{editable && <div>{question.deletedAt ? <Button variant="secondary" onClick={() => onSelect(question, "reactivate")}>Reativar</Button> : <><Button variant="tertiary" onClick={() => onSelect(question, "edit")}>Editar</Button><Button variant="destructive" onClick={() => onSelect(question, "deactivate")}>Desativar</Button></>}</div>}</div></article>)}</section>; }

function QuestionDialog({ mode, question, sectorId, onClose, onDone }: { mode: "create" | "edit" | "deactivate" | "reactivate" | null; question: Question | null; sectorId: number; onClose: () => void; onDone: (message: string) => Promise<void>; }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  useEffect(() => { setText(question?.text ?? ""); setFailure(undefined); }, [mode, question]);
  if (!mode) return null;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!["deactivate", "reactivate"].includes(mode) && (text.trim().length < 1 || text.trim().length > 2000)) { setFailure("A pergunta deve ter entre 1 e 2000 caracteres."); return; }
    setBusy(true);
    try {
      if (mode === "create") await questionsService.createSector(sectorId, text.trim());
      if (mode === "edit" && question) await questionsService.updateText(question.id, text.trim());
      if (mode === "deactivate" && question) await questionsService.deactivate(question.id);
      if (mode === "reactivate" && question) await questionsService.reactivate(question.id);
      await onDone(mode === "deactivate" ? "Pergunta desativada." : mode === "reactivate" ? "Pergunta reativada." : mode === "edit" ? "Nova versão da pergunta salva." : "Pergunta criada.");
    } catch (cause) {
      setFailure(cause instanceof ApiError ? cause.message : "Não foi possível concluir a operação.");
    } finally {
      setBusy(false);
    }
  };
  const title = mode === "create" ? "Nova pergunta" : mode === "edit" ? "Editar pergunta" : mode === "reactivate" ? "Reativar pergunta" : "Desativar pergunta";
  return <BaseModal open title={title} onRequestClose={onClose} busy={busy}><form className="mt-3" onSubmit={submit}>{failure && <Alert tone="danger">{failure}</Alert>}{mode === "deactivate" || mode === "reactivate" ? <p>{mode === "deactivate" ? "A pergunta deixará de aparecer nos formulários aplicáveis. Avaliações anteriores permanecem preservadas." : "A pergunta voltará a aparecer nos formulários aplicáveis, respeitando as regras de posição vigentes."}</p> : <><label className="form-label" htmlFor="question-text">Pergunta</label><textarea id="question-text" className="form-control mb-3" rows={5} value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} autoFocus required />{mode === "edit" && <Alert tone="info">Salvar cria uma nova versão; avaliações anteriores mantêm o texto usado.</Alert>}</>}<Button type="submit" loading={busy} variant={mode === "deactivate" ? "destructive" : "primary"}>{mode === "deactivate" ? "Confirmar desativação" : mode === "reactivate" ? "Confirmar reativação" : "Salvar"}</Button></form></BaseModal>;
}
