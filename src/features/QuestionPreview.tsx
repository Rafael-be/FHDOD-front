import type { Question } from "./questions";

export function QuestionPreview({ questions }: { questions: Question[] }) {
  if (!questions.length) return null;
  return <section className="fhdod-profile-card mb-4"><h2 className="h5">Pré-visualização do formulário</h2><p className="text-secondary">Nenhuma avaliação será registrada nesta pré-visualização.</p>{questions.map((question) => <div className="mb-4" key={question.id}><p className="mb-2">{question.text}</p><div className="d-flex flex-wrap gap-2" aria-label={`Escala de ${question.scaleMin} a ${question.scaleMax}`} >{Array.from({ length: question.scaleMax - question.scaleMin + 1 }, (_, index) => <button className="btn btn-outline-secondary" type="button" key={index}>{question.scaleMin + index}</button>)}</div></div>)}</section>;
}
