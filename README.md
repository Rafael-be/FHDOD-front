# FHDOD Frontend

Aplicação React 19 + TypeScript + Vite para a experiência do paciente. A API normativa está na branch local do backend `feature/backend-completion-analytics`; a `develop` do backend ainda pode não conter essas rotas.

## Início local

1. Inicie o backend com `DATABASE_URL` apontando **somente** para PostgreSQL local. Siga [o guia de teste local](docs/frontend-local-test-guide.md).
2. Neste repositório, execute `npm ci`.
3. Configure `.env.local` com `VITE_API_BASE_URL=` e `VITE_API_PROXY_TARGET=http://127.0.0.1:3317` (ou a porta real da API local).
4. Execute `npm run dev` e abra o endereço informado pelo Vite.

O proxy Vite encaminha `/api` à API; cookies HttpOnly e CSRF permanecem no cliente HTTP compartilhado. `VITE_API_BASE_URL` permite URL direta da API quando CORS e cookies estiverem configurados para essa origem. Configure `VITE_PUBLIC_APP_URL` com a URL HTTPS pública do **frontend** para gerar QR Codes permanentes por setor; o link usa `/avaliacao/{sectorId}` e continua válido após uma nova publicação do formulário. Sem essa configuração, as ações de QR Code ficam indisponíveis. Não coloque credenciais do PostgreSQL nem segredos em variáveis `VITE_*`.

## Rotas e papéis

| Rota | Uso |
| --- | --- |
| `/` | indicadores agregados de setores autorizados |
| `/entrar`, `/conta`, `/trocar-senha-temporaria` | acesso e conta |
| `/setores`, `/setores/:id/perguntas` | setores e editor de rascunho |
| `/perguntas-padrao/nova`, `/nps/novo` | cadastro no catálogo; superusuário |
| `/gestores`, `/planilhas-turnos`, `/ouvidoria`, `/auditoria`, `/paginas/lgpd` | administração; superusuário |
| `/avaliacao/:id`, `/manifestacao/:id`, `/lgpd` | pesquisa, Ouvidoria e política públicas |

O gestor vê somente setores vinculados; a API impõe a autorização. O editor salva um rascunho com revisão, verifica prontidão e publica manualmente. Histórico e restauração ficam na mesma tela. Sessões públicas usam uma capability efêmera apenas em memória e enviam `questionId` e `questionVersionId` do snapshot. O dashboard usa `GET /api/analytics/dashboard` e exibe NPS calculado pelo backend. A planilha CSV é enviada como `application/octet-stream`.

## Verificação

`npm run typecheck`, `npm run lint`, `npm run test -- --maxWorkers=2` e `npm run build`. A matriz de endpoints está em [API_COVERAGE.md](API_COVERAGE.md). Testes HTTP reais exigem o PostgreSQL local descartável descrito no guia.
