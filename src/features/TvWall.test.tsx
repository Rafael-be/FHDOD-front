import {act} from "react";
import {createRoot} from "react-dom/client";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {afterEach, expect, it, vi} from "vitest";
import {TvWallConfig} from "./TvWall";
import {AnalyticsPage} from "./AnalyticsPage";
import {analyticsService, type AnalyticsDashboard} from "./analytics";
import {loadPublicDisplay} from "./tvDisplay";
import {App} from "../app/App";
import {api} from "../services/http";
import {sectorsService} from "./sectors";
import {authService} from "./auth/auth.service";

Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
afterEach(() => {vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); window.history.replaceState({}, "", "/");});
it("consulta apenas a rota pública sem cookies e recupera após falha no intervalo configurado", async () => {
  vi.useFakeTimers();
  vi.spyOn(authService, "resume").mockRejectedValue(new Error("anonymous"));
  const response = () => Response.json({data: {periodDays: 7, refreshSeconds: 30, indicators: [{id:"nps",value:-12}, {id:"npsGroups",value:{promoters:4,passives:3,detractors:3}}, {id:"completionRate",value:null}], body:"texto privado"}});
  const fetch = vi.fn().mockResolvedValueOnce(response()).mockRejectedValueOnce(new TypeError("offline")).mockResolvedValueOnce(response());
  vi.stubGlobal("fetch", fetch);
  window.history.replaceState({}, "", "/tv-wall");
  const host = document.createElement("div"), root = createRoot(host);
  await act(async () => root.render(<App/>));
  await act(async () => vi.advanceTimersByTimeAsync(5));
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith("/api/public/tv-wall", expect.objectContaining({credentials:"omit"}));
  expect(host.textContent).toContain("-12");
  expect(host.textContent).toContain("Indisponível");
  expect(host.querySelector(".tv-wall-charts")).toBeNull();
  expect(host.querySelector(".fhdod-analytics")).toBeNull();
  expect(host.textContent).not.toContain("texto privado");
  await act(async () => vi.advanceTimersByTimeAsync(30005));
  expect(host.textContent).toContain("Falha ao atualizar");
  await act(async () => vi.advanceTimersByTimeAsync(30005));
  expect(host.textContent).toContain("-12");
  await act(async () => root.unmount());
  await vi.advanceTimersByTimeAsync(60000);
  expect(fetch).toHaveBeenCalledTimes(3);
});
it("renderiza os mesmos componentes, filtros e números de Indicadores na TV autenticada, sem depender do painel público", async () => {
  vi.spyOn(authService, "resume").mockResolvedValue({user: {id: 7, name: "Gestor", email: "gestor@test.invalid", role: "superuser", mustChangePassword: false}});
  const dashboard: AnalyticsDashboard = {
    sessions:{started:10,complete:8,incomplete:2,inProgress:2,endedOrExpired:0,closedIncomplete:0,unknownDeadline:0,completionRate:80,nonCompletionRate:20},
    nps:{responses:10,promoters:5,passives:3,detractors:2,value:30},shifts:[],unclassifiedCompleted:0,questions:[],
    distribution:[{score:1,responses:2,is_nps:false},{score:5,responses:8,is_nps:false}],daily:[{day:"2026-11-27",started:10,complete:8}],dailyAnswers:[],
    sectors:[{sector_id:4,started:10,complete:8}],ombudsman:[],responseRate:null,teamAttributionAvailable:false,timeZone:"America/Sao_Paulo",privacyNotice:"",
  };
  const dashboardRequest = vi.spyOn(analyticsService,"dashboard").mockResolvedValue(dashboard);
  vi.spyOn(analyticsService,"heatmap").mockResolvedValue([{sectorId:4,satisfactionMean:4.5,npsMean:9,positivePercentage:80,completionRate:90,responses:10,npsResponses:10,started:10,completed:9}]);
  vi.spyOn(analyticsService,"criticalQuestions").mockResolvedValue({minimumResponses:5,items:[]});
  vi.spyOn(sectorsService,"list").mockResolvedValue([{id:4,name:"Internação",code:"INT",deletedAt:null}]);
  const admin = document.createElement("div"), adminRoot = createRoot(admin), client = new QueryClient();
  await act(async () => adminRoot.render(<QueryClientProvider client={client}><AnalyticsPage userId={7} canManage /></QueryClientProvider>));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  window.history.replaceState({}, "", "/tv-wall");
  const host = document.createElement("div"), root = createRoot(host);
  await act(async () => root.render(<App/>));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  expect(host.querySelector(".fhdod-analytics")?.textContent).toBe(admin.querySelector(".fhdod-analytics")?.textContent);
  expect(host.querySelector(".fhdod-donut")?.getAttribute("style")).toBe(admin.querySelector(".fhdod-donut")?.getAttribute("style"));
  expect(host.querySelector(".fhdod-nps-panel")?.textContent).toBe(admin.querySelector(".fhdod-nps-panel")?.textContent);
  expect(host.querySelector(".fhdod-heatmap")?.textContent).toBe(admin.querySelector(".fhdod-heatmap")?.textContent);
  expect(dashboardRequest.mock.calls.map(call=>call[0])).toEqual([dashboardRequest.mock.calls[0][0], dashboardRequest.mock.calls[0][0]]);
  expect(host.querySelector("#analytics-sector")).not.toBeNull();
  await act(async () => root.unmount());
  await act(async () => adminRoot.unmount()); client.clear();
});
it("salva a ordem pré-visualizada e os filtros carregados pela API", async () => {
  const config = {periodDays:7, refreshSeconds:60, indicators:["nps","completionRate"],sectorIds:[4]};
  const request = vi.spyOn(api,"request").mockResolvedValue(config);
  vi.spyOn(sectorsService,"list").mockResolvedValue([{id:4, name:"Unidade",code:"U",deletedAt:null}]);
  const host = document.createElement("div"), root = createRoot(host), client = new QueryClient();
  await act(async () => root.render(<QueryClientProvider client={client}><TvWallConfig userId={1}/></QueryClientProvider>));
  await act(async () => {await new Promise(resolve => setTimeout(resolve,10));});
  await act(async () => (host.querySelector('[aria-label="Adiar NPS médio"]') as HTMLButtonElement).click());
  expect(host.querySelector(".wall-tiles h2")?.textContent).toBe("Taxa de conclusão");
  await act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", {bubbles:true,cancelable:true})));
  expect(request).toHaveBeenCalledWith("/api/tv-wall/config", {method:"PUT",body:{...config, indicators:["completionRate","nps"]}});
  await act(async () => root.unmount());
  client.clear();
});

it.each([{id:"ombudsman",value:"texto privado"}, {id:"nps",value:"texto privado"}, {id:"npsGroups",value:{promoters: "texto privado"}}])("rejeita dados fora do contrato público", async (indicator) => {
  vi.spyOn(api,"request").mockResolvedValue({periodDays:7,refreshSeconds:60,indicators:[indicator]});
  await expect(loadPublicDisplay(new AbortController().signal)).rejects.toThrow("painel inválido");
});
