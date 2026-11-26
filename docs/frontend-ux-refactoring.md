# Frontend UX refactoring

## Implementado

- O controle de senha usa um botão de olho acessível, com `aria-label`, `aria-pressed`, foco preservado e área de toque de 44px.
- O dashboard usa os rótulos de apresentação solicitados, mostra distribuição geral em rosca com legenda textual e ocupa toda a largura quando um setor é filtrado.
- A pesquisa pública envia a resposta imediatamente ao toque, bloqueia cliques duplicados, exibe notas de 5 para 1 sem inverter os valores enviados e remove a barra de progresso da apresentação.
- A tela final informa que as respostas foram registradas e possui countdown para uma nova tentativa sem criar uma sessão antecipadamente.
- A renovação da sessão aparece em modal apenas quando o backend informa tentativas restantes; o contador é atualizado somente após confirmação da renovação.
- O botão de tempo extra foi removido do fluxo normal e o encerramento continua usando o endpoint existente.

## Dependências e limitações

- O título da pesquisa ainda não exibe o nome do setor porque o contrato atual de `current-form` fornece somente `sectorId`. Não foi criado endpoint nem inferido nome a partir do código.
- A autorização definitiva de Ouvidoria administrativa continua sendo responsabilidade do backend; o frontend já restringe o menu e a rota a superusuários.
- A quantidade de perguntas publicadas na tela de setores não foi inventada porque não existe esse campo no contrato atual.
- O comportamento de pular continua condicionado ao contrato existente: somente perguntas setoriais exibem a ação.
- O aviso de dez segundos é uma decisão de UX do MVP e não altera o prazo controlado pelo backend.

## Validação

- `npx tsc --noEmit --pretty false -p tsconfig.app.json`
- `npm run lint`
- `npm run test -- --maxWorkers=2`
- `npm run build`

Não foram executados testes de integração nem alterados backend, banco, Vercel, Render ou Supabase.
