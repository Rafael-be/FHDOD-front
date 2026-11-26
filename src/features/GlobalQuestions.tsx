import { useState } from "react";
import type { GlobalQuestionMetric } from "./analytics";

const identity = (row: GlobalQuestionMetric) => `${row.questionId}/${row.questionVersionId}/${row.isNps}`;
const meanLabel = (mean: number | null, max: number) => mean === null ? "Sem respostas" : `${mean.toLocaleString("pt-BR", {maximumFractionDigits: 2})} / ${max}`;

export function GlobalQuestions({ rows, selected, name }: {
  rows: GlobalQuestionMetric[]; selected: number[]; name: (sector: number) => string;
}) {
  const [selection, setSelection] = useState("");
  const row = rows.find(item => identity(item) === selection) ?? rows[0];
  const maximum = row?.isNps ? 10 : 5;
  return <section className="fhdod-profile-card">
    <h2>Satisfação por pergunta global</h2>
    <p>Setores selecionados: {selected.map(name).join(", ") || "Todos os autorizados"}</p>
    {!row ? <p>Nenhuma pergunta global neste recorte.</p> : <>
      <label>Pergunta global<select className="form-select" value={identity(row)} onChange={event => setSelection(event.target.value)}>
        {rows.map(item => <option key={identity(item)} value={identity(item)}>{item.text} · versão {item.questionVersionId} · {item.isNps ? "0–10" : "1–5"}</option>)}
      </select></label>
      <p>Publicada atualmente em: {row.publishedSectorIds.map(name).join(", ") || "Nenhum setor selecionado"}</p>
      <p>{row.responses} respostas válidas · Média: {meanLabel(row.mean, maximum)}</p>
      <h3>Distribuição das notas</h3>
      {!row.distribution.length && <p>Sem respostas no período.</p>}
      {row.distribution.map(bucket => <div key={bucket.score} className="fhdod-chart-row">
        <div>Nota {bucket.score} · {bucket.responses} respostas ({bucket.percentage.toLocaleString("pt-BR", {maximumFractionDigits: 1})}%)</div>
        <div className="progress"><div className="progress-bar" style={{width: `${bucket.percentage}%`}} /></div>
      </div>)}
      <h3>Resultado por setor</h3>
      <ul>{Array.from(new Set([...selected, ...row.sectors.map(item => item.sectorId)])).map(id => {
        const sector = row.sectors.find(item => item.sectorId === id);
        return <li key={id}>{name(id)} — {sector ? `${sector.responses} respostas · ${meanLabel(sector.mean, maximum)}` : "Sem respostas no período"}{!row.publishedSectorIds.includes(id) && " · Sem publicação vigente"}</li>;
      })}</ul>
    </>}
  </section>;
}
