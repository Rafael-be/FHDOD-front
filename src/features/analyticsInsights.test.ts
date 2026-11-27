import { describe, expect, it } from "vitest";
import { criticalQuestions, npsMean, satisfaction, shiftTotals } from "./analyticsInsights";
import type { AnalyticsDashboard, GlobalQuestionMetric } from "./analytics";

const report = (changes: Partial<AnalyticsDashboard> = {}): AnalyticsDashboard => ({
  sessions: {started:10,complete:8,incomplete:2,closedIncomplete:0,inProgress:0,endedOrExpired:2,unknownDeadline:0,completionRate:80,nonCompletionRate:20},
  nps: {responses:4,promoters:1,passives:1,detractors:2,value:-25},
  distribution: [{is_nps:true,score:0,responses:1},{is_nps:true,score:6,responses:1},{is_nps:true,score:8,responses:1},{is_nps:true,score:10,responses:1},{is_nps:false,score:2,responses:2},{is_nps:false,score:4,responses:3},{is_nps:false,score:5,responses:1}],
  shifts: [{id:1,name:"Dia",sector_id:1,completed:2,percentage:40},{id:2,name:"dia",sector_id:2,completed:3,percentage:60},{id:3,name:"Plantão especial",sector_id:1,completed:1,percentage:10}],
  unclassifiedCompleted:1, questions:[],daily:[],dailyAnswers:[],sectors:[],ombudsman:[],responseRate:null,teamAttributionAvailable:false,timeZone:"America/Sao_Paulo",privacyNotice:"",
  ...changes,
});

describe("indicadores derivados", () => {
  it("calcula média NPS ponderada sem usar o índice tradicional", () => {
    expect(npsMean(report())).toBe(6);
    expect(npsMean(report({nps:{...report().nps,mean:8.4}}))).toBe(8.4);
    expect(npsMean(report({distribution:[]}))).toBeNull();
    expect(npsMean(report({nps:{...report().nps,responses:5}}))).toBeNull();
  });
  it("distingue ausência de notas de nota zero", () => {
    expect(satisfaction(report())).toEqual({mean:21/6,positive:100*4/6,responses:6});
    expect(satisfaction(report({distribution:[]}))).toEqual({mean:null,positive:null,responses:0});
  });
  it("consolida somente nomes de turno retornados pela API", () => {
    expect(shiftTotals(report())).toEqual([{label:"Madrugada",value:0},{label:"Dia",value:5},{label:"Noite",value:0}]);
  });
  it("prioriza versões vigentes, exclui NPS e ordena por média", () => {
    const metrics = report({questions:[
      {question_id:1,question_version_id:11,is_nps:false,responses:3,skipped:0,mean:2},
      {question_id:2,question_version_id:22,is_nps:false,responses:4,skipped:0,mean:1.5},
      {question_id:3,question_version_id:33,is_nps:true,responses:4,skipped:0,mean:1},
    ]});
    const global: GlobalQuestionMetric[] = [{questionId:1,questionVersionId:11,isNps:false,text:"Atendimento",publishedSectorIds:[1],responses:3,mean:2,distribution:[],sectors:[]}];
    const form = {sectorId:1,formVersionId:10,questions:[
      {questionId:1,questionVersionId:11,text:"Atendimento",questionKind:"sector" as const,isNps:false,position:1,required:true,options:[1,2,3,4,5],minScore:1,maxScore:5},
      {questionId:2,questionVersionId:22,text:"Atendimento",questionKind:"sector" as const,isNps:false,position:2,required:true,options:[1,2,3,4,5],minScore:1,maxScore:5},
    ]};
    expect(criticalQuestions(metrics,global,form).map(q => [q.questionId,q.mean])).toEqual([[2,1.5],[1,2]]);
    expect(criticalQuestions(metrics,global).map(q => q.questionId)).toEqual([1]);
  });
});
