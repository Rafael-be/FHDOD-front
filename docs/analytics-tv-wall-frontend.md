# Indicadores, pesquisa pública e TV Wall

## Compatibilidade e publicação

A branch `feature/analytics-tv-wall-frontend` deriva de `origin/develop@597aa88`. A base já contém a refatoração de `feature/ux-dashboard-and-survey-polish@2bb5d41`. O contrato consultado está em `FHDOD_back`, branch `feature/analytics-and-tv-wall-backend@c155865`, no documento `docs/analytics-and-tv-wall.md`, nos tipos de analytics e nas rotas de pesquisa, Ouvidoria e TV.

**Bloqueio de publicação da TV configurável.** No ambiente local com PostgreSQL, o superusuário autenticado leu a configuração e recebeu HTTP 500 ao enviar um PUT válido com CSRF, um setor ativo, os três indicadores, um dia e atualização de 30 segundos. O erro também ocorreu com a configuração inicial vazia. O log aponta `ERR_INVALID_ARG_TYPE` na serialização do parâmetro JSONB por postgres.js em `TvWallService.configure`. O teste HTTP do backend substitui esse serviço por um mock. A etapa de backend precisa corrigir a escrita e verificar um ciclo PUT → GET administrativo → GET público pelo servidor real. O frontend conserva a edição em caso de erro e só confirma a gravação após sucesso HTTP.

Publicar a migration `0018_tv_wall_configuration.sql` e o backend compatível antes do frontend. O rewrite existente do Vercel encaminha `/api/*` ao backend e os demais caminhos ao SPA. Validar esse destino no ambiente de publicação. Nenhuma mudança de infraestrutura faz parte desta branch.

## Rotas e dados

| Página | Componentes | Contrato HTTP |
|---|---|---|
| `/` | `AnalyticsPage`, `GlobalQuestions` | GET `/api/sectors`, `/api/analytics/dashboard`, `/api/analytics/global-questions` |
| `/tv-wall/config` | `TvWallConfig` | GET e PUT `/api/tv-wall/config`, GET `/api/sectors`, GET `/api/auth/csrf` para a mutação autenticada |
| `/tv-wall` | `TvWall`, `loadPublicDisplay` | GET `/api/public/tv-wall` sem parâmetros nem credenciais |
| `/avaliacao/:sectorId` | `PublicSubmissionPage`, `SurveyAttempt` | GET `/api/public/sectors/:sectorId/current-form`, POST `/api/public/sectors/:sectorId/submissions`, POST `/api/public/submissions/:sessionId/{answers,refresh,close}` |
| Modal, `/manifestacao` e `/manifestacao/:sectorId` | `PublicOmbudsmanPage` | GET `/api/pages/lgpd`, POST `/api/public/ombudsman/tickets` |
| `/ouvidoria` | `OmbudsmanPage` | GET `/api/ombudsman/tickets` e `/:id`, PATCH `/api/ombudsman/tickets/:id/status` |

### Dashboard

Aplicar envia o intervalo civil inclusivo da interface como `[from,to)` ISO no fuso hospitalar, limitado a 366 dias. O seletor nativo de setor usa a opção vazia para todo o escopo autorizado ou `sectorId` para um setor. O seletor de turno mostra Madrugada, Dia e Noite. Como a API filtra por um `shiftRangeId` por requisição, a interface consulta cada ID histórico do grupo devolvido pelo dashboard e soma coortes disjuntas para aplicar o turno aos dois relatórios. A atribuição da sessão à faixa usa os horários reais da planilha no backend; a interface não define horários. **Limite do contrato:** a lista de faixas inclui as vigentes e as históricas com conclusões; uma faixa histórica que tenha apenas sessões incompletas não aparece. O backend precisa expor todas as faixas elegíveis ou aceitar filtro por nome de turno para garantir cobertura completa desse caso.

