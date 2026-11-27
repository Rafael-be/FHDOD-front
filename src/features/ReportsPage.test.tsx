import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { ReportsPage } from "./ReportsPage";
import { reportsService, type ReportModel } from "./reports";
import { sectorsService } from "./sectors";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });
const options = [
  { type: "general" as const, description: "Experiência do paciente", formats: ["pdf" as const, "xlsx" as const], filters: { from: true, to: true, sectorId: "not_applicable" as const } },
  { type: "sector" as const, description: "Experiência por setor", formats: ["pdf" as const, "xlsx" as const], filters: { from: true, to: true, sectorId: "required" as const } },
  { type: "ombudsman" as const, description: "Ouvidoria gerencial", formats: ["pdf" as const, "xlsx" as const], filters: { from: true, to: true, sectorId: "optional" as const } },
];
it("restringe tipos, valida setor e renderiza indicadores recebidos", async () => {
  vi.spyOn(reportsService, "types").mockResolvedValue(options);
  vi.spyOn(sectorsService, "list").mockResolvedValue([{ id: 3, name: "Internação", code: "INT", deletedAt: null }]);
  const preview = vi.spyOn(reportsService, "preview").mockResolvedValue({ type: "sector", title: "Experiência por setor", filters: { from: "", to: "", sectorId: 3, sectorName: "Internação", timeZone: "America/Sao_Paulo" }, indicators: { started: 100, completed: 80, completionRate: 80 }, tables: { distribution: [{ score: 5, responses: 20 }] }, recordCount: 100, warnings: [], generatedAt: "", minimumResponses: 5 } satisfies ReportModel);
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  await act(async () => { root.render(<ReportsPage canManage={false} />); });
  expect(host.textContent).not.toContain("Ouvidoria gerencial");
  await act(async () => { host.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click(); });
  expect(host.textContent).toContain("Selecione um setor");
  const select = host.querySelector<HTMLSelectElement>("select")!;
  await act(async () => { select.value = "3"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  await act(async () => { [...host.querySelectorAll("button")].find(button => button.textContent === "Gerar prévia")!.click(); });
  expect(preview).toHaveBeenCalledWith(expect.objectContaining({ type: "sector", sectorId: 3 }));
  expect(host.textContent).toContain("Pesquisas iniciadas");
  expect(host.textContent).toContain("80%");
  const tableScroll = host.querySelector(".fhdod-report-tables .table-responsive");
  expect(tableScroll?.querySelector("table")).not.toBeNull();
  expect(tableScroll?.closest(".fhdod-profile-card")).not.toBeNull();
  await act(async () => { root.unmount(); });
});

it("descarta o job concluído quando os filtros mudam", async () => {
  vi.spyOn(reportsService, "types").mockResolvedValue(options);
  vi.spyOn(sectorsService, "list").mockResolvedValue([]);
  vi.spyOn(reportsService, "createJob").mockResolvedValue({ jobId: "job-1", status: "completed", attempts: 1, expiresAt: "2099-01-01T00:00:00Z" });
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  await act(async () => { root.render(<ReportsPage canManage={false} />); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  await act(async () => { [...host.querySelectorAll("button")].find(button => button.textContent === "Baixar PDF")!.click(); });
  expect(host.textContent).toContain("Relatório pronto para baixar.");
  const dates = host.querySelectorAll<HTMLInputElement>('input[type="date"]');
  await act(async () => { const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!; setValue.call(dates[0], "2026-01-01"); dates[0].dispatchEvent(new Event("change", { bubbles: true })); });
  expect(host.textContent).not.toContain("Baixar relatório pronto");
  await act(async () => { root.unmount(); });
});
