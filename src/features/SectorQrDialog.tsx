import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { FhdodLogo } from "../components/branding/FhdodLogo";
import { BaseModal } from "../components/ui/BaseModal";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Feedback";
import { ApiError } from "../services/http";
import { submissionsService } from "./submissions";
import type { Sector } from "./sectors";
import { publicSurveyUrl } from "./sectorQr";

export function SectorQrDialog({ sector, onClose }: { sector: Sector | null; onClose: () => void }) {
  const lastSector = useRef<Sector | null>(sector);
  if (sector) lastSector.current = sector;
  const shown = sector ?? lastSector.current;
  return <BaseModal open={sector !== null} title="QR Code do setor" onRequestClose={onClose}>{shown && <SectorQrContent sector={shown} />}</BaseModal>;
}

export function SectorQrContent({ sector }: { sector: Sector }) {
  const shown = sector;
  const [image, setImage] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setImage(""); setUrl(""); setError(""); setFeedback(""); setLoading(true);
    async function prepare() {
      try {
        const target = publicSurveyUrl(sector.id);
        await submissionsService.currentForm(sector.id);
        const png = await QRCode.toDataURL(target, { type: "image/png", width: 1024, margin: 4, errorCorrectionLevel: "M", color: { dark: "#171717", light: "#FFFFFF" } });
        if (!cancelled) { setUrl(target); setImage(png); }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof ApiError && cause.code === "FORM_NOT_PUBLISHED" ? "Este setor ainda não possui formulário publicado." : cause instanceof Error ? cause.message : "Não foi possível preparar o QR Code.");
      } finally { if (!cancelled) setLoading(false); }
    }
    void prepare();
    return () => { cancelled = true; };
  }, [sector.id]);
  async function copy() {
    try { await navigator.clipboard.writeText(url); setFeedback("Link copiado."); }
    catch { setFeedback("Não foi possível copiar o link."); }
  }
  function download() {
    const link = document.createElement("a");
    link.href = image;
    link.download = `fhdod-qrcode-setor-${shown!.id}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    setFeedback("Download do QR Code iniciado.");
  }
  return <div className="fhdod-qr-modal">
      <h3>{shown.name}</h3>
      {loading && <p role="status">Preparando QR Code…</p>}
      {error && <Alert tone="warning">{error}</Alert>}
      {image && <><img className="fhdod-qr-preview" src={image} alt={`QR Code para avaliar o setor ${shown.name}`} width="280" height="280" />
        <p className="fhdod-qr-url"><a href={url} target="_blank" rel="noreferrer">{url}</a></p>
        <div className="fhdod-qr-actions"><Button type="button" variant="secondary" onClick={() => { void copy(); }}>Copiar link</Button><Button type="button" variant="secondary" onClick={download}>Baixar QR Code</Button><Button type="button" onClick={() => window.print()}>Imprimir QR Code</Button></div>
        {feedback && <p className="small mt-3 mb-0" role="status">{feedback}</p>}
        <div className="fhdod-qr-print-sheet" aria-hidden="true"><FhdodLogo className="fhdod-qr-print-logo" /><h1>Avalie nosso atendimento</h1><h2>{shown.name}</h2><img src={image} alt="" width="1024" height="1024" /><p>Aponte a câmera do seu celular para responder à pesquisa</p><p className="fhdod-qr-print-url">{url}</p></div>
      </>}
    </div>;
}
