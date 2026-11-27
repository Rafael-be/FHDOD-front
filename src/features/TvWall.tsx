import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Alert, LoadingState } from "../components/ui/Feedback";
import { Button } from "../components/ui/Button";
import { loadPublicDisplay, type Indicator } from "./tvDisplay";
import { api } from "../services/http";
import { sectorsService } from "./sectors";
import { Bars, Donut } from "./AnalyticsPage";
import { SatisfactionHeatmap } from "./AnalyticsInsights";
import { analyticsService, type AnalyticsFilter } from "./analytics";
import { npsGroupColors } from "./analyticsChartColors";
import { useAuth } from "./auth/AuthContext";

const titles = { completionRate: "Taxa de conclusão", nps: "NPS médio", npsGroups: "Classificação do NPS" };
type Metric = keyof typeof titles;
interface Settings {periodDays: number; refreshSeconds: number; indicators: Metric[]; sectorIds: number[]}
const configPath = "/api/tv-wall/config";

function Tiles({ indicators, preview = false }: {indicators: Indicator[]; preview?: boolean}) {
  return <div className="wall-tiles">{indicators.map(item => <article key={item.id}>
    <h2>{titles[item.id]}</h2>
    {item.value === null ? <p>{preview ? "Pré-visualização" : "Indisponível"}</p> : item.id === "npsGroups" ?
      <dl>{[["Bons", item.value.promoters], ["Neutros", item.value.passives], ["Ruins", item.value.detractors]].map(([label, value]) =>
        <div key={label}><dt>{label}</dt><dd>{value}%</dd></div>)}</dl> :
      <strong>{item.value}{item.id === "completionRate" && "%"}</strong>}
  </article>)}</div>;
}

function tvWallFilter(periodDays: number): AnalyticsFilter {
  const today = new Date().toLocaleDateString("en-CA", {timeZone: "America/Sao_Paulo"});
  const end = new Date(`${today}T00:00:00-03:00`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - periodDays);
  return {from: start.toISOString(), to: end.toISOString()};
}

function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Falha ao carregar dados dos indicadores."; }

function TvWallCharts({ indicators, periodDays }: { indicators: Indicator[]; periodDays: number }) {
  const {status, user} = useAuth();
  const npsGroups = indicators.find(item => item.id === "npsGroups")?.value;
  const npsRows = npsGroups && typeof npsGroups === "object" ? [
    {label: "Promotores (9–10)", value: npsGroups.promoters, color: npsGroupColors.promoters},
    {label: "Passivos (7–8)", value: npsGroups.passives, color: npsGroupColors.passives},
    {label: "Detratores (0–6)", value: npsGroups.detractors, color: npsGroupColors.detractors},
  ] : [{label: "Promotores (9–10)", value: 0, color: npsGroupColors.promoters}, {label: "Passivos (7–8)", value: 0, color: npsGroupColors.passives}, {label: "Detratores (0–6)", value: 0, color: npsGroupColors.detractors}];
  const filter = tvWallFilter(periodDays);
  const enabled = status === "authenticated";
  const dashboard = useQuery({queryKey: ["tv-wall-dashboard", user?.id, periodDays], queryFn: ({signal}) => analyticsService.dashboard(filter, signal), enabled, retry: false, staleTime: 30000, refetchInterval: 60000});
  const heatmap = useQuery({queryKey: ["tv-wall-heatmap", user?.id, periodDays], queryFn: ({signal}) => analyticsService.heatmap(filter, signal), enabled, retry: false, staleTime: 30000, refetchInterval: 60000});
  const sectors = useQuery({queryKey: ["tv-wall-sectors", user?.id], queryFn: () => sectorsService.list(), enabled, retry: false, staleTime: 60000});
  const notes = dashboard.data?.distribution.filter(row => !row.is_nps) ?? [];
  const distribution = [1, 2, 3, 4, 5].map(score => ({label: `Nota ${score}`, value: notes.find(row => row.score === score)?.responses ?? 0, score}));
  const names = new Map((sectors.data ?? []).map(sector => [sector.id, sector.name]));
  return <section className="tv-wall-charts" aria-label="Gráficos do TV Wall">
    {!enabled ? <p>Distribuição de notas: faça login para consultar os mesmos dados protegidos de Indicadores.</p> : dashboard.isError ? <p role="alert">Distribuição indisponível: {errorMessage(dashboard.error)}</p> : <Donut title="Distribuição de notas" emptyMessage="Sem avaliações no período." rows={distribution} />}
    <Bars title="Classificação do NPS" rows={npsRows} />
    {!enabled ? <p>Mapa por setor: faça login para consultar os mesmos dados protegidos de Indicadores.</p> : heatmap.isError || (heatmap.isSuccess && !Array.isArray(heatmap.data)) ? <p role="alert">Mapa por setor indisponível: {heatmap.isError ? errorMessage(heatmap.error) : "A API retornou um formato inválido."}</p> : <SatisfactionHeatmap rows={heatmap.data ?? []} names={names} emptyMessage={heatmap.isPending ? "Carregando dados dos setores…" : "Sem avaliações no período."} />}
  </section>;
}