- **NPS médio** exibe o índice agregado da API arredondado para inteiro. O zero exato, o valor próximo de zero que arredonda para zero e a ausência de respostas têm apresentações distintas. Os grupos visuais Bons, Neutros e Ruins correspondem a 9–10, 7–8 e 0–6.
- **Iniciadas** conta tentativas com pelo menos uma avaliação válida. Uma tentativa só com pulos não entra no denominador. Completas, não concluídas, em andamento e as duas taxas vêm de `sessions`. As taxas são indisponíveis com denominador zero. A não conclusão inclui sessões ativas. A interface verifica `complete + incomplete = started`, a soma da série diária e `completionRate = 100 × complete / started` antes de apresentar a taxa da API. Em caso de divergência, exibe indisponibilidade com a causa, sem substituir o agregado por respostas individuais. A SQL local em `FHDOD_back/src/modules/analytics/analytics.repository.ts` usa a mesma CTE `sessions` para totais, taxa e série diária; uma resposta de produção com 100% e incompletas exige investigar a versão publicada do backend, o recorte enviado e os dados persistidos. Não foi possível validar uma resposta autenticada do ambiente de produção nesta tarefa.
- **Pesquisas por turno** conta conclusões por ID da faixa histórica. Os percentuais fornecidos pela API usam o total com turno identificado. O rodapé distingue as conclusões sem turno.
- **Notas gerais** usa as respostas comuns 1–5 na rosca e na média ponderada pelas contagens de cada nota. A classificação NPS usa uma distribuição própria.
- **Perguntas globais** distingue pergunta, versão e escala. A publicação atual, a quantidade de respostas e a média histórica de cada setor podem divergir. Ausência de publicação ou de respostas não gera uma nota. A API fornece distribuições por nota e médias. Não há série temporal por pergunta nem limiar institucional de satisfação.

A implementação usa os gráficos CSS/SVG do projeto. O seletor da pergunta troca a visualização do resultado em memória. As consultas do TanStack Query incluem conta, perfil e filtros aplicados, usam frescor de um minuto e recebem o sinal de cancelamento nos relatórios. A área autenticada tem um cliente de cache por sessão montada. Sair ou trocar de conta descarta esse cache. Gestores veem somente os setores permitidos pelo servidor.

### TV

O superusuário escolhe e ordena `nps`, `npsGroups` e `completionRate`, seleciona até 200 setores ativos, 1–90 dias completos e intervalo de 30–3.600 segundos. Uma lista vazia de indicadores desativa a exibição. A prévia mostra a composição do rascunho sem valores fictícios. O link da TV abre a configuração pública vigente.

A página de exibição dispensa o bootstrap de autenticação. Usa polling do TanStack Query conforme `refreshSeconds`, inclusive em segundo plano, e tenta recuperar falhas automaticamente. O layout adapta até três indicadores à tela e permite solicitar tela cheia quando o navegador oferece suporte. Cada indicador aceita somente o formato numérico autorizado. O valor nulo aparece como indisponível, inclusive quando o backend suprime uma amostra pequena. A TV não recebe relatórios administrativos. Turnos, contagens brutas, evolução, setores e perguntas globais dependem de extensão do contrato público para serem elegíveis.

O backend aplica o recorte e a amostra mínima, com dez sessões distintas por grupo não vazio segundo as regras do indicador. A leitura considera dias hospitalares completos anteriores ao dia corrente. O contrato aplica `Cache-Control: no-store` e permite cache de agregados de até 30 segundos no servidor. A interface não persiste dados públicos nem configurações em localStorage.

### Pesquisa e Ouvidoria

O GET inicial reutiliza o formulário do setor por até cinco minutos com revalidação por ETag. A primeira nota ou pulo confirmado cria a tentativa. A pergunta opcional de setor aceita `status: "skipped"` e `score: null` com os dois IDs do snapshot. Os POSTs posteriores usam a capability da tentativa. O progresso avança após a confirmação. O encerramento pede confirmação, preserva as respostas e retorna à primeira pergunta. Só uma nova interação inicia outra tentativa.

O relógio usa `expiresAt`. O primeiro prazo é de três minutos, a próxima resposta confirmada e cada extensão explícita concedem dois minutos. A sessão admite três extensões explícitas. O aviso modal aparece nos dez segundos finais quando há extensão disponível. Ao esgotá-las, o aviso superior permite continuar respondendo. O vencimento reinicializa a interface e o isolamento por tentativa impede uma resposta atrasada de atualizar o próximo formulário. O cliente distingue encerramento, conclusão concorrente, expiração, limite de prorrogação e republicação do formulário.

