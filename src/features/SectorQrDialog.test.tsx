import { act } from "react";
import { createRoot } from "react-dom/client";
import QRCode from "qrcode";
import { afterEach, expect, it, vi } from "vitest";
import { SectorQrDialog } from "./SectorQrDialog";
import { SectorsPage } from "./SectorsPage";
import { sectorsService } from "./sectors";
import { submissionsService } from "./submissions";
import { ApiError } from "../services/http";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const sector = {id:5,name:"Internação",code:"INT",deletedAt:null};
const form = {form:{sectorId:5,formVersionId:9,questions:[]},etag:undefined};
const png = `data:image/png;base64,${btoa("\x89PNG\r\n\x1a\n")}`;
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); document.body.innerHTML=""; });
async function mount() {
  const host=document.createElement("div"); document.body.append(host);
  const root=createRoot(host);
  await act(async()=>root.render(<SectorQrDialog sector={sector} onClose={vi.fn()} />));
  await act(async()=>{await Promise.resolve();});
  return {host,cleanup:async()=>{await act(async()=>root.unmount());host.remove();}};
}

it("gera o QR permanente, copia a URL, baixa PNG e imprime somente a folha do paciente", async()=>{
  vi.stubEnv("VITE_PUBLIC_APP_URL","https://hospital.org.br/");
  vi.spyOn(submissionsService,"currentForm").mockResolvedValue(form);
  const generate=vi.spyOn(QRCode,"toDataURL").mockResolvedValue(png as never);
  const writeText=vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText}});
  const click=vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(()=>undefined);
  const print=vi.spyOn(window,"print").mockImplementation(()=>undefined);
  const {host,cleanup}=await mount();
  try {
    expect(generate).toHaveBeenCalledWith("https://hospital.org.br/avaliacao/5",expect.objectContaining({width:1024,margin:4,type:"image/png"}));
    expect(host.querySelector<HTMLImageElement>(".fhdod-qr-preview")?.src).toBe(png);
    expect(host.querySelector(".fhdod-qr-print-sheet")?.textContent).toContain("Avalie nosso atendimento");
    expect(host.querySelector(".fhdod-qr-print-sheet")?.textContent).toContain("Aponte a câmera do seu celular");
    expect(host.querySelector(".fhdod-qr-print-sheet")?.textContent).toContain("https://hospital.org.br/avaliacao/5");
    expect(host.querySelector(".fhdod-qr-print-sheet")?.textContent).not.toContain("Editar");
    const button=(text:string)=>[...host.querySelectorAll("button")].find(item=>item.textContent===text)!;
    await act(async()=>button("Copiar link").click());
    expect(writeText).toHaveBeenCalledWith("https://hospital.org.br/avaliacao/5");
    await act(async()=>button("Baixar QR Code").click());
    expect(click).toHaveBeenCalledOnce();
    expect(host.textContent).toContain("Download do QR Code iniciado");
    await act(async()=>button("Imprimir QR Code").click());
    expect(print).toHaveBeenCalledOnce();
  } finally {await cleanup();}
});

it("não gera QR sem URL HTTPS configurada nem formulário publicado", async()=>{
  vi.stubEnv("VITE_PUBLIC_APP_URL","");
  const current=vi.spyOn(submissionsService,"currentForm").mockResolvedValue(form);
  const generate=vi.spyOn(QRCode,"toDataURL").mockResolvedValue(png as never);
  let mounted=await mount();
  expect(mounted.host.textContent).toContain("Configure VITE_PUBLIC_APP_URL");
  expect(mounted.host.querySelector(".fhdod-qr-preview")).toBeNull();
  expect(current).not.toHaveBeenCalled();
  await mounted.cleanup();
  vi.stubEnv("VITE_PUBLIC_APP_URL","https://hospital.org.br");
  current.mockRejectedValue(new ApiError("Sem formulário",409,"FORM_NOT_PUBLISHED"));
  mounted=await mount();
  expect(mounted.host.textContent).toContain("ainda não possui formulário publicado");
  expect(generate).not.toHaveBeenCalled();
  await mounted.cleanup();
});

it("desabilita a ação para setor inativo ou pendente", async()=>{
  vi.spyOn(sectorsService,"list").mockResolvedValue([{...sector,deletedAt:"2026-11-01"},{...sector,id:6,name:"Triagem",deletedAt:null}]);
  vi.spyOn(sectorsService,"status").mockResolvedValue({sectorId:6,status:"preparing",missingRequirements:["nps"]});
  const host=document.createElement("div");document.body.append(host);const root=createRoot(host);
  await act(async()=>root.render(<SectorsPage canManage onQuestions={()=>undefined}/>));
  await act(async()=>{await Promise.resolve();});
  expect([...host.querySelectorAll("button")].filter(button=>button.textContent==="QR Code")).toHaveLength(2);
  expect([...host.querySelectorAll("button")].filter(button=>button.textContent==="QR Code").every(button=>button.disabled)).toBe(true);
  await act(async()=>root.unmount());
});
