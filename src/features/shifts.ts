import { api } from "../services/http";

export interface ShiftSheetIssue {
  line?: number;
  field?: string;
  sectorCode?: string;
  reason: string;
  message?: string;
}

export interface ShiftSheetImportResult {
  versionId: number;
  warnings: ShiftSheetIssue[];
}

export const shiftsService = {
  template() {
    return api.request<string>("/api/shift-sheets/template");
  },
  download() {
    return api.request<string>("/api/shift-sheets/current/export");
  },
  importFile(file: Uint8Array) {
    return api.request<ShiftSheetImportResult>("/api/shift-sheets", {
      method: "POST",
      body: file,
      headers: { "Content-Type": "application/octet-stream" },
    });
  },
};
