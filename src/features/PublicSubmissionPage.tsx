import { useEffect, useState } from "react";
import { FhdodLogo } from "../components/branding/FhdodLogo";
import { Alert, ErrorState, LoadingState } from "../components/ui/Feedback";
import { Button } from "../components/ui/Button";
import { ApiError } from "../services/http";
import { PublicOmbudsmanPage } from "./OmbudsmanPage";
import { submissionsService, type SubmissionStart } from "./submissions";

export function PublicSubmissionPage({ sectorId }: { sectorId: number }) {
  const [start, setStart] = useState<SubmissionStart | null>(null);
  const [index, setIndex] = useState(0); const [score, setScore] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string>();
  const [complete, setComplete] = useState(false); const [closed, setClosed] = useState(false); const [ombudsmanOpen, setOmbudsmanOpen] = useState(false);
  const startSubmission = () => { setStart(null); setError(undefined); submissionsService.start(sectorId).then((value) => { setStart(value); setIndex(0); }).catch((cause) => setError(cause instanceof ApiError ? cause.message : "Não foi possível iniciar o formulário.")); };
  useEffect(() => { startSubmission(); }, [sectorId]);

  if (error && !start) return <main className="fhdod-auth-page"><ErrorState /><p className="mt-3 text-center">{error}</p><Button type="button" onClick={startSubmission}>Tentar novamente</Button></main>;
  if (!start) return <main className="fhdod-auth-page"><LoadingState /></main>;
  if (complete || closed) {
    const restart = async () => {
      setBusy(true); setError(undefined);
      try {
        const next = closed ? await submissionsService.start(sectorId) : await submissionsService.restart(start.capability.sessionId, start.capability.token);
        setStart(next); setComplete(false); setClosed(false); setScore(""); setIndex(0);
      } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Não foi possível iniciar uma nova avaliação."); }
      finally { setBusy(false); }
    };
    return <main className="fhdod-auth-page fhdod-public-page"><section className="fhdod-profile-card fhdod-public-card text-center"><FhdodLogo className="fhdod-public-logo" /><p className="eyebrow">{closed ? "Avaliação encerrada" : "Avaliação concluída"}</p><h1>Obrigado pela sua participação</h1><p>{closed ? "As respostas já registradas foram preservadas." : "Sua participação foi registrada."}</p>{error && <Alert tone="danger">{error}</Alert>}<div className="d-flex flex-wrap justify-content-center gap-2"><Button loading={busy} onClick={() => { void restart(); }}>Responder novamente</Button><Button type="button" variant="secondary" onClick={() => setOmbudsmanOpen(true)}>Enviar manifestação à Ouvidoria</Button></div></section><PublicOmbudsmanPage sectorId={sectorId} modal={ombudsmanOpen} onClose={() => setOmbudsmanOpen(false)} /></main>;
  }

  const question = start.questions[index];
  if (!question) return <main className="fhdod-auth-page"><LoadingState /></main>;
  const max = question.isNps ? 10 : 5; const min = question.isNps ? 0 : 1;
  const submit = async (skipped = false) => {
    if (busy) return;
    setBusy(true); setError(undefined);
    try {
      const numericScore = Number(score);
      if (!skipped && (score === "" || !Number.isInteger(numericScore) || numericScore < min || numericScore > max)) { setError(`Informe uma nota entre ${min} e ${max}.`); return; }
      const result = await submissionsService.answer(start.capability.sessionId, start.capability.token, { questionId: question.questionId, questionVersionId: question.questionVersionId, status: skipped ? "skipped" : "answered", score: skipped ? null : numericScore });
      setScore(""); if (result.status === "complete") setComplete(true); else setIndex((current) => Math.min(current + 1, start.questions.length - 1));
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Não foi possível registrar a resposta."); }
    finally { setBusy(false); }
  };
  const refresh = async () => { if (busy) return; setBusy(true); setError(undefined); try { const result = await submissionsService.refresh(start.capability.sessionId, start.capability.token); setStart({ ...start, session: { ...start.session, expiresAt: result.expiresAt } }); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Não foi possível ampliar o prazo."); } finally { setBusy(false); } };
  const close = async () => { if (busy || !window.confirm("Encerrar esta avaliação? As respostas já enviadas serão mantidas.")) return; setBusy(true); setError(undefined); try { await submissionsService.close(start.capability.sessionId, start.capability.token); setClosed(true); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Não foi possível encerrar esta avaliação."); } finally { setBusy(false); } };
  return <main className="fhdod-auth-page fhdod-public-page"><section className="fhdod-profile-card fhdod-public-card"><FhdodLogo className="fhdod-public-logo" /><p className="eyebrow">Avaliação do atendimento</p><div className="fhdod-question-progress"><span>Pergunta {index + 1} de {start.questions.length}</span><div className="progress" role="progressbar" aria-label="Progresso da avaliação" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={start.questions.length}><div className="progress-bar" style={{ width: `${((index + 1) / start.questions.length) * 100}%` }} /></div></div><h1>{question.text}</h1><p className="text-secondary mb-0">Selecione uma nota de {min} a {max}.</p>{error && <Alert tone="danger">{error}</Alert>}<div className="fhdod-score-options" data-nps={question.isNps} role="group" aria-label={`Notas de ${min} a ${max}`}>{Array.from({ length: max - min + 1 }, (_, offset) => min + offset).map((value) => <Button key={value} type="button" variant={score === String(value) ? "primary" : "secondary"} aria-pressed={score === String(value)} disabled={busy} onClick={() => setScore(String(value))}>{value}</Button>)}</div><div className="fhdod-question-actions"><Button type="button" loading={busy} onClick={() => { void submit(false); }}>Confirmar nota</Button>{question.questionKind === "sector" && <Button type="button" variant="tertiary" loading={busy} onClick={() => { void submit(true); }}>Pular</Button>}<Button type="button" variant="secondary" disabled={busy} onClick={() => { void refresh(); }}>Preciso de mais tempo</Button><Button type="button" variant="tertiary" disabled={busy} onClick={() => { void close(); }}>Encerrar</Button></div></section></main>;
}
