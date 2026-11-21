# Plano de implementação

Ordem dos passos para construir o app. Os passos 01 a 12 formam o **piloto**: planos gratuitos, poucos usuários e dados fictícios. Os passos 13 a 19 levam o app à **escala do evento**. Os passos 20 a 38 são as **melhorias depois da revisão** do app, explicadas e priorizadas em [melhorias-pos-revisao.pdf](../melhorias-pos-revisao.pdf). Os passos 39 a 41 deixam o desenvolvimento mais rápido, o app mais leve na internet móvel e fecham as pendências.

Cada passo só começa quando os passos de que ele depende estão prontos. As regras de procedimento que o app segue estão resumidas em [regras-de-procedimento.md](../regras-de-procedimento.md).

| Passo | Entrega | Depende de |
|---|---|---|
| **Piloto** | | |
| [01](01-fundacao.md) | Projeto, deploy, CI e layout responsivo | — |
| [02](02-banco-e-permissoes.md) | Banco base, papéis, regras de acesso e dados fictícios | 01 |
| [03](03-login-e-papeis.md) | Login (Google, e-mail e senha) e navegação por função | 02 |
| [04](04-agora-e-informacoes.md) | Tela "Agora", perfis, comitê, cronograma e avisos | 03 |
| [05](05-regras-de-procedimento.md) | Regras de procedimento como configuração | 02 |
| [06](06-sessao-e-telao.md) | Sessão: chamada, presidência, pedidos de fala, cronômetro e telão | 04, 05 |
| [07](07-agenda-e-votacao.md) | Plenária de abertura, agenda e votação com resultado automático | 06 |
| [08](08-crise.md) | Notas de crise, fila da equipe e atualizações | 06 |
| [09](09-editor-de-resolucoes.md) | Blocos, cláusulas, redator, rodadas e projeto de resolução | 07 |
| [10](10-dpo-e-documentos-em-pdf.md) | DPO, cartas e modelos de impressão | 09 |
| [11](11-press.md) | Press: publicação, capa, plantão e moderação | 06 |
| [12](12-teste-do-piloto.md) | Qualidade e sessão de teste com usuários | 01 a 11 |
| **Evento** | | |
| [13](13-escala-e-tempo-real.md) | Broadcast, plano Pro e teste de carga | 12 |
| [14](14-login-completo-e-secretaria.md) | Login pelo crachá e por e-mail, importação, check-in e certificados | 12 |
| [15](15-offline-e-pwa.md) | Offline, PWA e notificações | 13 |
| [16](16-procedimento-completo.md) | CSNU, unanimidade, votação nominal, emendas e tecnologia restrita | 12 |
| [17](17-comunicacao-completa.md) | Bilhetes, entrevistas, coletiva, edição do dia e redes | 11, 15 |
| [18](18-idiomas.md) | Português e inglês | 12 |
| [19](19-lgpd-e-pos-evento.md) | Direitos do titular, exclusão de dados e arquivo da edição | 14 |
| **Melhorias depois da revisão** | | |
| [20](20-proposta-e-demonstracao.md) | Proposta de valor e evento de demonstração (6 comitês, 147 delegações) | — |
| [21](21-chamada-e-sessao.md) | Chamada, abertura, encerramento e chegada atrasada | 20 |
| [22](22-agenda.md) | Agenda: retirar e editar a adoção; agenda antes das resoluções | 20 |
| [23](23-lista-de-votos.md) | Lista de quem votou a favor e contra, e histórico | 21 |
| [24](24-bloqueio-de-bilhetes.md) | Bloqueio de bilhetes entre delegações | 20 |
| [25](25-trilha.md) | Trilha de navegação (voltar) | 20 |
| [26](26-pagina-da-delegacao.md) | Página da delegação (clicar no país) | 23, 24 |
| [27](27-diplomacy-nome-e-logo.md) | Nome Diplomacy e logo | 25 |
| [28](28-dois-cronometros.md) | Dois cronômetros: fala e debate | 21 |
| [29](29-mocoes-em-duas-etapas.md) | Pontos e moções: bureau, depois presidência | 28 |
| [30](30-debate-rapido.md) | Debate rápido: "há pontos ou moções?" e lista curta | 28, 29 |
| [31](31-bureau-representa-delegacao.md) | Bureau no lugar de uma delegação ausente | 29 |
| [32](32-agora-por-papel.md) | Aba Agora e menu por papel | 26, 28, 29, 30 |
| [33](33-numeros-clicaveis.md) | Números e telas clicáveis | 26, 32 |
| [34](34-caderno-da-delegacao.md) | Caderno da delegação, com compartilhamento | 26, 32 |
| [35](35-crise-com-prazo.md) | Crise com prazo | 31, 32 |
| [36](36-press-nas-redes.md) | Press: WhatsApp, X e Instagram | 27 |
| [37](37-visual-geral.md) | Visual geral | 20 a 36 |
| [38](38-melhorias-de-uso.md) | Melhorias de uso (cada uma pode entrar antes, no passo da mesma tela) | 21 |
| **Desenvolvimento e leveza** | | |
| [39](39-testes-e-ci-rapidos.md) | Testes e CI mais rápidos: um comitê por arquivo, capturas no contêiner, CI em paralelo | 38 |
| [40](40-menos-dados-no-celular.md) | Menos dados no celular: service worker, tempo real e imagens | 39 |
| [41](41-pendencias.md) | Pendências: logo, ícones do cronograma, filtro dos próximos e capturas da crise | 39 |

