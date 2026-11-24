# Cobertura da API do frontend

Contrato de referência: backend local `feature/backend-completion-analytics` (a partir de `b15f747`), `src/docs/openapi.ts` e serviços da mesma branch. As rotas de escrita legadas de perguntas estão bloqueadas por `409 FORM_DRAFT_REQUIRED` e não são consumidas.

| Funcionalidade | Endpoints consumidos | Tela / serviço | Verificação |
| --- | --- | --- | --- |
| Sessão e conta | `POST /api/auth/login`, `refresh`, `logout`, `change-temporary-password`, `change-password`, `change-email`; `GET /api/auth/me`, `csrf` | `auth/`, `http.ts` | testes de serviço, smoke HTTP local |
| Setores | `GET/POST /api/sectors`, `GET /api/sectors/:id/status`, `PATCH /api/sectors/:id`, `POST /api/sectors/:id/deactivate`, `reactivate` | `SectorsPage` | testes existentes, smoke HTTP |
| Gestores | `GET/POST /api/managers`, `GET/PATCH /api/managers/:id`, `POST /api/managers/:id/deactivate`, `reactivate`, `GET /api/managers/:id/sectors`, `PUT/DELETE /api/managers/:managerId/sectors/:sectorId` | `ManagersPage` | testes existentes |
| Catálogo | `GET /api/questions?sectorId=`, `POST /api/catalog/standard-questions`, `POST /api/catalog/nps-questions` | `questions.ts`, criação e editor | teste de serviço, smoke HTTP; catálogo requer `questionVersionId` |
| Rascunho e publicação | `GET/PUT/DELETE /api/sectors/:id/form-draft`, `GET /form-draft/readiness`, `POST /form-draft/publish`, `GET /form-versions`, `GET /form-versions/:versionId`, `POST /form-versions/:versionId/restore` | `SectorQuestionsPage`, `formDraft.ts` | teste de revisão, smoke HTTP local |
| Pesquisa pública | `POST /api/public/sectors/:id/submissions`, `POST /api/public/submissions/:id/answers`, `refresh`, `close`, `restart` | `PublicSubmissionPage` | teste de capability, smoke HTTP |
| Turnos | `GET /api/shift-sheets/template`, `GET /api/shift-sheets/current/export`, `POST /api/shift-sheets` | `ShiftSheetsPage` | teste de corpo binário, smoke do template |
| Ouvidoria | `POST /api/public/ombudsman/tickets`, `GET /api/ombudsman/tickets`, `GET /api/ombudsman/tickets/:id`, `PATCH /api/ombudsman/tickets/:id/status` | `OmbudsmanPage` | teste de serviço, smoke HTTP |
| Indicadores | `GET /api/analytics/dashboard` | `AnalyticsPage` | teste dos filtros, smoke com contagens antes/depois |
| LGPD e auditoria | `GET/PUT /api/pages/:slug`, `GET /api/audit-logs` | `PagesPage`, `AuditPage` | testes existentes |

`/health`, `/health/ready` e `/api-docs/` são endpoints operacionais sem tela. O backend não oferece taxa sobre atendimentos, atribuição individual de equipe nem metadados de versão da planilha vigente; o frontend não inventa esses valores.
