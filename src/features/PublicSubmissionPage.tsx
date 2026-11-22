import { useEffect, useState } from "react";
import { Alert, ErrorState, LoadingState } from "../components/ui/Feedback";
import { Button } from "../components/ui/Button";
import { ApiError } from "../services/http";
import { submissionsService, type SubmissionStart } from "./submissions";

export function PublicSubmissionPage({ sectorId }: { sectorId: number }) {
  const [start, setStart] = useState<SubmissionStart | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    setStart(null);
    setError(undefined);
    submissionsService.start(sectorId).then((value) => { setStart(value); setIndex(0); }).catch((cause) => setError(cause instanceof ApiError ? cause.message : "Não foi possível iniciar o formulário."));
  }, [sectorId]);

  if (error) return <main className="fhdod-auth-page"><ErrorState /><p className="mt-3 text-center">{error}</p></main>;
  if (!start) return <main className="fhdod-auth-page"><LoadingState /></main>;
  if (complete) {
    const restart = async () => {
      setBusy(true);
      setError(undefined);
      try {
        const next = await submissionsService.restart(start.capability.sessionId, start.capability.token);
        setStart(next);
        setComplete(false);
        setScore("");
        setIndex(0);
      } catch (cause) {
        setError(cause instanceof ApiError ? cause.message : "Não foi possível iniciar uma nova avaliação.");
      } finally {
        setBusy(false);
      }
    };
    return <main className="fhdod-auth-page"><section className="fhdod-profile-card text-center"><p className="eyebrow">Avaliação concluída</p><h1>Obrigado pela sua resposta</h1><p>Sua participação foi registrada.</p>{error && <Alert tone="danger">{error}</Alert>}<Button loading={busy} onClick={() => { void restart(); }}>Responder novamente</Button></section></main>;
  }

  const question = start.questions[index];
  if (!question) return <main className="fhdod-auth-page"><LoadingState /></main>;
  const max = question.isNps ? 10 : 5;
  const min = question.isNps ? 0 : 1;

  const submit = async (skipped = false) => {
    setBusy(true);
    setError(undefined);
    try {
      const numericScore = skipped ? null : Number(score);
      if (!skipped && (numericScore === null || !Number.isInteger(numericScore) || numericScore < min || numericScore > max)) {
        setError(`Informe uma nota entre ${min} e ${max}.`);
        return;
      }
      const result = await submissionsService.answer(start.capability.sessionId, start.capability.token, {
        sessionQuestionId: question.sessionQuestionId,
        status: skipped ? "skipped" : "answered",
        score: numericScore,
      });
      setScore("");
      if (result.status === "complete") setComplete(true);
      else setIndex((current) => Math.min(current + 1, start.questions.length - 1));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível registrar a resposta.");
    } finally {
      setBusy(false);
    }
  };

  return <main className="fhdod-auth-page"><section className="fhdod-profile-card"><p className="eyebrow">Pergunta {index + 1} de {start.questions.length}</p><h1>{question.text}</h1>{error && <Alert tone="danger">{error}</Alert>}<div className="d-flex flex-wrap gap-2 my-4">{Array.from({ length: max - min + 1 }, (_, offset) => min + offset).map((value) => <Button key={value} type="button" variant={score === String(value) ? "primary" : "secondary"} onClick={() => setScore(String(value))}>{value}</Button>)}</div><div className="d-flex gap-2">{question.questionKind === "sector" && <Button type="button" variant="tertiary" loading={busy} onClick={() => { void submit(true); }}>Pular</Button>}<Button type="button" loading={busy} onClick={() => { void submit(false); }}>Confirmar</Button></div></section></main>;
}
