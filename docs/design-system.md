# Design system do FHDOD

## Direção visual

A interface usa branco como superfície, vermelho institucional para ações e destaque, e neutros quentes para conteúdo. Verde e âmbar aparecem apenas em mensagens de estado. Os valores cromáticos ficam em `src/styles/global.css`, em HSL moderno. Os componentes compartilham os tokens; classes do Bootstrap são adaptadas no mesmo arquivo.

## Escala baseada em φ

`φ = 1.6180339`. A escala foi calculada a partir de uma unidade de 4 px:

`s(0) = 4` e `s(n + 1) = round(φ × s(n))`, para `n = 0…5`.

O arredondamento gera **4, 6, 10, 16, 26, 42 e 68 px**. A aplicação usa 4–10 px entre elementos internos, 16–26 px entre elementos relacionados e 42–68 px para separar áreas. A escala é uma referência: dimensões de controle (42–52 px) e colunas respondem a legibilidade e toque, sem forçar cada medida a um número da sequência.

Para o vermelho, a luminosidade base é **43%**. As distâncias geométricas aproximadas a partir dela são `8 × φⁿ ≈ 8, 13, 21, 34, 55` pontos percentuais:

| Variação | Cálculo | Luminosidade aplicada |
| --- | --- | --- |
| Hover | 43 − 8 | 35% |
| Pressionado | 43 − 13 | 30% |
| Profundo | 43 − 21 | 22% |
| Borda suave | 43 + 34 | 77% |
| Superfície suave | min(43 + 55, 96) | 96% |

Os 96% preservam uma superfície discreta; hue e saturation são ajustados separadamente para evitar vermelhos pesados nas áreas claras. A fórmula fornece a progressão, enquanto o contraste e a percepção definem o resultado final.

A tipografia usa corpo de 16 px e passos moderados para labels (12–14 px), seções (18–27 px) e títulos principais (30–41 px, com `clamp`). A razão áurea orienta as diferenças entre níveis, sem impor saltos de 1,618 entre todos os títulos. Fontes locais do sistema são usadas; não há download de fonte.

## Paleta

| Token | HSL | Uso |
| --- | --- | --- |
| `--color-primary` | `hsl(356 68% 43%)` | Ação principal e gráficos |
| `--color-primary-hover` | `hsl(356 70% 35%)` | Hover |
| `--color-primary-active` | `hsl(356 72% 30%)` | Pressionado e foco |
| `--color-primary-deep` | `hsl(356 73% 22%)` | Texto em destaque claro |
| `--color-primary-border` | `hsl(356 30% 77%)` | Borda semântica |
| `--color-primary-subtle` | `hsl(356 45% 96%)` | Seleção e fundo discreto |
| `--color-background` | `hsl(0 0% 99%)` | Fundo geral |
| `--color-surface` | `hsl(0 0% 100%)` | Painéis |
| `--color-surface-muted` | `hsl(355 10% 97%)` | Superfície secundária |
| `--color-text` | `hsl(350 12% 16%)` | Texto principal |
| `--color-text-muted` | `hsl(350 7% 42%)` | Texto secundário |
| `--color-border` | `hsl(350 8% 88%)` | Divisórias |
| `--color-border-strong` | `hsl(350 8% 58%)` | Contornos de controles |
| `--color-success` | `hsl(151 49% 29%)` | Confirmação contextual |
| `--color-warning` | `hsl(31 72% 31%)` | Atenção contextual |

Os tokens de superfície, contorno, estado, sombra, foco e backdrop também estão centralizados na raiz do CSS. O gráfico de evolução usa cinza tracejado para pesquisas iniciadas e vermelho sólido para concluídas, com pontos, escala, datas, legenda, tooltips nativos e tabela acessível com os valores.

### Contraste

Razões calculadas pelo algoritmo WCAG de luminância relativa, sobre branco:

| Par | Contraste |
| --- | ---: |
| Texto principal / branco | 15,07:1 |
| Texto secundário / branco | 5,64:1 |
| Vermelho principal / branco | 6,32:1 |
| Vermelho hover / branco | 8,37:1 |
| Vermelho profundo / branco | 13,22:1 |
| Contorno forte / branco | 3,22:1 |
| Verde de confirmação / branco | 6,14:1 |
| Âmbar de atenção / branco | 6,49:1 |

O contorno claro separa superfícies e não comunica sozinho o estado de um campo. Controles usam `--color-border-strong` e foco de 3 px. Erros usam texto explícito e `role="alert"`; a pesquisa usa `aria-pressed` nas notas.

## Componentes e layout

- Botões e inputs têm 42–44 px mínimos; notas da pesquisa têm 52 px de altura.
- Raios: 4 px para detalhes, 6 px para controles e 10 px para painéis. Badges usam formato cápsula por sua função curta.
- Tabelas têm cabeçalho neutro, linhas densas e rolagem própria em telas estreitas.
- O dashboard mostra três indicadores principais, uma faixa compacta de dados de apoio e painéis de gráficos. Os filtros não alteram a escala dos gráficos.
- A pesquisa pública usa largura máxima de 780 px, progresso visível e opções responsivas. A confirmação da nota é a ação dominante.
- A navegação lateral mantém a página atual marcada com `aria-current="page"`; no mobile vira uma faixa horizontal com rolagem própria.
- Ícones lineares de 18 px e traço de 1,8 px foram adicionados à navegação para facilitar a busca visual; os labels permanecem visíveis e os SVGs são decorativos para leitores de tela. Ícones nativos continuam em calendário, seleção, arquivo e fechamento de modal. Setas de ordenação no editor permanecem com nomes acessíveis.

## Movimento

| Token | Valor | Aplicação |
| --- | --- | --- |
| `--duration-fast` | 140 ms | Hover e foco |
| `--duration-standard` | 210 ms | Mudanças de estado |
| `--duration-overlay` | 240 ms | Abertura e saída do modal |
| `--motion-offset` | 10 px | Deslocamento do modal |
| `--motion-scale` | 0,985 | Escala inicial e final |

O modal abre com opacidade crescente, deslocamento de 10 px e escala 0,985; fecha pelo caminho inverso, com `transform-origin: center`. O nó permanece montado durante os 240 ms de saída. Durante a saída, fica inerte e oculto da árvore acessível. O foco retorna ao acionador ao fechar; uma reabertura rápida cancela o timer de desmontagem. `prefers-reduced-motion: reduce` reduz animações e transições a 0,01 ms.

## Auditoria visual

Inspeção local em Firefox 159 headless, com Vite e API compilada conectados exclusivamente ao PostgreSQL descartável local. Foram capturados login, dashboard, setores, gestores, editor de formulário, Ouvidoria, turnos, auditoria, LGPD e avaliação pública. O dashboard foi medido em 360, 390, 768, 1024, 1366 e 1920 px; a pesquisa em 360, 390, 768 e 1024 px. Em cada captura, `document.documentElement.scrollWidth <= clientWidth`. Tabelas administrativas mantêm rolagem interna em larguras pequenas. Nenhuma chamada ao Supabase remoto foi usada.

Os testes automatizados verificam navegação protegida, indicação da página atual, saída e reabertura do modal, além dos contratos de serviços já cobertos pela suíte.
