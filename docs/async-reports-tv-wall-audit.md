# Auditoria da `fix/async-reports-and-tv-wall-data`

## Escopo

Auditoria realizada no repositório `FHDOD-front`, na branch `fix/async-reports-and-tv-wall-data`, comparada à `origin/develop` em `b03a3ee`. A branch tinha como escopo principal o consumo de jobs assíncronos de relatórios e a atualização dos filtros de turno/indicadores do Analytics e TV Wall.

Não há PR aberto correspondente no repositório remoto. O backend, Redis, PostgreSQL, migrations e pipelines CI/CD não estão presentes neste checkout; portanto, seus contratos e propriedades operacionais não foram tratados como validados.

## Achados

### P1 — colisão de módulos do Analytics — RESOLVIDO

`AnalyticsInsights.tsx` contém os componentes React, mas `analyticsInsights.ts` permanecia versionado com o mesmo nome lógico. O import `./AnalyticsInsights` podia resolver para o módulo `.ts`, que não exportava `CriticalRanking`, `QuestionDistribution`, `SatisfactionHeatmap` e `ShiftOverview`. No Windows isso também produzia `TS1149` por diferença de casing.

Correção: `analyticsInsights.ts` e seu teste foram removidos como arquivos obsoletos; `analyticsMetrics.ts` passou a ser a única fonte das funções derivadas (`npsMean`, `satisfaction`, `shiftTotals` e `criticalQuestions`). O teste `analyticsModuleResolution.test.ts` protege os exports React.

### P2 — job concluído com filtros obsoletos — RESOLVIDO

Após um job assíncrono concluir, a alteração de período, setor ou tipo mantinha o botão de download do arquivo anterior. Isso permitia baixar um relatório diferente dos filtros atualmente exibidos.

Correção: o job local é invalidado quando qualquer filtro muda. O job remoto não é apagado; apenas deixa de ser associado à configuração atual da tela.

## Limitações e dependências

- A criação, persistência, retries, concorrência, ownership, expiração e limpeza dos jobs dependem do backend em `/api/reports/jobs`.
- A compatibilidade de `shiftName` e a consistência dos agregados do TV Wall dependem do contrato do backend; o frontend apenas envia/consome esse campo.
- Não foram executadas migrations, consultas PostgreSQL, Redis real, testes de PDF/Poppler ou validações de rate limit, pois pertencem a outro repositório/ambiente.
- A integração com `origin/develop` foi analisada por diff e merge-base; nenhum merge ou rebase foi realizado.
- A simulação com `git merge-tree` encontrou conflitos de integração em `AnalyticsInsights.tsx` (paleta/visualizações) e `PublicSubmissionPage.test.tsx` (testes dos rostinhos). A resolução deve combinar manualmente as duas mudanças quando a branch for integrada; nenhum dos conflitos foi mascarado por merge automático.

## Validação local

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm test`: aprovado após a correção, incluindo a regressão de resolução do Analytics e os testes de relatórios.
- `npm run build`: aprovado.
- Testes executados sem dados reais, Supabase, Redis ou backend de produção.

