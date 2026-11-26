import { useEffect, useState } from "react";
import type { AuthenticatedUser } from "./auth/auth.types";
import { ChangeEmailForm, PasswordForm } from "./auth/AuthForms";
import { sectorsService, type Sector } from "./sectors";

export function AccountPage({ user, onCredentialChange }: { user: AuthenticatedUser; onCredentialChange: () => void }) {
  const [sectors, setSectors] = useState<Sector[] | null>(null);
  const [sectorError, setSectorError] = useState(false);
  useEffect(() => {
    if (user.role !== "sector_manager") return;
    let active = true;
    sectorsService.list().then((result) => { if (active) setSectors(result.filter((sector) => !sector.deletedAt)); }).catch(() => { if (active) setSectorError(true); });
    return () => { active = false; };
  }, [user.role]);
  return <section>
    <div className="fhdod-page-heading"><div><p className="eyebrow">Minha conta</p><h1>Dados de acesso</h1><p>Confira seu perfil e atualize suas credenciais institucionais.</p></div></div>
    <div className="fhdod-account-layout">
      <section className="fhdod-profile-card fhdod-account-summary" aria-label="Perfil"><h2>Perfil</h2><dl><div><dt>Nome completo</dt><dd>{user.name}</dd></div><div><dt>E-mail</dt><dd>{user.email}</dd></div><div><dt>Perfil</dt><dd>{user.role === "superuser" ? "Administrador" : "Gestor de setor"}</dd></div></dl></section>
      {user.role === "sector_manager" && <section className="fhdod-profile-card fhdod-account-summary" aria-label="Setores vinculados"><h2>Setores vinculados</h2>{sectorError ? <p>Não foi possível carregar os setores.</p> : sectors === null ? <p>Carregando setores…</p> : sectors.length ? <ul>{sectors.map((sector) => <li key={sector.id}>{sector.name}</li>)}</ul> : <p>Nenhum setor vinculado.</p>}</section>}
      <ChangeEmailForm onSuccess={onCredentialChange} />
      <PasswordForm embedded onSuccess={onCredentialChange} />
    </div>
  </section>;
}
