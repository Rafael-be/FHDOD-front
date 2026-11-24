# Progresso da conclusão do frontend

## 2026-11-24

- O editor administrativo de formulários por setor passou a exibir uma pré-visualização baseada diretamente na composição do rascunho, sem criar submissões.
- A composição normaliza perguntas comuns antes do NPS, inclusive ao carregar o rascunho e ao alterar sua ordem.
- O histórico de versões exibe a data de publicação e permite visualizar a versão com a mesma prévia antes de restaurá-la para o rascunho.
- O editor identifica o setor selecionado por nome e código, preservando o ID como fallback para acessos diretos.
- Validação completa do frontend: 14 suítes e 31 testes aprovados, lint, typecheck e build de produção aprovados.
- O typecheck foi executado com cache local no workspace porque o caminho `/tmp` configurado nos tsconfigs não é gravável neste ambiente. Os avisos de `act(...)` do jsdom permanecem apenas como warnings de teste.

## 2026-11-23

- Base: `feature/formularios-perguntas` incorporou `origin/feat/backend-develop-integration` em `feature/frontend-completion`, incluindo pesquisa pública, turnos e auditoria.
- Editor migrado de escritas legadas para rascunho com revisão, prontidão, publicação manual, histórico e restauração. Catálogo usa as rotas novas.
- Commits frontend: `9fde312` (editor e catálogo), `088543f` (pesquisa pública, refresh e CSV), `6316dae` (analytics, Ouvidoria e navegação).
- Backend local: catálogo passou a retornar `questionVersionId`, necessário para associação; OpenAPI e teste de integração atualizados no commit `8904e76`. O teste passou no PostgreSQL descartável local.
- Pesquisa pública corrigida para enviar `questionId` e `questionVersionId` do snapshot; adicionados renovação e encerramento.
- Dashboard e gráficos conectados a `GET /api/analytics/dashboard`; Ouvidoria pública e administrativa conectada.
- Gates finais do frontend: typecheck, lint, 25 testes e build aprovados; smoke HTTP real local passou com superusuário e gestor.
- Auditoria final: navegação pela sidebar e histórico do navegador agora consulta o editor antes de descartar alterações locais; teste de regressão adicionado.
- Suíte completa do backend no banco novo local: 57 suítes aprovadas, 3 falhas, 1 ignorada; 220 testes aprovados, 6 falhas, 4 ignorados. As falhas são dos testes de rascunho/publicação que usam IDs e vínculos fixos da fixture histórica, ausentes no banco novo. O teste novo do catálogo e os 10 testes OpenAPI passaram. A suíte do backend ainda não é reproduzível em banco novo sem corrigir essas fixtures.
- Upload CSV binário e exportação foram validados por HTTP após a suíte completa (que alterou a versão vigente no banco descartável). O servidor e o cluster PostgreSQL temporário foram encerrados.
- O Chrome não está instalado neste ambiente; inspeção visual automatizada não executada. O Vite iniciou com proxy local e foi encerrado.
- `git push -u origin feature/frontend-completion` falhou por ausência de credencial HTTPS no ambiente. A branch local está limpa e contém commits prontos; PR não pôde ser aberto sem a branch remota.
- Próximo passo: corrigir as fixtures rígidas da suíte backend, publicar o commit de backend `8904e76`, configurar autenticação Git e enviar a branch frontend para abrir PR contra `develop`.
