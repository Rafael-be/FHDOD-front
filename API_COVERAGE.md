# Cobertura da API — Fase 1

| Endpoint | Serviço | Tela/uso | Teste | Status |
| --- | --- | --- | --- | --- |
| `POST /api/auth/login`, `refresh`, `me`, `logout` e alterações de conta | `auth.service.ts` | acesso e conta | `auth.service.test.ts` | integrado |
| `GET /api/auth/csrf` | `http.ts` | infraestrutura de mutações | `http.test.ts` | integrado |
| Gestores e vínculos | `managers.ts` | `/gestores` | `managers.test.ts` | integrado |
| Setores e status | `sectors.ts` | `/setores` | `sectors.test.ts` | integrado; status preparado para consumidor futuro |
| `GET/PUT /api/pages/:slug` | `pages.ts` | `/lgpd`, `/paginas/lgpd` | `pages.test.ts` | integrado |
| `GET /api/audit-logs` | `audit.ts` | sem tela, decisão da Fase 1 | `audit.test.ts` | preparado |
| `/health`, `/health/ready`, `/api-docs` | — | operação/desenvolvimento | — | sem UI, deliberado |

## Limitações conhecidas

- A tela de auditoria foi intencionalmente adiada.
- O checkout local do backend ainda diverge do contrato atualizado de autenticação informado para `/api/auth/me` e respostas com `user`; o frontend segue o contrato confirmado pelo projeto.
- Os testes integrados com a API de desenvolvimento dependem de URL e credenciais de desenvolvimento, que não estão configuradas neste repositório.
