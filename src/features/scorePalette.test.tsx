import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { Donut } from "./AnalyticsPage";
import { scoreColor } from "./scorePalette";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("mantém a paleta semântica independente da ordem e de notas ausentes", async () => {
  expect(scoreColor(1)).toBe("#DC2626");
  expect(scoreColor(5)).toBe("#16A34A");
  const node = document.createElement("div");
  const root = createRoot(node);
  await act(async () => root.render(<Donut rows={[{score:5,label:"Nota 5",value:3},{score:1,label:"Nota 1",value:1},{score:3,label:"Nota 3",value:0}]} />));
  const donut = node.querySelector<HTMLElement>(".fhdod-donut");
  expect(donut?.style.background).toContain("#16A34A");
  expect(donut?.style.background).toContain("#DC2626");
  expect(donut?.style.background).not.toContain("#EAB308");
  const legend = [...node.querySelectorAll<HTMLElement>(".fhdod-donut-legend li")];
  expect(legend.map(item => [item.getAttribute("aria-label"), item.style.getPropertyValue("--legend-color")])).toEqual([
    ["Nota 5: 3 respostas, 75%", "#16A34A"],
    ["Nota 1: 1 respostas, 25%", "#DC2626"],
    ["Nota 3: 0 respostas, 0%", "#EAB308"],
  ]);
  await act(async () => root.unmount());
});
