import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Feedback";
import { ApiError } from "../services/http";
import { shiftsService, type ShiftSheetIssue } from "./shifts";

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ShiftSheetsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [issues, setIssues] = useState<ShiftSheetIssue[]>([]);
  const [message, setMessage] = useState<string>();

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
    setError(undefined);
    setIssues([]);
    setMessage(undefined);
  };

  const download = async (template: boolean) => {
    setBusy(true);
    setError(undefined);
    setIssues([]);
    try {
      const content = template ? await shiftsService.template() : await shiftsService.download();
      downloadText(template ? "modelo-horarios.csv" : "planilha-horarios.csv", content);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Não foi possível baixar a planilha.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("Selecione uma planilha CSV.");
      return;
    }
    if (!window.confirm("Substituir a planilha de turnos vigente após validação?")) return;
    setBusy(true);
    setError(undefined);
    setIssues([]);
    setMessage(undefined);
    try {
      const result = await shiftsService.importFile(new Uint8Array(await file.arrayBuffer()));
      setMessage(`Planilha publicada como versão ${result.versionId}.`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      setIssues(result.warnings);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        if (cause.code === "INVALID_SHIFT_SHEET") {
          const details = cause.details as ShiftSheetIssue[] | undefined;
          if (details) setIssues(details);
        }
      } else {
        setError("Não foi possível importar a planilha.");
      }
    } finally {
      setBusy(false);
    }
  };

  return <section><div className="fhdod-page-heading"><div><p className="eyebrow">Administração</p><h1>Planilhas de turnos</h1><p>Baixe o modelo ou substitua a versão vigente da planilha.</p></div></div>{message && <Alert tone="success">{message}</Alert>}{error && <Alert tone="danger">{error}</Alert>}<div className="d-flex flex-wrap gap-2 mb-3"><Button type="button" variant="secondary" loading={busy} onClick={() => { void download(true); }}>Baixar modelo</Button><Button type="button" variant="secondary" loading={busy} onClick={() => { void download(false); }}>Baixar vigente</Button></div>{issues.length > 0 && <Alert tone="warning"><strong>Validações:</strong><ul className="mb-0">{issues.map((issue, index) => <li key={`${issue.line ?? ""}-${issue.sectorCode ?? ""}-${index}`}>{issue.line ? `Linha ${issue.line}: ` : ""}{issue.message ?? issue.reason}</li>)}</ul></Alert>}<form className="fhdod-profile-card" onSubmit={submit}><label className="form-label" htmlFor="shift-sheet-file">Arquivo CSV</label><input ref={inputRef} id="shift-sheet-file" className="form-control mb-3" type="file" accept=".csv,text/csv" onChange={choose} required />{file && <p className="small text-secondary">Selecionado: {file.name} · {(file.size / 1024).toFixed(1)} KB. Formato esperado: UTF-8, separador ; e sete dias por setor.</p>}<Alert tone="warning">O envio substitui imediatamente a planilha vigente após a validação do backend.</Alert><Button type="submit" loading={busy} disabled={!file}>Enviar planilha</Button></form></section>;
}
