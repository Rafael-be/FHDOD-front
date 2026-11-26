import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FhdodLogo } from "../components/branding/FhdodLogo";
import { Alert, LoadingState } from "../components/ui/Feedback";
import { BaseModal } from "../components/ui/BaseModal";
import { Button } from "../components/ui/Button";
import { ApiError } from "../services/http";
import { PublicOmbudsmanPage } from "./OmbudsmanPage";
import { newAttempt, submissionsService, type CachedForm, type SubmissionAnswer, type SubmissionStart } from "./submissions";
import { exportSurveyTrace, surveyTraceEnabled, traceSurvey } from "./surveyTrace";

export const currentFormKey = (sectorId: number) => ["public-current-form", sectorId] as const;
function messageFor(error: unknown, loadingForm = false): string {
  if (!(error instanceof ApiError)) return error instanceof TypeError ? "Falha de conexão. Verifique sua internet e tente novamente." : "Ocorreu um erro inesperado. Tente novamente.";
  const messages: Record<string, string> = { SECTOR_NOT_FOUND: "Este setor não está disponível.", FORM_NOT_PUBLISHED: "A avaliação deste setor está indisponível no momento.", FORM_INCOMPLETE: "A avaliação deste setor está indisponível no momento.", SUBMISSION_EXPIRED: "O prazo da avaliação terminou. Inicie uma nova avaliação.", SUBMISSION_CLOSED: "Esta avaliação foi encerrada. Inicie uma nova avaliação.", INVALID_ANSWER: "Esta resposta não é válida. Confira a opção e tente novamente.", INVALID_ANSWER_SCORE: "Esta resposta não é válida. Confira a opção e tente novamente.", QUESTION_NOT_SKIPPABLE: "Esta pergunta não pode ser pulada.", SUBMISSION_RATE_LIMITED: "Muitas tentativas. Aguarde um momento e tente novamente." };
  return messages[error.code ?? ""] ?? error.message ?? (loadingForm ? "Não foi possível carregar o formulário. Tente novamente." : "Não foi possível registrar a resposta. Tente novamente.");
}

export function PublicSubmissionPage({ sectorId }: { sectorId: number }) {
  const [generation, advance] = useState(0);
  const [message, setMessage] = useState("");
  return <SurveyAttempt key={`${sectorId}/${generation}`} sectorId={sectorId} initialNotice={message} onReset={notice => {
    setMessage(notice); advance(value => value + 1);
  }} />;
}

