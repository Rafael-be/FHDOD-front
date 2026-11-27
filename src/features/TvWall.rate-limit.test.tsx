import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "../app/App";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;

afterEach(async () => { if (root) await act(async () => root.unmount()); vi.restoreAllMocks(); window.history.replaceState({}, "", "/"); });

it("informa limitação temporária do endpoint público do TV-Wall", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: { code: "TV_WALL_RATE_LIMITED", message: "limited" } }), { status: 429, headers: { "Content-Type": "application/json" } }));
  window.history.replaceState({}, "", "/tv-wall");
  const host = document.createElement("div"); root = createRoot(host);
  await act(async () => root.render(<App />));
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  expect(host.textContent).toContain("Atualização temporariamente limitada");
});
