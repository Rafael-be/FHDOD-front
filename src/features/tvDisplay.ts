import { api } from "../services/http";

export type Indicator = { id: "completionRate" | "nps"; value: number | null } |
  { id: "npsGroups"; value: { promoters: number; passives: number; detractors: number } | null };

interface Display { periodDays: number; refreshSeconds: number; indicators: Indicator[] }

const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";
const invalid = () => new Error("O servidor retornou um painel inválido.");

function publicIndicator(input: unknown): Indicator {
  if (!object(input)) throw invalid();
  const {id, value} = input;
  if (id === "nps" || id === "completionRate") {
    if (value === null || integer(value, id === "nps" ? -100 : 0, 100)) return {id, value};
  }
  if (id === "npsGroups") {
    if (value === null) return {id, value};
    if (object(value)) {
      const {promoters, passives, detractors} = value;
      if (integer(promoters, 0, 100) && integer(passives, 0, 100) && integer(detractors, 0, 100)) {
        return {id, value: {promoters, passives, detractors}};
      }
    }
  }
  throw invalid();
}

export async function loadPublicDisplay(signal: AbortSignal): Promise<Display> {
  const result = await api.request<unknown>("/api/public/tv-wall", {
    signal, credentials: "omit", refreshOnUnauthorized: false, cache: "no-store",
  });
  if (!object(result) || !integer(result.periodDays, 1, 90) || !integer(result.refreshSeconds, 30, 3600)
    || !Array.isArray(result.indicators) || result.indicators.length > 3) throw invalid();
  const indicators = result.indicators.map(publicIndicator);
  if (new Set(indicators.map(item => item.id)).size !== indicators.length) throw invalid();
  return {periodDays: result.periodDays, refreshSeconds: result.refreshSeconds, indicators};
}
