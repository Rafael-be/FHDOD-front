import type { DraftItem } from "./formDraft";

export function QuestionPreview({ items }: { items: DraftItem[] }) {
  if (!items.length) return null;
  return <section className="fhdod-profile-card mb-4" aria-label="Pré-visualização administrativa">
    <h2 className="h5">Pré-visualização do formulário</h2>
    <p className="text-secondary">Esta é uma pré-visualização administrativa. Nenhuma resposta será registrada.</p>
    {items.map((item, index) => {
      const min = item.isNps ? 0 : 1;
      const max = item.isNps ? 10 : 5;
      return <div className="mb-4" key={`${item.questionId ?? "new"}-${index}`}>
        <p className="mb-2"><strong>{index + 1}. {item.isNps ? "NPS" : "Pergunta"}</strong> {item.text}</p>
        <div className="d-flex flex-wrap gap-2" aria-label={`Escala de ${min} a ${max}`}>
          {[...Array.from({ length: max - min + 1 }, (_, offset) => min + offset)].reverse().map((value) => <button className="btn btn-outline-secondary" type="button" key={value} tabIndex={-1}>{value}</button>)}
        </div>
      </div>;
    })}
  </section>;
}
