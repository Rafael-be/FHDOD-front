import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Feedback";
import type { Question } from "./questions";

export function QuestionOrderPanel({ title, questions, onSave }: { title: string; questions: Question[]; onSave: (ids: number[]) => Promise<void> }) {
  const [ordered, setOrdered] = useState(questions); const [busy, setBusy] = useState(false); const [error, setError] = useState<string>();
  useEffect(() => { setOrdered(questions); }, [questions]);
  if (ordered.length < 2) return null;
  const move = (index: number, delta: number) => setOrdered((current) => { const copy = [...current]; const target = index + delta; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy; });
  const save = async () => { setBusy(true); setError(undefined); try { await onSave(ordered.map((question) => question.id)); } catch { setError("A lista mudou ou não pôde ser salva. Atualize e tente novamente."); } finally { setBusy(false); } };
  return <section className="fhdod-profile-card mb-4"><h2 className="h5">Reorganizar {title}</h2><p className="text-secondary">Use os botões para alterar a ordem. O NPS não participa desta lista.</p>{error && <Alert tone="danger">{error}</Alert>}{ordered.map((question, index) => <div className="d-flex justify-content-between align-items-center border-bottom py-2" key={question.id}><span>{index + 1}. {question.text}</span><span><Button variant="tertiary" type="button" disabled={busy || index === 0} aria-label={`Subir pergunta ${index + 1}`} onClick={() => move(index, -1)}>↑</Button><Button variant="tertiary" type="button" disabled={busy || index === ordered.length - 1} aria-label={`Descer pergunta ${index + 1}`} onClick={() => move(index, 1)}>↓</Button></span></div>)}<Button className="mt-3" type="button" loading={busy} onClick={() => { void save(); }}>Salvar ordem</Button></section>;
}