## Melhorias depois da revisão

**Antes de começar:** as notificações push (bônus do passo 15) e os bilhetes mais rápidos já estão na `main` (13db7fb). As migrações dos passos novos começam em `20261208090000`. Regras de acesso de tabelas lidas em lista usam os conjuntos de `20261207100000_mensagens_rapidas.sql` (`minhas_delegacoes()`, `meus_comites()`), calculados uma vez por consulta, em vez de uma função chamada linha a linha.

**Decisões tomadas em 20/11/2026** (cada passo repete as suas):

- "Presente" e "presente e votando" são a mesma coisa: a chamada tem dois estados (passo 21).
- A agenda é sempre debatida e adotada antes das resoluções; o banco impede o projeto antes da adoção (passo 22).
- A delegação bloqueada fica sabendo do bloqueio de bilhetes (passo 24).
- Listas plausíveis para os 6 comitês da demonstração (passo 20).
- O logo é proposto no passo 27 (três opções em SVG).
- Pontos e moções passam pelo bureau e só depois a presidência concede (passo 29).
- O limite do informal-informal é de 45 minutos somados em cada sessão (passo 28).
- O bureau assume a delegação de quem faltou, com o mínimo de regras (passo 31).
- O caderno pode ser compartilhado com as delegações escolhidas (passo 34).

**Fora do plano por enquanto** (itens 24 a 26 do documento): edição simultânea do mesmo texto (o editor por cláusula cobre posições e comentários); configuração para outros eventos (a base existe; esperar um segundo evento); habilidades especiais para delegações (não recomendado: a equipe de crise julga o realismo das diretivas de cada país).

## Convenções

**Stack:** SvelteKit 3 com Svelte 5, em modo SPA (`adapter-static`), TypeScript, Supabase (Postgres, Auth, Realtime e Storage) e Cloudflare Pages. Node 24 (`.nvmrc`).

**Estrutura de pastas:**

```
src/
  routes/              uma pasta por tela
  lib/
    supabase.ts        cliente único do Supabase
    database.types.ts  tipos gerados a partir do banco
    tempo-real.ts      todas as assinaturas de tempo real
    regras/            leitura e exibição das regras de procedimento
    impressao/         modelos de impressão (DPO, resolução, carta)
    ui/                componentes com comportamento (o visual base são classes em src/app.css)
supabase/
  migrations/          uma migração por mudança no banco
  tests/               testes pgTAP (regras de acesso e funções)
scripts/
  seed.ts              dados fictícios (só local e projeto de teste)
  tamanho.js           limite de 300 KB
tests/                 testes de ponta a ponta (Playwright)
  capturas/            capturas de referência, geradas no CI
```

**Regras de código:**

- Nomes do domínio em português, sem acento: `comite`, `delegacao`, `nota_crise`.
- Regras de negócio ficam no banco (restrições, funções e regras de acesso por linha). A interface só mostra.
- Toda tabela tem regras de acesso por linha (RLS). Funções `security definer` só para ações que precisam de checagem extra, como assumir uma nota ou votar.
- CSS próprio com variáveis e estilos por componente, sem framework de CSS.
- Nenhum dado pessoal real no repositório. As seeds são fictícias.
- Commits pequenos direto na `main`. Um passo pode virar vários commits.

