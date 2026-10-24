import { useState, type FormEvent } from "react";
import { Button } from "../../components/ui/Button";
import { FormField } from "../../components/forms/FormField";
import { Alert } from "../../components/ui/Feedback";
import { ApiError } from "../../services/http";
import { useAuth } from "./AuthContext";
import { authService } from "./auth.service";

const messageFor = (error: unknown, fallback: string) => {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 401) return "E-mail ou senha inválidos.";
  if (error.status === 429) return "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
  return error.message || fallback;
};

const passwordError = (password: string, confirmation: string) => password.length < 12 ? "A nova senha deve ter pelo menos 12 caracteres." : password !== confirmation ? "As senhas não coincidem." : undefined;

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useAuth(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState<string>(); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(undefined); if (!email || !password) { setError("Informe seu e-mail e sua senha."); return; } setBusy(true); try { await login(email, password); onSuccess(); } catch (cause) { setError(messageFor(cause, "Não foi possível entrar agora.")); } finally { setBusy(false); } };
  return <form className="fhdod-auth-card" onSubmit={submit} noValidate><p className="eyebrow">Acesso restrito</p><h1>Entre na sua conta</h1><p>Use suas credenciais institucionais para continuar.</p>{error && <Alert tone="danger">{error}</Alert>}<FormField label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /><FormField label="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /><Button className="w-100" type="submit" loading={busy}>Entrar</Button></form>;
}

export function PasswordForm({ temporary = false, onSuccess }: { temporary?: boolean; onSuccess: () => void }) {
  const { clearSession } = useAuth(); const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [error, setError] = useState<string>(); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); const validation = passwordError(newPassword, confirmation); setError(validation); if (validation) return; setBusy(true); try { if (temporary) await authService.changeTemporaryPassword({ currentPassword, newPassword }); else await authService.changePassword({ currentPassword, newPassword }); clearSession(); onSuccess(); } catch (cause) { setError(messageFor(cause, "Não foi possível alterar a senha.")); } finally { setBusy(false); } };
  return <form className="fhdod-auth-card" onSubmit={submit} noValidate><p className="eyebrow">Segurança</p><h1>{temporary ? "Troque sua senha temporária" : "Alterar senha"}</h1><p>Após concluir, entre novamente com a nova senha.</p>{error && <Alert tone="danger">{error}</Alert>}<FormField label={temporary ? "Senha temporária atual" : "Senha atual"} type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /><FormField label="Nova senha" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required /><FormField label="Confirmar nova senha" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" error={confirmation && confirmation !== newPassword ? "As senhas não coincidem." : undefined} required /><Button className="w-100" type="submit" loading={busy}>Salvar nova senha</Button></form>;
}

export function ChangeEmailForm({ onSuccess }: { onSuccess: () => void }) {
  const { clearSession } = useAuth(); const [email, setEmail] = useState(""); const [currentPassword, setCurrentPassword] = useState(""); const [error, setError] = useState<string>(); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(undefined); if (!email || !currentPassword) { setError("Informe o novo e-mail e sua senha atual."); return; } setBusy(true); try { await authService.changeEmail(currentPassword, email); clearSession(); onSuccess(); } catch (cause) { setError(messageFor(cause, "Não foi possível alterar o e-mail.")); } finally { setBusy(false); } };
  return <form className="fhdod-profile-card" onSubmit={submit} noValidate><h2>Alterar e-mail</h2><p>A sessão será encerrada por segurança após a alteração.</p>{error && <Alert tone="danger">{error}</Alert>}<FormField label="Novo e-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /><FormField label="Senha atual" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /><Button type="submit" loading={busy}>Alterar e-mail</Button></form>;
}
