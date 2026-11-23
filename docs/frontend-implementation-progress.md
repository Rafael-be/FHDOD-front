# Progresso da conclusão do frontend

## 2026-11-23

- Base: `feature/formularios-perguntas` incorporou `origin/feat/backend-develop-integration` em `feature/frontend-completion`, incluindo pesquisa pública, turnos e auditoria.
- Editor migrado de escritas legadas para rascunho com revisão, prontidão, publicação manual, histórico e restauração. Catálogo usa as rotas novas.
- Commits frontend: `9fde312` (editor e catálogo), `088543f` (pesquisa pública, refresh e CSV), `6316dae` (analytics, Ouvidoria e navegação).
- Backend local: catálogo passou a retornar `questionVersionId`, necessário para associação; OpenAPI e teste de integração atualizados no commit `8904e76`. O teste passou no PostgreSQL descartável local.
- Pesquisa pública corrigida para enviar `questionId` e `questionVersionId` do snapshot; adicionados renovação e encerramento.
- Dashboard e gráficos conectados a `GET /api/analytics/dashboard`; Ouvidoria pública e administrativa conectada.
- Gates finais do frontend: typecheck, lint, 24 testes e build aprovados; smoke HTTP real local passou com superusuário e gestor.
- Suíte completa do backend no banco novo local: 57 suítes aprovadas, 3 falhas, 1 ignorada; 220 testes aprovados, 6 falhas, 4 ignorados. As falhas são dos testes de rascunho/publicação que usam IDs e vínculos fixos da fixture histórica, ausentes no banco novo. O teste novo do catálogo e os 10 testes OpenAPI passaram. A suíte do backend ainda não é reproduzível em banco novo sem corrigir essas fixtures.
- Próximo passo: commit da documentação e PR para `develop`, mantendo a dependência do commit local de backend explícita.
