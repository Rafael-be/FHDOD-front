import { afterEach, expect, it, vi } from "vitest";
import { api } from "../services/http";
import { defaultReportPeriod, reportFilename, reportsService, validateReportFilters } from "./reports";

afterEach(() => vi.restoreAllMocks());
it("calcula os 30 dias de calendário em São Paulo e preserva datas simples", () => {
  expect(defaultReportPeriod(new Date("2026-11-26T03:00:00Z"))).toEqual({ from: "2026-10-28", to: "2026-11-26" });
  expect(validateReportFilters({ type: "sector", sectorId: 3, from: "2026-11-01", to: "2026-11-15" }, [3])).toBeNull();
  expect(validateReportFilters({ type: "sector", sectorId: 3, from: "2026-11-16", to: "2026-11-15" }, [3])).toContain("posterior");
  expect(validateReportFilters({ type: "sector", sectorId: 4, from: "2026-11-01", to: "2026-11-15" }, [3])).toContain("autorizado");
  expect(validateReportFilters({ type: "general", from: "2026-02-30", to: "2026-03-01" }, [])).toContain("válidas");
});
it("usa os mesmos filtros na prévia e no download", async () => {
  const request = vi.spyOn(api, "request").mockResolvedValue([]);
  const download = vi.spyOn(api, "download").mockResolvedValue({ blob: new Blob(), disposition: null });
  const filters = { type: "sector" as const, sectorId: 3, from: "2026-11-01", to: "2026-11-15" };
  await reportsService.types();
  await reportsService.preview(filters);
  await reportsService.download(filters, "pdf");
  await reportsService.download(filters, "xlsx");
  expect(request).toHaveBeenCalledWith("/api/reports/types");
  expect(request).toHaveBeenCalledWith("/api/reports/preview", { method: "POST", body: filters });
  expect(download).toHaveBeenNthCalledWith(1, "/api/reports/download", { ...filters, format: "pdf" });
  expect(download).toHaveBeenNthCalledWith(2, "/api/reports/download", { ...filters, format: "xlsx" });
  expect(reportFilename('attachment; filename="fhdod-relatorio-setor-3-2026-11.pdf"', filters, "pdf")).toBe("fhdod-relatorio-setor-3-2026-11.pdf");
});
