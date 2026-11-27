import {act} from "react";
import {createRoot} from "react-dom/client";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {afterEach, expect, it, vi} from "vitest";
import {AnalyticsPage} from "./AnalyticsPage";
import {analyticsService, type AnalyticsDashboard} from "./analytics";
import {sectorsService} from "./sectors";

Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
afterEach(() => vi.restoreAllMocks());
const report = (started=100, complete=70, shifts: AnalyticsDashboard["shifts"] = [
  {id:10,name:"Madrugada",sector_id:2,completed:20,percentage:0},
  {id:11,name:"Dia",sector_id:2,completed:30,percentage:0},
  {id:12,name:"Noite",sector_id:2,completed:20,percentage:0},
]): AnalyticsDashboard => ({
  sessions:{started,complete,incomplete:started-complete,inProgress:started-complete,endedOrExpired:0,closedIncomplete:0,unknownDeadline:0,completionRate:started ? 100*complete/started : null,nonCompletionRate:started ? 100*(started-complete)/started : null},
  nps:{responses:10,promoters:5,passives:3,detractors:2,value:30},shifts,unclassifiedCompleted:0,
  questions:[],sectors:[{sector_id:2,started,complete}],daily:[{day:"2026-11-01",started,complete}],dailyAnswers:[],distribution:[],ombudsman:[],teamAttributionAvailable:false,responseRate:null,privacyNotice:"",timeZone:"America/Sao_Paulo",
});
async function render() {
  if (!vi.isMockFunction(analyticsService.heatmap)) vi.spyOn(analyticsService,"heatmap").mockResolvedValue([]);
  if (!vi.isMockFunction(analyticsService.questionDistribution)) vi.spyOn(analyticsService,"questionDistribution").mockResolvedValue({sectorId:2,formVersionId:40,questions:[]});
  if (!vi.isMockFunction(analyticsService.criticalQuestions)) vi.spyOn(analyticsService,"criticalQuestions").mockResolvedValue({minimumResponses:5,items:[]});
  const container=document.createElement("div"),root=createRoot(container),client=new QueryClient();
  await act(async()=>root.render(<QueryClientProvider client={client}><AnalyticsPage canManage={false} userId={1}/></QueryClientProvider>));
  for (let attempt=0; attempt<30 && !container.textContent?.includes("Taxa de conclusão:"); attempt++) {
    await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10));});
  }
  return {container,root,client,cleanup:async()=>{await act(async()=>root.unmount());client.clear();}};
}
const apply=async(container:HTMLElement)=>{await act(async()=>container.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10));});};
const change=async(select:HTMLSelectElement,value:string)=>{await act(async()=>{select.value=value;select.dispatchEvent(new Event("change",{bubbles:true}));});};

