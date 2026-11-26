import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FhdodLogo } from "../components/branding/FhdodLogo";
import { Alert, LoadingState } from "../components/ui/Feedback";
import { Button } from "../components/ui/Button";
import { ApiError } from "../services/http";
import { PublicOmbudsmanPage } from "./OmbudsmanPage";
import { newAttempt, submissionsService, type CachedForm, type SubmissionAnswer, type SubmissionStart } from "./submissions";
import { exportSurveyTrace, surveyTraceEnabled, traceSurvey } from "./surveyTrace";

export const currentFormKey = (sectorId: number) => ["public-current-form", sectorId] as const;

function messageFor(error: unknown, loadingForm = false): string {
  if (!(error instanceof ApiError)) return error instanceof TypeError
    ? "Falha de conexão. Verifique sua internet e tente novamente."
    : "Ocorreu um erro inesperado. Tente novamente.";
  switch (error.code) {
    case "SECTOR_NOT_FOUND": return "Este setor não está disponível.";
    case "FORM_NOT_PUBLISHED":
    case "FORM_INCOMPLETE": return "A avaliação deste setor está indisponível no momento.";
    case "SUBMISSION_EXPIRED": return "O prazo da avaliação terminou. Inicie uma nova avaliação.";
    case "SUBMISSION_CLOSED": return "Esta avaliação foi encerrada. Inicie uma nova avaliação.";
    case "INVALID_ANSWER":
    case "INVALID_ANSWER_SCORE":
    case "QUESTION_NOT_SKIPPABLE":
    case "VALIDATION_ERROR": return "Esta resposta não é válida. Confira a opção e tente novamente.";
    case "QUESTION_OUT_OF_SEQUENCE":
    case "SUBMISSION_QUESTION_NOT_FOUND":
    case "ANSWER_ALREADY_CONFIRMED":
    case "SUBMISSION_CONFLICT": return "Não foi possível confirmar a sequência da avaliação. Inicie uma nova avaliação.";
    case "SUBMISSION_RATE_LIMITED": return "Muitas tentativas. Aguarde um momento e tente novamente.";
    case "SUBMISSION_CAPABILITY_INVALID":
    case "SUBMISSION_NOT_FOUND": return "Esta avaliação não está mais disponível. Inicie uma nova avaliação.";
    default: return loadingForm ? "Não foi possível carregar o formulário. Tente novamente." : "Não foi possível registrar a resposta. Tente novamente.";
  }
}

