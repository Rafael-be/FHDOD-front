import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/Feedback";
import { SectorQuestionsPage } from "./SectorQuestionsPage";
import { sectorsService, type Sector } from "./sectors";

export function FormsPage() {
  const [sectors, setSectors] = useState<Sector[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    sectorsService.list().then((items) => {
      if (!active) return;
      const available = items.filter((item) => !item.deletedAt);
      setSectors(available);
      setSelectedId((current) => current && available.some((item) => item.id === current) ? current : available[0]?.id ?? null);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  if (failed) return <ErrorState />;
  if (!sectors) return <LoadingState />;
  if (!sectors.length) return <EmptyState title="Nenhum setor disponível">Você não possui setores autorizados para administrar formulários.</EmptyState>;
  return <section className="fhdod-forms-page">
    <div className="fhdod-page-heading">
      <div><p className="eyebrow">Administração</p><h1>Formulários</h1><p>Selecione um setor para organizar perguntas, validar e publicar sua avaliação.</p></div>
      <label className="fhdod-sector-selector"> <span>Setor</span><select className="form-select" value={selectedId ?? ""} onChange={(event) => setSelectedId(Number(event.target.value))} aria-label="Selecionar setor">
        {sectors.map((sector) => <option key={sector.id} value={sector.id}>{sector.name}{sector.code ? ` · ${sector.code}` : ""}</option>)}
      </select></label>
    </div>
    {selectedId !== null && <SectorQuestionsPage key={selectedId} sectorId={selectedId} />}
  </section>;
}
