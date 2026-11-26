import { afterEach, describe, expect, it, vi } from "vitest";
import { publicSurveyUrl } from "./sectorQr";

afterEach(() => vi.unstubAllEnvs());
describe("URL permanente do QR Code", () => {
  it("usa somente o ID do setor e a rota pública de avaliação", () => {
    const base = "https://avaliacoes.hospital.org.br/";
    expect(publicSurveyUrl(3, base)).toBe("https://avaliacoes.hospital.org.br/avaliacao/3");
    expect(publicSurveyUrl(5, base)).toBe("https://avaliacoes.hospital.org.br/avaliacao/5");
    expect(publicSurveyUrl(5, base)).toBe(publicSurveyUrl(5, base));
    expect(publicSurveyUrl(3, "https://avaliacoes.hospital.org.br///")).toBe("https://avaliacoes.hospital.org.br/avaliacao/3");
  });
  it("aceita HTTP apenas para localhost e 127.0.0.1 em desenvolvimento", () => {
    expect(publicSurveyUrl(3, "http://localhost:5173")).toBe("http://localhost:5173/avaliacao/3");
    expect(publicSurveyUrl(5, "http://127.0.0.1:4173/")).toBe("http://127.0.0.1:4173/avaliacao/5");
  });
  it("exige HTTPS em produção", () => {
    vi.stubEnv("DEV", false);
    expect(() => publicSurveyUrl(3, "http://localhost:5173")).toThrow();
    expect(publicSurveyUrl(3, "https://hospital.org.br")).toBe("https://hospital.org.br/avaliacao/3");
  });
  it.each(["", "http://hospital.org.br", "http://192.168.1.2:5173", "http://localhost:99999", "http://localhost:5173/?token=x", "http://user:pass@localhost:5173", "http://localhost:5173/#hash", "https://localhost:5173", "https://127.0.0.1", "https://hospital.org.br/?token=x", "https://user:pass@hospital.org.br", "https://hospital.org.br/#hash", "https://hospital.org.br/api", "not a url"])("rejeita configuração insegura ou inválida: %s", value => {
    expect(() => publicSurveyUrl(3,value)).toThrow();
  });
  it("rejeita IDs inexistentes", () => {
    expect(() => publicSurveyUrl(0,"https://hospital.org.br")).toThrow("ID de setor inválido");
    expect(() => publicSurveyUrl(1.2,"https://hospital.org.br")).toThrow("ID de setor inválido");
  });
});