export function PublicSubmissionPage({ sectorId }: { sectorId: number }) {
  const queryClient = useQueryClient();
  const correlationId = useRef(crypto.randomUUID()).current;
  const openedAt = useRef(performance.now()).current;
  const requestLock = useRef(false);
  const pending = useRef<SubmissionAnswer | null>(null);
  const attempt = useRef<ReturnType<typeof newAttempt> | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [session, setSession] = useState<SubmissionStart | null>(null);
  const [pinned, setPinned] = useState<CachedForm | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | "skip" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [complete, setComplete] = useState(false);
  const [closed, setClosed] = useState(false);
  const [expired, setExpired] = useState(false);
  const [ombudsmanOpen, setOmbudsmanOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  const query = useQuery({
    queryKey: currentFormKey(sectorId),
    queryFn: async () => {
      traceSurvey("CURRENT_FORM_REQUEST", correlationId, sectorId);
      const started = performance.now();
      try {
        const result = await submissionsService.currentForm(sectorId, queryClient.getQueryData<CachedForm>(currentFormKey(sectorId)));
        traceSurvey("CURRENT_FORM_LOADED", correlationId, sectorId, { durationMs: performance.now() - started, networkMs: performance.now() - started, formVersionId: result.form.formVersionId, status: 200 });
        return result;
      } catch (cause) {
        traceSurvey("REQUEST_FAILED", correlationId, sectorId, { durationMs: performance.now() - started, status: cause instanceof ApiError ? cause.status : undefined });
        throw cause;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const form = pinned?.form ?? query.data?.form;
  const question = form?.questions[index];
  const expiresAt = session?.answer.expiresAt ?? session?.session.expiresAt;
  const remaining = expiresAt ? Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000)) : null;

  useEffect(() => {
    traceSurvey("SURVEY_PAGE_OPEN", correlationId, sectorId);
    traceSurvey(queryClient.getQueryData(currentFormKey(sectorId)) ? "FORM_CACHE_HIT" : "FORM_CACHE_MISS", correlationId, sectorId);
  }, [correlationId, sectorId, queryClient]);
  useEffect(() => {
    if (question && index === 0 && !session) traceSurvey("FIRST_QUESTION_RENDERED", correlationId, sectorId, { formVersionId: form?.formVersionId, renderMs: performance.now() - openedAt });
    heading.current?.focus();
  }, [question?.questionId, index, session, correlationId, sectorId, form?.formVersionId, openedAt]);
  useEffect(() => {
    if (!session || complete || closed || expired) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session, complete, closed, expired]);
  useEffect(() => {
    if (remaining === 0 && !busy && session && !complete && !closed && !expired) {
      setExpired(true);
      traceSurvey("SESSION_EXPIRED", correlationId, sectorId, { questionNumber: index + 1 });
    }
  }, [remaining, busy, session, complete, closed, expired, correlationId, sectorId, index]);

  const reset = async () => {
    requestLock.current = false;
    pending.current = null;
    attempt.current = null;
    setSession(null); setPinned(null); setIndex(0); setSelected(null);
    setError(undefined); setNotice(undefined); setComplete(false); setClosed(false); setExpired(false);
    await queryClient.invalidateQueries({ queryKey: currentFormKey(sectorId) });
  };
  const send = async (answer: SubmissionAnswer) => {
    if (requestLock.current || complete || closed || expired || !form || !question || pending.current && JSON.stringify(pending.current) !== JSON.stringify(answer)) return;
    requestLock.current = true;
    pending.current = answer;
    setBusy(true); setError(undefined);
    const started = performance.now();
    traceSurvey("ANSWER_REQUEST_STARTED", correlationId, sectorId, { questionNumber: index + 1, formVersionId: form.formVersionId });
    try {
      let result;
      let nextSession = session;
      if (!session) {
        attempt.current ??= newAttempt();
        nextSession = await submissionsService.start(sectorId, form.formVersionId, attempt.current.attemptId, attempt.current.capability, answer);
        setPinned({ form, etag: query.data?.etag });
        setSession(nextSession);
        result = nextSession.answer;
        traceSurvey("SESSION_STARTED", correlationId, sectorId, { questionNumber: 1, formVersionId: form.formVersionId });
      } else {
        result = await submissionsService.answer(session.capability.sessionId, session.capability.token, answer);
        setSession({ ...session, answer: result });
      }
      pending.current = null;
      setNow(Date.now());
      traceSurvey("ANSWER_CONFIRMED", correlationId, sectorId, { questionNumber: index + 1, formVersionId: form.formVersionId, networkMs: performance.now() - started });
      if (result.status === "complete") {
        setComplete(true);
        traceSurvey("SURVEY_COMPLETED", correlationId, sectorId, { questionNumber: index + 1 });
      } else {
        setIndex(index + 1);
        setSelected(null);
        traceSurvey("QUESTION_ADVANCED", correlationId, sectorId, { questionNumber: index + 2, durationMs: performance.now() - started });
      }
    } catch (cause) {
      traceSurvey("REQUEST_FAILED", correlationId, sectorId, { questionNumber: index + 1, status: cause instanceof ApiError ? cause.status : undefined, networkMs: performance.now() - started });
      if (cause instanceof ApiError && cause.code === "FORM_VERSION_CHANGED") {
        pending.current = null; attempt.current = null; setSelected(null);
        setNotice("O formulário foi atualizado. Responda a primeira pergunta da nova versão.");
        await queryClient.invalidateQueries({ queryKey: currentFormKey(sectorId) });
      } else if (cause instanceof ApiError && cause.code === "SUBMISSION_EXPIRED") {
        pending.current = null; setExpired(true); setError(messageFor(cause));
      } else if (cause instanceof ApiError && ["QUESTION_OUT_OF_SEQUENCE", "ANSWER_ALREADY_CONFIRMED", "SUBMISSION_CLOSED", "SUBMISSION_CONFLICT", "SUBMISSION_CAPABILITY_INVALID", "SUBMISSION_NOT_FOUND"].includes(cause.code ?? "")) {
        pending.current = null; setClosed(true); setError(messageFor(cause));
      } else {
        if (cause instanceof ApiError) pending.current = null;
        setError(messageFor(cause));
      }
    } finally { requestLock.current = false; setBusy(false); }
  };
  const choose = (score: number | "skip") => {
    if (!question || busy || pending.current) return;
    setSelected(score);
    traceSurvey("ANSWER_SELECTED", correlationId, sectorId, { questionNumber: index + 1, formVersionId: form?.formVersionId });
    void send({ questionId: question.questionId, questionVersionId: question.questionVersionId, status: score === "skip" ? "skipped" : "answered", score: score === "skip" ? null : score });
  };
  const refresh = async () => {
    if (!session || requestLock.current) return;
    requestLock.current = true; setBusy(true); setError(undefined);
    try {
      const result = await submissionsService.refresh(session.capability.sessionId, session.capability.token);
      setSession({ ...session, answer: { ...session.answer, expiresAt: result.expiresAt } });
      setNow(Date.now());
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "SUBMISSION_EXPIRED") setExpired(true);
      setError(messageFor(cause));
    } finally { requestLock.current = false; setBusy(false); }
  };
  const close = async () => {
    if (!session || requestLock.current || !window.confirm("Encerrar esta avaliação? As respostas já enviadas serão mantidas.")) return;
    requestLock.current = true; setBusy(true); setError(undefined);
    try { await submissionsService.close(session.capability.sessionId, session.capability.token); setClosed(true); }
    catch (cause) { setError(messageFor(cause)); }
    finally { requestLock.current = false; setBusy(false); }
  };
  const traceButton = surveyTraceEnabled && <Button type="button" variant="tertiary" onClick={exportSurveyTrace}>Exportar trace JSON</Button>;
  if (query.isPending && !pinned) return <main className="fhdod-auth-page fhdod-public-page"><LoadingState /></main>;
  if (query.isError && !pinned && !session) return <main className="fhdod-auth-page fhdod-public-page"><section className="fhdod-profile-card fhdod-public-card"><FhdodLogo className="fhdod-public-logo" /><Alert tone="danger">{messageFor(query.error, true)}</Alert><Button type="button" onClick={() => void query.refetch()}>Tentar novamente</Button>{traceButton}</section></main>;
  if (complete || closed || expired) return <main className="fhdod-auth-page fhdod-public-page"><section className="fhdod-profile-card fhdod-public-card text-center"><FhdodLogo className="fhdod-public-logo" /><p className="eyebrow">{complete ? "Avaliação concluída" : expired ? "Prazo encerrado" : "Avaliação encerrada"}</p><h1>{complete ? "Obrigado pela sua participação" : expired ? "O prazo da avaliação terminou" : "Avaliação encerrada"}</h1><p>{complete ? "Sua participação foi registrada." : "As respostas já confirmadas foram preservadas."}</p>{error && <Alert tone="danger">{error}</Alert>}<div className="d-flex flex-wrap justify-content-center gap-2"><Button type="button" onClick={() => void reset()}>Iniciar nova avaliação</Button><Button type="button" variant="secondary" onClick={() => setOmbudsmanOpen(true)}>Enviar manifestação à Ouvidoria</Button>{traceButton}</div></section><PublicOmbudsmanPage sectorId={sectorId} modal={ombudsmanOpen} onClose={() => setOmbudsmanOpen(false)} /></main>;
  if (!form || !question) return <main className="fhdod-auth-page fhdod-public-page"><Alert tone="danger">A avaliação está indisponível no momento.</Alert></main>;
  return <main className="fhdod-auth-page fhdod-public-page"><section className="fhdod-profile-card fhdod-public-card"><FhdodLogo className="fhdod-public-logo" /><p className="eyebrow">Avaliação do atendimento</p><div className="fhdod-question-progress"><span>Pergunta {index + 1} de {form.questions.length}</span><div className="progress" role="progressbar" aria-label="Perguntas confirmadas" aria-valuenow={index} aria-valuemin={0} aria-valuemax={form.questions.length}><div className="progress-bar" style={{ width: `${(index / form.questions.length) * 100}%` }} /></div></div><h1 ref={heading} tabIndex={-1}>{question.text}</h1><p className="text-secondary mb-0">Selecione uma nota de {question.minScore} a {question.maxScore}.</p>{session && remaining !== null && <p role="timer" className="text-secondary mt-2">Tempo restante: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>}{notice && <Alert tone="info">{notice}</Alert>}{error && <Alert tone="danger">{error}</Alert>}<div className="fhdod-score-options" data-nps={question.isNps} role="group" aria-label={`Notas de ${question.minScore} a ${question.maxScore}`}>{question.options.map((value) => <Button key={value} type="button" variant={selected === value ? "primary" : "secondary"} aria-label={`Nota ${value}`} aria-pressed={selected === value} disabled={busy || !!pending.current} onClick={() => choose(value)}>{value}</Button>)}</div>{busy && <p role="status" aria-live="polite">Enviando resposta…</p>}<div className="fhdod-question-actions">{question.questionKind === "sector" && <Button type="button" variant="tertiary" disabled={busy || !!pending.current} onClick={() => choose("skip")}>Pular pergunta</Button>}{pending.current && !busy && <Button type="button" onClick={() => void send(pending.current!)}>Tentar enviar novamente</Button>}{session && <Button type="button" variant="secondary" disabled={busy} onClick={() => void refresh()}>Preciso de mais tempo</Button>}{session && <Button type="button" variant="tertiary" disabled={busy} onClick={() => void close()}>Encerrar</Button>}{traceButton}</div></section></main>;
}