function SurveyAttempt({sectorId, initialNotice, onReset}: {sectorId: number; initialNotice: string; onReset: (notice: string) => void}) {
  const active = useRef(true);
  const lowNps = useRef(false);
  const [ticketType, setTicketType] = useState<"complaint" | "compliment">("compliment");
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const queryClient = useQueryClient(); const [correlationId] = useState(() => crypto.randomUUID()); const requestLock = useRef(false); const pending = useRef<SubmissionAnswer | null>(null); const attempt = useRef<ReturnType<typeof newAttempt> | null>(null); const heading = useRef<HTMLHeadingElement>(null); const expiryPrompted = useRef(false);
  const [session, setSession] = useState<SubmissionStart | null>(null); const [pinned, setPinned] = useState<CachedForm | null>(null); const [index, setIndex] = useState(0); const [selected, setSelected] = useState<number | "skip" | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState<string>(); const [notice, setNotice] = useState(initialNotice); const [complete, setComplete] = useState(false); const [closed, setClosed] = useState(false); const [ombudsmanOpen, setOmbudsmanOpen] = useState(false); const [now, setNow] = useState(Date.now()); const [refreshesRemaining, setRefreshesRemaining] = useState<number | null>(null); const [expiryPromptOpen, setExpiryPromptOpen] = useState(false); const [nextFormIn, setNextFormIn] = useState(15);
  const query = useQuery({ queryKey: currentFormKey(sectorId), queryFn: () => submissionsService.currentForm(sectorId, queryClient.getQueryData<CachedForm>(currentFormKey(sectorId))), staleTime: 5 * 60 * 1000, retry: false });
  const form = pinned?.form ?? query.data?.form; const question = form?.questions[index]; const expiresAt = session?.answer.expiresAt ?? session?.session.expiresAt; const remaining = expiresAt ? Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000)) : null;
  useEffect(() => { traceSurvey("SURVEY_PAGE_OPEN", correlationId, sectorId); }, [correlationId, sectorId]);
  useEffect(() => { if (question) heading.current?.focus(); }, [question?.questionId, index]);
  useEffect(() => { if (!session || complete || closed) return undefined; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [session, complete, closed]);
  function reset(message = "") {
    if (!active.current) return;
    active.current = false;
    void queryClient.invalidateQueries({queryKey: currentFormKey(sectorId), refetchType: "none"});
    onReset(message);
  }
  useEffect(() => {
    if (remaining === 0 && session && !complete && !closed) reset("O prazo da avaliação terminou. Inicie uma nova avaliação.");
  }, [remaining, session, complete, closed]);
  useEffect(() => {
    if (remaining !== null && remaining > 0 && remaining <= 10 && (refreshesRemaining ?? 0) > 0 && !expiryPrompted.current && !busy && !complete) {
      expiryPrompted.current = true; setExpiryPromptOpen(true);
    }
  }, [remaining, refreshesRemaining, busy, complete]);
  useEffect(() => { if (!complete || ombudsmanOpen) return undefined; const timer = window.setInterval(() => setNextFormIn(value => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, [complete, ombudsmanOpen]);
  useEffect(() => { if (complete && nextFormIn === 0 && !ombudsmanOpen) reset(); }, [complete, nextFormIn, ombudsmanOpen]);

  function sessionError(cause: unknown) {
    if (!(cause instanceof ApiError)) return false;
    switch (cause.code) {
      case "SUBMISSION_EXPIRED":
      case "SUBMISSION_CLOSED":
        reset(messageFor(cause)); return true;
      case "SUBMISSION_COMPLETED":
        setComplete(true); setExpiryPromptOpen(false); return true;
      case "SUBMISSION_REFRESH_LIMIT":
        setRefreshesRemaining(0); setExpiryPromptOpen(false); return true;
      case "SUBMISSION_CAPABILITY_INVALID":
      case "SUBMISSION_NOT_FOUND":
        setClosed(true); setError(cause.message); return true;
      default: return false;
    }
  }
  const send = async (answer: SubmissionAnswer) => {
    if (requestLock.current || complete || closed || !form || !question || (pending.current && JSON.stringify(pending.current) !== JSON.stringify(answer))) return;
    requestLock.current = true; pending.current = answer; setBusy(true); setError(undefined);
    try {
      let result;
      if (!session) {
        attempt.current ??= newAttempt();
        setPinned({ form, etag: query.data?.etag });
        const started = await submissionsService.start(sectorId, form.formVersionId, attempt.current.attemptId, attempt.current.capability, answer);
        if (!active.current) return;
        setSession(started);
        setRefreshesRemaining(started.answer.refreshesRemaining ?? 3);
        result = started.answer;
      } else {
        result = await submissionsService.answer(session.capability.sessionId, session.capability.token, answer);
        if (!active.current) return;
        setSession({ ...session, answer: result });
      }
      pending.current = null;
      setNow(Date.now());
      if (question.isNps && answer.score !== null && answer.score <= 6) lowNps.current = true;
      expiryPrompted.current = false;
      setExpiryPromptOpen(false);
      if (result.status === "complete") {
        setComplete(true);
        if (lowNps.current) { setTicketType("complaint"); setOmbudsmanOpen(true); }
      } else { setIndex(index + 1); setSelected(null); }
    } catch (cause) {
      if (!active.current || sessionError(cause)) return;
      if (cause instanceof ApiError && cause.code === "FORM_VERSION_CHANGED") {
        attempt.current = null;
        pending.current = null;
        setPinned(null);
        setSelected(null);
        setNotice("O formulário foi atualizado. Responda a primeira pergunta da nova versão.");
        await queryClient.invalidateQueries({ queryKey: currentFormKey(sectorId) });
      } else {
        if (cause instanceof ApiError && cause.status === 400) pending.current = null;
        setError(messageFor(cause));
      }
    } finally {
      if (active.current) { requestLock.current = false; setBusy(false); }
    }
  };
  const choose = (score: number | "skip") => { if (!question || busy || pending.current) return; setSelected(score); void send({ questionId: question.questionId, questionVersionId: question.questionVersionId, status: score === "skip" ? "skipped" : "answered", score: score === "skip" ? null : score }); };
  const refresh = async () => {
    if (!session || requestLock.current) return;
    requestLock.current = true; setBusy(true); setError(undefined);
    try {
      const result = await submissionsService.refresh(session.capability.sessionId, session.capability.token);
      if (!active.current) return;
      setSession({ ...session, answer: { ...session.answer, expiresAt: result.expiresAt } });
      setRefreshesRemaining(result.refreshesRemaining);
      setExpiryPromptOpen(false);
      expiryPrompted.current = false;
      setNow(Date.now());
    } catch (cause) {
      if (active.current && !sessionError(cause)) setError(messageFor(cause));
    } finally {
      if (active.current) { requestLock.current = false; setBusy(false); }
    }
  };
  const close = async () => {
    if (!session || requestLock.current || !window.confirm("Encerrar esta avaliação? As respostas já enviadas serão mantidas.")) return;
    requestLock.current = true; setBusy(true);
    try {
      await submissionsService.close(session.capability.sessionId, session.capability.token);
      reset("Avaliação encerrada. As respostas confirmadas foram preservadas.");
    } catch (cause) {
      if (active.current && !sessionError(cause)) setError(messageFor(cause));
    } finally {
      if (active.current) { requestLock.current = false; setBusy(false); }
    }
  };
  const traceButton = surveyTraceEnabled && <Button type="button" variant="tertiary" onClick={exportSurveyTrace}>Exportar trace JSON</Button>;
  if (query.isPending && !pinned) return <main className="fhdod-auth-page fhdod-public-page"><LoadingState /></main>;
  if (query.isError && !pinned && !session) return <main className="fhdod-auth-page fhdod-public-page"><section className="fhdod-profile-card fhdod-public-card"><FhdodLogo className="fhdod-public-logo" /><Alert tone="danger">{messageFor(query.error, true)}</Alert><Button type="button" onClick={() => void query.refetch()}>Tentar novamente</Button>{traceButton}</section></main>;
  if (complete || closed) return <main className="fhdod-auth-page fhdod-public-page"><section className="fhdod-profile-card fhdod-public-card text-center"><FhdodLogo className="fhdod-public-logo" /><p className="eyebrow">{complete ? "Avaliação concluída" : "Avaliação encerrada"}</p><h1>{complete ? "Obrigado pela sua participação" : "Avaliação encerrada"}</h1><p>{complete ? "Suas respostas foram registradas." : "As respostas já confirmadas foram preservadas."}</p>{error && <Alert tone="danger">{error}</Alert>}{complete && <p className="mt-4 mb-2">Próximo formulário em <strong>00:{String(nextFormIn).padStart(2, "0")}</strong></p>}<div className="d-flex flex-wrap justify-content-center gap-2"><Button type="button" onClick={() => void reset()}>{complete ? "Responder agora" : "Iniciar nova avaliação"}</Button><Button type="button" variant="secondary" onClick={() => { setTicketType("compliment"); setOmbudsmanOpen(true); }}>Escrever manifestação</Button>{traceButton}</div></section>{ombudsmanOpen && <PublicOmbudsmanPage sectorId={sectorId} modal initialType={ticketType} onClose={() => setOmbudsmanOpen(false)} />}</main>;
  if (!form || !question) return <main className="fhdod-auth-page fhdod-public-page"><Alert tone="danger">A avaliação está indisponível no momento.</Alert></main>;
  const options: number[] = question.isNps ? question.options : [...question.options].reverse();
  return <main className="fhdod-auth-page fhdod-public-page"><section className="fhdod-profile-card fhdod-public-card"><FhdodLogo className="fhdod-public-logo" /><p className="eyebrow">Avaliação do atendimento</p><h1 ref={heading} tabIndex={-1}>{question.text}</h1><p className="text-secondary mb-0">Selecione uma nota de {question.minScore} a {question.maxScore}.</p>{remaining !== null && remaining <= 10 && refreshesRemaining === 0 && <Alert tone="warning">O tempo está acabando. Todas as renovações foram utilizadas.</Alert>}{session && remaining !== null && <p role="timer" className="text-secondary mt-2">Tempo restante: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p>}{notice && <Alert tone="info">{notice}</Alert>}{error && <Alert tone="danger">{error}</Alert>}<div className="fhdod-score-options" data-nps={question.isNps} role="group" aria-label={`Notas de ${question.minScore} a ${question.maxScore}`}>{options.map((value) => <Button key={value} type="button" variant={selected === value ? "primary" : "secondary"} aria-label={`Nota ${value}`} aria-pressed={selected === value} disabled={busy || !!pending.current} onClick={() => choose(value)}>{value}</Button>)}</div>{busy && <p role="status" aria-live="polite">Enviando resposta…</p>}<div className="fhdod-question-actions">{question.questionKind === "sector" && !question.required && <Button type="button" variant="tertiary" disabled={busy || !!pending.current} onClick={() => choose("skip")}>Pular</Button>}{pending.current && !busy && <Button type="button" onClick={() => void send(pending.current!)}>Tentar enviar novamente</Button>}{session && <Button type="button" variant="tertiary" disabled={busy} onClick={() => void close()}>Encerrar sessão</Button>}{traceButton}</div></section><BaseModal open={expiryPromptOpen} title="Seu tempo está acabando" busy={busy} onRequestClose={() => setExpiryPromptOpen(false)}><p>Seu tempo está acabando, deseja continuar respondendo?</p><Button type="button" loading={busy} onClick={() => { void refresh(); }}>Continuar respondendo</Button>{refreshesRemaining !== null && <p className="small text-secondary mt-3 mb-0">Renovações restantes: {refreshesRemaining}</p>}</BaseModal></main>;
}