export function TvWall() {
  const [fullscreenError, setFullscreenError] = useState(false);
  const wall = useQuery({
    queryKey: ["public-tv-wall"],
    queryFn: ({signal}) => loadPublicDisplay(signal),
    refetchInterval: query => (query.state.data?.refreshSeconds ?? 60) * 1000,
    refetchIntervalInBackground: true, retry: false, gcTime: 0,
  });
  return <main className="tv-wall">
    <header><div><h1>Experiência do paciente</h1>{wall.isSuccess && <p>Últimos {wall.data.periodDays} dias completos</p>}</div>
      {document.fullscreenEnabled && <button onClick={async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else await document.documentElement.requestFullscreen();
          setFullscreenError(false);
        } catch {setFullscreenError(true);}
      }}>Alternar tela cheia</button>}</header>
    {fullscreenError && <p role="status">Tela cheia indisponível neste navegador.</p>}
    {wall.isPending && <LoadingState/>}
    {wall.isError && <p role="alert">Falha ao atualizar os indicadores. Uma nova tentativa será feita automaticamente.</p>}
    {wall.isSuccess && <>{wall.data.indicators.length ? <Tiles indicators={wall.data.indicators}/> : <p>Nenhum indicador publicado.</p>}<TvWallCharts indicators={wall.data.indicators} periodDays={wall.data.periodDays}/></>}
  </main>;
}

export function TvWallConfig({userId}: {userId: number}) {
  const client = useQueryClient();
  const key = ["tv-wall-config", userId, "superuser"];
  const config = useQuery({queryKey: key, queryFn: () => api.request<Settings>(configPath), retry: false});
  const sectors = useQuery({queryKey: ["sectors", userId, true], queryFn: () => sectorsService.list(), retry: false, staleTime: 60000});
  const [draft, setDraft] = useState<Settings>();
  const save = useMutation({
    mutationFn: (settings: Settings) => api.request<Settings>(configPath, {method: "PUT", body: settings}),
    onSuccess: settings => {client.setQueryData(key, settings); setDraft(undefined);},
  });
  if (config.isError || sectors.isError) return <Alert tone="danger">{(config.error ?? sectors.error)?.message}</Alert>;
  if (!config.data || !sectors.data) return <LoadingState/>;
  const settings = draft ?? config.data;
  const update = (change: Partial<Settings>) => { save.reset(); setDraft({...settings, ...change}); };
  const toggle = (id: Metric) => update({indicators: settings.indicators.includes(id) ? settings.indicators.filter(item => item !== id) : [...settings.indicators, id]});
  const move = (index: number, offset: number) => {
    const order = [...settings.indicators];
    [order[index], order[index + offset]] = [order[index + offset], order[index]];
    update({indicators: order});
  };
  const submit = (event: FormEvent) => {event.preventDefault(); save.mutate(settings);};
  return <section><h1>Configuração da TV</h1>
    <form className="fhdod-profile-card" onSubmit={submit}><fieldset disabled={save.isPending}>
      <legend>Indicadores públicos</legend>
      {(Object.keys(titles) as Metric[]).map(id => <label className="d-block" key={id}><input type="checkbox" checked={settings.indicators.includes(id)} onChange={() => toggle(id)}/> {titles[id]}</label>)}
      <label className="d-block my-3">Setores permitidos<select className="form-select" multiple required={!!settings.indicators.length} value={settings.sectorIds.map(String)}
        onChange={event => update({sectorIds: Array.from(event.target.selectedOptions, item => Number(item.value))})}>
        {sectors.data.filter(item => !item.deletedAt).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Dias completos<input type="number" className="form-control" min="1" max="90" required value={settings.periodDays || ""} onChange={event => update({periodDays: Number(event.target.value)})}/></label>
      <label>Atualização em segundos<input type="number" className="form-control" min="30" max="3600" required value={settings.refreshSeconds || ""} onChange={event => update({refreshSeconds: Number(event.target.value)})}/></label>
      <h2 className="mt-3">Ordem de exibição</h2>
      <ol>{settings.indicators.map((id,index) => <li key={id}>{titles[id]} <button type="button" disabled={!index} aria-label={`Antecipar ${titles[id]}`} onClick={() => move(index,-1)}>↑</button> <button type="button" disabled={index === settings.indicators.length-1} aria-label={`Adiar ${titles[id]}`} onClick={() => move(index,1)}>↓</button></li>)}</ol>
      {settings.sectorIds.length > 200 && <Alert tone="warning">Selecione até 200 setores.</Alert>}
      <Button type="submit" loading={save.isPending} disabled={settings.sectorIds.length > 200}>Salvar configuração</Button>
    </fieldset></form>
    {save.isError && <Alert tone="danger">{save.error.message}</Alert>}
    {save.isSuccess && <Alert tone="success">Configuração salva.</Alert>}
    <h2 className="mt-3">Pré-visualização da composição</h2>
    {settings.indicators.length ? <Tiles preview indicators={settings.indicators.map(id => ({id,value:null}))}/> : <p>Exibição desativada.</p>}
    <a href="/tv-wall" target="_blank" rel="noreferrer">Abrir TV pública</a>
  </section>;
}
