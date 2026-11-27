import {act} from "react";
import {createRoot} from "react-dom/client";
import {expect,it} from "vitest";
import {CriticalRanking,QuestionDistribution,SatisfactionHeatmap} from "./AnalyticsInsights";

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
async function render(content:React.ReactNode){const node=document.createElement("div"),root=createRoot(node);await act(async()=>root.render(content));return {node,close:async()=>{await act(async()=>root.unmount());}};}

it("mostra todas as métricas reais do heatmap e preserva null",async()=>{
  const view=await render(<SatisfactionHeatmap names={new Map([[2,"Internação"],[4,"Emergência"]])} rows={[
    {sectorId:2,satisfactionMean:4.2,npsMean:8.5,positivePercentage:85,completionRate:80,responses:10,npsResponses:5,started:5,completed:4},
    {sectorId:4,satisfactionMean:null,npsMean:null,positivePercentage:null,completionRate:null,responses:0,npsResponses:0,started:0,completed:0},
  ]}/>);
  expect(view.node.querySelectorAll(".fhdod-heat-cell")).toHaveLength(8);
  expect(view.node.querySelectorAll('.fhdod-heat-cell[data-grade="none"]')).toHaveLength(4);
  expect(view.node.textContent).toContain("4,2 / 5");
  expect(view.node.textContent).toContain("Indisponível");
  expect(view.node.querySelector('[aria-label*="10 respostas"]')).not.toBeNull();
  await view.close();
});

it("usa todas as notas da API e a ordem do formulário vigente sem incluir NPS",async()=>{
  const view=await render(<QuestionDistribution report={{sectorId:2,formVersionId:40,questions:[
    {questionId:9,questionVersionId:10,text:"Acolhimento",position:2,mean:2,responses:2,skipped:0,distribution:[1,2,3,4,5].map(score=>({score,responses:score===2?2:0}))},
    {questionId:7,questionVersionId:8,text:"Atendimento",position:1,mean:4,responses:3,skipped:0,distribution:[1,2,3,4,5].map(score=>({score,responses:score===4?3:0}))},
  ]}}/>);
  expect(view.node.querySelectorAll(".fhdod-question-distribution")).toHaveLength(2);
  expect(view.node.querySelector(".fhdod-question-distribution")?.textContent).toContain("Atendimento");
  expect(view.node.textContent).not.toContain("Distribuição indisponível na API");
  expect(view.node.querySelectorAll(".fhdod-stacked-bar")).toHaveLength(2);
  await view.close();
});

it("associa cores, rótulos e quantidades às notas reais mesmo fora de ordem",async()=>{
  const view=await render(<QuestionDistribution report={{sectorId:2,formVersionId:40,questions:[
    {questionId:9,questionVersionId:10,text:"Acolhimento",position:1,mean:3,responses:4,skipped:0,distribution:[{score:5,responses:2},{score:1,responses:2}]},
  ]}}/>);
  const segments=[...view.node.querySelectorAll<HTMLElement>(".fhdod-stacked-bar span")];
  expect(segments.map(segment=>[segment.getAttribute("title"),segment.style.background])).toEqual([
    ["Nota 5: 2 respostas","rgb(22, 163, 74)"],
    ["Nota 1: 2 respostas","rgb(220, 38, 38)"],
  ]);
  expect(view.node.querySelector(".fhdod-distribution-counts")?.textContent).toBe("Nota 5: 2Nota 1: 2");
  expect(view.node.querySelector<HTMLElement>(".fhdod-score-legend span:first-child")?.style.getPropertyValue("--legend-color")).toBe("#DC2626");
  expect(view.node.querySelector<HTMLElement>(".fhdod-score-legend span:last-child")?.style.getPropertyValue("--legend-color")).toBe("#16A34A");
  await view.close();
});

it("respeita o ranking e a amostra mínima informados pelo backend",async()=>{
  const view=await render(<CriticalRanking report={{minimumResponses:7,items:[{sectorId:2,questionId:9,questionVersionId:10,text:"Acolhimento",mean:2,responses:8}]}} names={new Map([[2,"Internação"]])} limit={5} onLimit={()=>undefined}/>);
  expect(view.node.textContent).toContain("Acolhimento · Internação");
  expect(view.node.textContent).toContain("7 respostas");
  await view.close();
});
