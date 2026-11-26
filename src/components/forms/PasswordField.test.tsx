import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { PasswordField } from "./PasswordField";

it("mantém o botão no contêiner do input e alterna mostrar/ocultar senha", async () => {
  const host=document.createElement("div"), root=createRoot(host);
  await act(async()=>root.render(<PasswordField label="Senha" defaultValue="segredo" />));
  try {
    const input=host.querySelector("input")!;
    const toggle=host.querySelector<HTMLButtonElement>(".fhdod-password-toggle")!;
    expect(toggle.parentElement?.className).toBe("fhdod-field-input-wrap");
    expect(input.type).toBe("password");
    expect(toggle.getAttribute("aria-label")).toBe("Mostrar senha");
    await act(async()=>toggle.click());
    expect(input.type).toBe("text");
    expect(toggle.getAttribute("aria-label")).toBe("Ocultar senha");
    await act(async()=>toggle.click());
    expect(input.type).toBe("password");
  } finally {await act(async()=>root.unmount());}
});
