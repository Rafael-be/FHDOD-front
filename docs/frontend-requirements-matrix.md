# Matriz curta de requisitos

| Exigência | Tela / serviço existente | API real | Estado e aceite |
| --- | --- | --- | --- |
| Acesso e papéis | `auth/`, `App.tsx`, `http.ts` | `/api/auth/*` | Cookie, CSRF, refresh e rotas protegidas; 401/403 tratados |
| Setores e gestores | `SectorsPage`, `ManagersPage` | `/api/sectors/*`, `/api/managers/*` | Reutilizados; gestor vê setores autorizados |
| Catálogo e formulário | `QuestionCreationPage`, `SectorQuestionsPage`, `formDraft.ts` | `/api/catalog/*`, `/api/questions`, `/api/sectors/:id/form-draft/*`, `form-versions/*` | Sem escrita legada; revisão, prontidão, publicação e histórico |
| Pesquisa pública | `PublicSubmissionPage`, `submissions.ts` | `/api/public/sectors/:id/submissions`, `/api/public/submissions/:id/*` | Capability em memória e IDs de pergunta da versão publicada |
| Turnos CSV | `ShiftSheetsPage`, `shifts.ts` | `/api/shift-sheets/*` | Upload binário, download e validação |
| Ouvidoria | `OmbudsmanPage`, `ombudsman.ts` | `/api/public/ombudsman/tickets`, `/api/ombudsman/tickets/*` | Consentimento, protocolo, filtros, detalhes e status |
| Indicadores | `AnalyticsPage`, `analytics.ts` | `GET /api/analytics/dashboard` | Cards, séries e distribuições com agregados reais e filtros |
| LGPD e auditoria | `PagesPage`, `AuditPage` | `/api/pages/:slug`, `/api/audit-logs` | Reutilizados |

Critério de integração: frontend aprovado em typecheck, lint, testes e build; contrato de catálogo do backend commitado; executar teste visual manual e resolver as fixtures rígidas da suíte completa do backend antes do merge final.