A Ouvidoria administrativa exige superusuário no menu, na rota e na API. O modal público aceita Reclamação, Elogio e Sugestão ou outro, exige mensagem e consentimento, e pausa a contagem regressiva enquanto estiver aberto. A abertura manual inicia em Elogio. Após uma nota baixa confirmada (normal ≤ 2, NPS ≤ 6 ou corte válido do formulário), a tentativa registra a necessidade de Reclamação e abre o modal uma única vez somente após a última resposta confirmada, na tela de agradecimento.

**Nome público do setor pendente.** O formulário público fornece `sectorId`, `formVersionId` e perguntas. Solicita-se ao backend o nome público do setor no formulário vigente, e um catálogo público mínimo de setores disponíveis para a entrada avulsa. No modal vinculado, o ID fica interno. A rota avulsa sem setor preserva a entrada numérica existente enquanto faltar o catálogo. O fluxo anônimo não consulta rotas administrativas para descobrir nomes.

## Evidência de validação local

- **Firefox headless, Vite, API real e PostgreSQL descartável**. Login administrativo, filtro de um setor, tela de configuração da TV, TV pública com a configuração vigente, pesquisa completa, pulo opcional, encerramento antecipado, abertura de Reclamação e abertura manual de Elogio. Uma pesquisa completa e outra encerrada produziram duas iniciadas, uma completa, uma não concluída e NPS −100.
- **HTTP real pelo proxy Vite**. Login dos dois perfis, recortes de um e dois setores, NPS, contagens de turno, pergunta global, leitura administrativa e pública da TV. O gestor recebeu 403 em Ouvidoria e configuração da TV. A escrita real da configuração falhou conforme descrito acima.
- **Backend selecionado**. Seis suítes e onze testes aprovados em analytics, TV, Ouvidoria, concorrência, pulo e encerramento. Os testes de integração habilitados usaram o banco de loopback marcado como descartável. Há também testes de roteamento com identidades e serviços simulados.
- **Frontend com dados sintéticos**. Vitest e jsdom exercitam NPS negativo, zero e nulo, percentuais, ausência de publicação, filtros, controles por perfil, ordenação da TV, polling, falha e recuperação, payloads fora do contrato, respostas atrasadas, renovação e modal da Ouvidoria. A gravação bem-sucedida da configuração da TV foi exercitada com mock.
- **Prazos reais no Firefox**. O primeiro POST confirmou 3:00. A resposta seguinte confirmou 2:00. Nos dez segundos finais, o modal permitiu renovar por mais 2:00. Após o vencimento, o formulário voltou à primeira pergunta. A consulta ao banco confirmou que continuava existindo somente a sessão original.
- **TV com setores configurados**. Para testar a leitura independentemente do PUT com erro, foi gravada uma fixture temporária no banco descartável. O Firefox em 1920×1080 exibiu os três indicadores suprimidos pelo servidor, sem overflow. A configuração anterior foi restaurada. A submissão de uma manifestação fictícia com consentimento pela rota pública também produziu recibo de sucesso no Firefox.
- **Verificações finais**. `npm run typecheck`, `npm run lint`, `npm test -- --maxWorkers=2` e `npm run build` passaram. Foram 55 testes em 18 arquivos de frontend. O bundle JavaScript de produção ficou em 103,78 kB gzip. Não foi medida a taxa de quadros em televisores físicos ou em grandes volumes de setores.

## Commits da implementação

| Commit | Mudança |
|---|---|
| `a15f29b` | Indicadores, múltiplos setores, perguntas globais e escopo do cache |
| `d96499f` | Configurador administrativo e exibição pública da TV |
| `55a952c` | Expiração, pulo, encerramento voluntário e modal da Ouvidoria |
| `4ab33a3` | Legendas, cores e contagem de manifestações por perfil |
| `b88d7c5` | Validação dos campos autorizados na TV |
| `629b3dc` | Bloqueio de rotas e tratamento do 403 administrativo |
| `50ab482` | Distinção entre zero exato e zero por arredondamento |
| `bbaba3c` | Versão do formulário preservada no reenvio incerto |
| `f4cac44` | Erro recuperável para contrato legado de indicadores |
