import { describe, expect, it } from "vitest";
import { formatPhone, MAX_PUBLIC_MESSAGE_LENGTH, phonePayload } from "./ombudsman";

describe("formatadores da Ouvidoria", () => {
  it("formata telefone para apresentação e mantém apenas dígitos no payload", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
    expect(phonePayload("(11) 98765-4321")).toBe("11987654321");
  });

  it("mantém o limite de mensagem definido pelo contrato atual", () => {
    expect(MAX_PUBLIC_MESSAGE_LENGTH).toBe(300);
  });
});