## Definição de pronto (vale para todo passo)

- [ ] Funciona num celular de 360 × 740 e num notebook de 1366 × 768; telas de telão também em 1920 × 1080.
- [ ] Acessível (WCAG 2.2 AA): contraste, foco visível, rótulos nos controles e nada indicado só por cor.
- [ ] Tabelas novas têm regras de acesso testadas com pgTAP.
- [ ] Os testes listados no passo foram escritos junto com o código e passam no CI, junto com os de todos os passos anteriores.
- [ ] A primeira abertura continua abaixo de 300 KB.
- [ ] Migração versionada e tipos do banco regenerados.
- [ ] Segue a aparência definida abaixo: leve, profissional, diplomática, limpa e com cara de oficial.

## Testes

Cada passo tem uma seção "Testes" com os testes que provam que ele funciona e os arquivos onde eles ficam. Um passo só termina quando esses testes, e os de todos os passos anteriores, passam no CI.

### Camadas

| Camada | Ferramenta | O que garante | Onde fica |
|---|---|---|---|
| Banco | pgTAP (`supabase test db`) | Regras de acesso, funções e regras de negócio | `supabase/tests/NN-nome.test.sql` |
| Unidade | Vitest (a partir do passo 04) | Funções puras: cálculos, formatação e validações | Ao lado do código, `*.test.ts` |
| Ponta a ponta | Playwright, nas três telas | Fluxos completos como o usuário faz, inclusive tempo real com dois navegadores | `tests/NN-nome.spec.ts` |
| Acessibilidade | axe dentro do Playwright | Erros de acessibilidade em cada rota | Junto dos testes de ponta a ponta |
| Aparência | Capturas de tela de referência do Playwright, sempre no mesmo contêiner (`npm run capturas` ou CI) | Mudanças de layout sem querer | `tests/capturas/` |
| Tamanho | Script no CI | Primeira abertura abaixo de 300 KB | `scripts/tamanho.js` |
| Manual | Lista no próprio passo | O que não dá para automatizar: celulares reais, leitor de tela, login do Google, projetor | Seção "Testes" do passo |

### Testes que valem para o projeto inteiro

- **Toda tabela tem regras de acesso:** um teste do banco falha se alguma tabela do esquema `public` estiver sem RLS ou sem nenhuma regra (consulta `pg_tables` e `pg_policies`).
- **O banco sobe do zero:** o CI roda `supabase db reset` e o seed antes dos testes, então uma migração quebrada falha na hora.
- **Tipos em dia:** o CI gera os tipos do banco e falha se eles forem diferentes dos versionados.
- **Checagem de tipos** com `svelte-check`.
- **Privacidade:** os testes do tipo "um não vê o do outro" nunca são apagados, só ampliados.

### Como os testes rodam

- O trabalho vai direto para a `main`, porque há uma pessoa só no projeto. O CI roda a cada push que não seja só de documentação, em três frentes paralelas (passo 39), e um push novo cancela o anterior.
- Um passo só é dado como pronto com o CI verde. O push não espera o CI; o que falhar lá se conserta em seguida.
- Antes de cada commit: `npm run rapido` (tipos, textos e unidade). Durante o passo: `npx playwright test tests/NN-*.spec.ts`. A suíte inteira roda em paralelo no computador com `npx playwright test`.
- **Cada arquivo de ponta a ponta que mexe na sessão, na crise ou nos documentos de um comitê usa uma cópia só dele** (`isolado('NN')` em `scripts/delegacoes.ts`, criada pelo seed). Os outros arquivos só leem os comitês de sempre. Um teste de um arquivo serial monta as próprias condições, porque uma nova tentativa recomeça no meio do arquivo.
- **Capturas:** comparadas só no contêiner do Playwright (`CAPTURAS=1`), o mesmo no CI e no `npm run capturas`, que as regrava no computador. Confira as imagens no `git diff` antes do commit.
- Testes de tempo real usam dois navegadores (dois contextos do Playwright) e esperam a atualização chegar.
- Testes que dependem de horário usam o relógio controlado do Playwright (`page.clock`).
- Os dados vêm do seed fictício. No CI o banco começa do zero; no computador ele é reaproveitado entre execuções (`npm run db:resetar && npm run seed` volta ao estado do seed).