it("restaura select nativo de setor, gráfico de um dia e séries 100/70", async()=>{
  vi.spyOn(sectorsService,"list").mockResolvedValue([{id:2,name:"Internação",code:"INT",deletedAt:null},{id:4,name:"Pronto Atendimento",code:"PA",deletedAt:null}]);
  const dashboard=vi.spyOn(analyticsService,"dashboard").mockResolvedValue(report());
  const questions=vi.spyOn(analyticsService,"questions").mockResolvedValue([]);
  const {container,cleanup}=await render();
  try {
    const sector=container.querySelector("#analytics-sector") as HTMLSelectElement;
    const shift=container.querySelector("#analytics-shift") as HTMLSelectElement;
    expect(sector.multiple).toBe(false);
    expect([...sector.options].map(option=>option.text)).toEqual(["Todos os autorizados","Internação","Pronto Atendimento"]);
    expect([...shift.options].map(option=>option.text)).toEqual(["Todos os turnos","Madrugada","Dia","Noite"]);
    expect(container.textContent).toContain("Taxa de conclusão: 70%");
    expect(container.textContent).toContain("Nota média NPSIndisponível");
    expect(container.textContent).not.toContain("Distribuição por pergunta do formulário vigente");
    const lines=container.querySelectorAll("polyline");
    expect(lines).toHaveLength(2);
    expect(lines[0].getAttribute("points")).not.toBe(lines[1].getAttribute("points"));
    expect(container.querySelector(".fhdod-chart-value-started")?.textContent).toBe("Iniciadas: 100");
    expect(container.querySelector(".fhdod-chart-value-complete")?.textContent).toBe("Concluídas: 70");
    expect(container.querySelector("table tbody")?.textContent).toContain("10070");
    expect(container.textContent).toContain("Madrugada20");
    expect(container.textContent).toContain("Dia30");
    expect(container.textContent).toContain("Noite20");
    await change(sector,"2"); await apply(container);
    expect(dashboard.mock.lastCall?.[0]).toMatchObject({sectorId:2});
    expect(questions.mock.lastCall?.[0]).toMatchObject({sectorId:2});
    expect(container.textContent).toContain("Distribuição por pergunta do formulário vigente");
    await change(sector,""); await apply(container);
    expect(sector.value).toBe("");
    expect(container.textContent).not.toContain("Distribuição por pergunta do formulário vigente");
    expect(container.textContent).toContain("Pesquisas completas por setor");
  } finally {await cleanup();}
});

it("envia shiftName em uma única consulta e combina filtro de setor", async()=>{
  vi.spyOn(sectorsService,"list").mockResolvedValue([{id:2,name:"Internação",code:"INT",deletedAt:null},{id:4,name:"Pronto Atendimento",code:"PA",deletedAt:null}]);
  const dashboard=vi.spyOn(analyticsService,"dashboard").mockImplementation(async filter=>{
    if (filter.shiftName==="Madrugada" && filter.sectorId===2) {
      return report(30,20,[{id:10,name:"Madrugada",sector_id:2,completed:20,percentage:100}]);
    }
    if (filter.shiftName==="Madrugada") {
      return report(50,30,[
        {id:10,name:"Madrugada",sector_id:2,completed:20,percentage:67},
        {id:13,name:"Madrugada",sector_id:4,completed:10,percentage:33},
      ]);
    }
    return report();
  });
  const questions=vi.spyOn(analyticsService,"questions").mockResolvedValue([]);
  const {container,cleanup}=await render();
  try {
    const shift=container.querySelector("#analytics-shift") as HTMLSelectElement;
    const sector=container.querySelector("#analytics-sector") as HTMLSelectElement;
    await change(shift,"Madrugada"); await apply(container);
    expect(dashboard.mock.lastCall?.[0]).toMatchObject({shiftName:"Madrugada"});
    expect(dashboard.mock.calls.filter(call=>call[0].shiftName==="Madrugada")).toHaveLength(1);
    expect(container.textContent).toContain("Taxa de conclusão: 60%");
    expect(container.textContent).toContain("Madrugada30");
    expect(questions.mock.lastCall?.[0]).toMatchObject({shiftName:"Madrugada"});
    await change(sector,"2"); await apply(container);
    expect(dashboard.mock.lastCall?.[0]).toMatchObject({sectorId:2,shiftName:"Madrugada"});
    expect(questions.mock.lastCall?.[0]).toMatchObject({sectorId:2,shiftName:"Madrugada"});
    await vi.waitFor(() => expect(container.textContent).toContain("Madrugada20"));
  } finally {await cleanup();}
});

it("mostra falha da API sem indicadores antigos", async()=>{
  vi.spyOn(sectorsService,"list").mockResolvedValue([{id:2,name:"Internação",code:"INT",deletedAt:null}]);
  vi.spyOn(analyticsService,"dashboard").mockRejectedValue(new Error("Falha da API de indicadores"));
  const {container,cleanup}=await render();
  try {
    expect(container.textContent).toContain("Falha da API de indicadores");
    expect(container.textContent).not.toContain("Visão geral");
  } finally {await cleanup();}
});