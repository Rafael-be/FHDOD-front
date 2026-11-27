export function publicSurveyUrl(sectorId: number, configuredUrl: string | undefined = import.meta.env.VITE_PUBLIC_APP_URL): string {
  if (!Number.isSafeInteger(sectorId) || sectorId <= 0) throw new Error("ID de setor inválido.");
  if (!configuredUrl?.trim()) throw new Error("Configure VITE_PUBLIC_APP_URL com a URL do frontend para gerar o QR Code.");
  let base: URL;
  try { base = new URL(configuredUrl.trim()); }
  catch { throw new Error("VITE_PUBLIC_APP_URL não é uma URL válida."); }
  const host = base.hostname.toLowerCase();
  const localDevelopment = import.meta.env.DEV && base.protocol === "http:" && (host === "localhost" || host === "127.0.0.1") && (!base.port || (Number(base.port) >= 1 && Number(base.port) <= 65535));
  if ((!localDevelopment && base.protocol !== "https:") || base.username || base.password || base.search || base.hash || base.pathname.replace(/\/+$/, "") !== "" ||
      !host || (!localDevelopment && (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
      host === "::1" || host === "[::1]" || host === "0.0.0.0" || /^127\./.test(host) ||
      /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)))) {
    throw new Error("VITE_PUBLIC_APP_URL deve ser um endereço público HTTPS do frontend, sem credenciais, parâmetros ou fragmento.");
  }
  return `${base.origin}/avaliacao/${encodeURIComponent(String(sectorId))}`;
}