### Matriz por passo

| Passo | Banco | Unidade | Ponta a ponta | Manual |
|---|---|---|---|---|
| 01 | — | — | sim | sim |
| 02 | sim | — | — | — |
| 03 | sim | — | sim | sim |
| 04 | sim | sim | sim | — |
| 05 | sim | sim | sim | — |
| 06 | sim | sim | sim | sim |
| 07 | sim | — | sim | — |
| 08 | sim | — | sim | — |
| 09 | sim | sim | sim | — |
| 10 | sim | sim | sim | sim |
| 11 | sim | sim | sim | — |
| 12 | todos os anteriores | todos os anteriores | fluxo completo | sim |
| 13 | sim | — | sim | carga |
| 14 | sim | sim | sim | sim |
| 15 | — | sim | sim | sim |
| 16 | sim | — | sim | — |
| 17 | sim | sim | sim | sim |
| 18 | — | checagem no CI | sim | — |
| 19 | sim | — | sim | sim |
| 20 | — | sim | — (CI roda a demonstração) | sim |
| 21 | sim | sim | sim | — |
| 22 | sim | — | sim | — |
| 23 | — | sim | sim | — |
| 24 | sim | — | sim | — |
| 25 | — | sim | sim | — |
| 26 | sim | — | sim | — |
| 27 | — | sim | sim | sim |
| 28 | sim | sim | sim | — |
| 29 | sim | — | sim | — |
| 30 | sim | sim | sim | — |
| 31 | sim | — | sim | — |
| 32 | — | sim | sim | — |
| 33 | — | — | sim | — |
| 34 | sim | sim | sim | — |
| 35 | sim | — | sim | — |
| 36 | — | sim | sim | sim |
| 37 | — | — | capturas e axe | sim |
| 38 | sim | sim | sim | sim |
| 39 | — | — | a suíte inteira, em paralelo | — |
| 40 | — | sim | sim (consumo) | sim (3G e cabeçalhos) |
| 41 | sim | — | sim | — |

## Aparência

Leve, profissional, diplomática, limpa e com cara de oficial. A referência é um documento oficial bem diagramado, não um app de rede social. Combina com a identidade do UFRGSMUN, que usa azul-marinho e dourado.

- **Cara de oficial:**
  - cabeçalhos no estilo papel timbrado (logo do evento, nome do comitê e uma linha fina embaixo);
  - códigos de documento como `UFRGSMUN/CSNU/RES/3`;
  - rótulos curtos em versalete;
  - selos de situação no estilo carimbo ("APROVADA", "CONFIDENCIAL"), usados com moderação.

- **Cores:** fundo branco e cinzas muito claros, texto grafite e uma cor de destaque azul-marinho. Um dourado discreto aparece só em destaques especiais, como a presidência (o UFRGSMUN não tem premiação). As bandeiras são o único elemento muito colorido.
- **Cores de situação:** verde, vermelho e âmbar só para situação (voto, prazo, fila), sempre com ícone e texto.
- **Tipografia:** títulos e documentos com serifa (Source Serif 4, um único arquivo `woff2` reduzido aos caracteres latinos, servido pelo próprio app e contado no limite de 300 KB). A interface usa a fonte do sistema, que não precisa ser baixada.
- **Espaço e linhas:** bastante espaço em branco, linhas finas de 1 px em vez de sombras e cantos levemente arredondados (4 a 8 px).
- **Ícones:** traço fino, de um único conjunto (Lucide), só os usados.
- **Movimento:** só transições curtas (até 150 ms) e nenhuma animação decorativa. Respeita a opção de reduzir movimento.
- **Tom dos textos:** formal e simples, como "A palavra está com a delegação da França".
- **Tema escuro:** azul-marinho profundo, com o mesmo contraste.
- **Telão:** fundo claro e letras grandes por padrão, que funcionam melhor em salas iluminadas; tema escuro opcional.
- **Marca:** logo e cores do evento são configuráveis. O emblema da ONU nunca é usado.
