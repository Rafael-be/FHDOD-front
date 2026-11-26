# Pesquisa pública: formulário em cache e sessão na primeira resposta

## Fluxo anterior

A página `/avaliacao/:sectorId` chamava `POST /api/public/sectors/:sectorId/submissions` ao montar. Isso criava uma sessão mesmo sem resposta. As notas exigiam seleção e um clique adicional em “Confirmar nota”. A página usava as perguntas retornadas na criação, enviava as respostas seguintes individualmente, mantinha `expiresAt` apenas após refresh explícito e não possuía cache de formulário ou trace local.

## Fluxo atual

`PublicSubmissionPage` consulta `GET /api/public/sectors/:sectorId/current-form` via TanStack Query e mostra a primeira pergunta automaticamente. O GET não cria sessão. Ao escolher uma nota, `newAttempt` gera um UUID e 32 bytes aleatórios em base64url. `POST /api/public/sectors/:sectorId/submissions` envia `formVersionId`, `attemptId`, `capability` e a primeira `answer`. A resposta confirmada fixa o formulário daquela versão na instância da página. As próximas escolhas enviam, uma por vez, `POST /api/public/submissions/:sessionId/answers` com `x-session-capability`. O avanço ocorre somente após confirmação. Não há navegação para perguntas anteriores nem envio em lote.

O estado de uma requisição incerta conserva a mesma tentativa e a mesma resposta para repetição idempotente. Um bloqueio síncrono impede cliques simultâneos. O backend continua responsável pela validação definitiva. O progresso conta respostas confirmadas; a opção selecionada e o estado “Enviando resposta” dão feedback imediato. O título da próxima pergunta recebe foco.

## Cache e revalidação

A chave `['public-current-form', sectorId]` isola os setores. `staleTime` é cinco minutos. O TanStack Query deduplica consultas simultâneas e revalida ao montar ou focar quando os dados envelhecem. O serviço guarda apenas o formulário público e seu ETag na entrada do cache. Na revalidação, envia `If-None-Match` e reutiliza a entrada em HTTP 304 sem interpretar corpo JSON. Respostas, capability e dados de sessão não entram no cache. `FORM_VERSION_CHANGED` invalida a chave do setor, consulta a publicação atual e reinicia a primeira pergunta sem reutilizar a tentativa anterior. Uma publicação nova durante uma sessão não troca as perguntas já fixadas.

## Prazo e erros

O cronômetro usa `expiresAt` devolvido pelo backend após cada resposta e após refresh explícito. O primeiro prazo é definido pelo backend em três minutos; cada resposta posterior define um novo prazo de dois minutos. O frontend apenas exibe o tempo restante. Ao receber `SUBMISSION_EXPIRED`, interrompe os envios e oferece nova avaliação. Também interrompe em `SUBMISSION_CLOSED` e conflitos de sequência. Erros de rede não avançam a pergunta e oferecem repetição. `SECTOR_NOT_FOUND`, `FORM_NOT_PUBLISHED`, `FORM_INCOMPLETE`, erros de validação e limite de requisições têm mensagens sem detalhes técnicos. O botão “Preciso de mais tempo” chama refresh apenas mediante escolha do paciente; o limite de três renovações é aplicado pelo backend.

## Instrumentação local

Defina `VITE_PUBLIC_SURVEY_TRACE=true` ao executar `npm run dev`. O trace só funciona em desenvolvimento e fica desligado por padrão. O botão “Exportar trace JSON” baixa os eventos da página, consulta e cache, renderização inicial, seleção, início e confirmação de resposta, avanço, expiração, conclusão e falhas. Cada entrada tem horário, correlação local, setor e, quando aplicável, posição, versão, status e duração. Respostas, tokens e capability não são registrados. O backend gera seu próprio `correlationId`; o contrato HTTP não expõe nem aceita um identificador compartilhado, portanto os dois traces não são ligados por cabeçalho.

## Componentes e serviços

- `src/features/PublicSubmissionPage.tsx`: fluxo, feedback, prazo, foco e progressão.
- `src/features/submissions.ts`: contratos do formulário, geração da tentativa e chamadas HTTP.
- `src/features/surveyTrace.ts`: eventos locais e exportação JSON.
- `src/app/App.tsx`: `QueryClientProvider`.
- `src/features/*.test.ts(x)`: testes do serviço e da página.

## Validação e limites

`npm run typecheck`, `npm run lint` e `npm run build` passaram. `npm test -- --maxWorkers=2` passou com 15 suítes e 41 testes. Os testes usam dados sintéticos; nenhuma base de pacientes ou serviço publicado foi alterado. O backend local não estava escutando em `localhost:3000`, portanto não houve integração HTTP real. Não havia benchmark HTTP anterior comparável. O trace permite medir p50 e p95 após uma coleta local com amostras suficientes; não há números de latência de navegador reportados sem execução manual da pesquisa contra o backend local.

O relógio mostrado depende do relógio do navegador; a decisão final de expiração é sempre do backend. Uma resposta confirmada pelo servidor cuja confirmação se perdeu na rede é recuperada pela repetição idempotente, enquanto a página permanecer aberta. Não há fila offline persistente.

## Evolução planejada para 27/11/2026

Permitir voltar e editar respostas anteriores. Isso exige contrato específico de revisão, auditoria e atualização dos agregados; não faz parte desta entrega.
