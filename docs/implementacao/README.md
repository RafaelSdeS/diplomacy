# Plano de implementação

Ordem dos passos para construir o app. Os passos 01 a 12 formam o **piloto**: planos gratuitos, poucos usuários e dados fictícios. Os passos 13 a 19 levam o app à **escala do evento**. Os passos 20 a 38 são as **melhorias depois da revisão** do app, explicadas e priorizadas em [melhorias-pos-revisao.pdf](../melhorias-pos-revisao.pdf). Os passos 39 a 41 deixam o desenvolvimento mais rápido, o app mais leve na internet móvel e fecham as pendências. O passo 42 aplica o estilo "chancelaria", escolhido entre os protótipos de `docs/estilos/`. O passo 43 deixa o app fácil de achar e de voltar. Os passos 44 a 51 vêm dos planos posteriores, em [ordem de prioridade](../ordem-de-prioridade.md): segurança, coletiva oral, sessão unificada, modais e ícones, demonstração online, edição por cláusula, preparação da fala e melhorias gerais. Os passos 49 e 50 só começam depois que o piloto disser que valem a pena.

**Ordem de execução dos passos 44 a 58:** 44, 45 (partes A e B), 46, 47, 52, os lotes 0 a 2 do 51, o 54, o 55 e o 56 (feitos); **a parte A do 57** (correções do uso de 24/11, países clicáveis, ordem do tópico e escrita de documentos); **sessão de teste do piloto (passo 12)**; 58, 53 e 48; 49, 50 e a parte B do 57 só com o que o piloto confirmar; os demais lotes do 51 (o 3, dos bilhetes, primeiro) aos poucos, o ano todo. A tabela abaixo segue a numeração, não essa sequência.

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
| **Aparência** | | |
| [42](42-estilo-chancelaria.md) | Estilo chancelaria: faixa marinho, fio dourado, cantos retos e Spectral | 39 (depois de 40 e 41) |
| [43](43-facil-de-achar-e-voltar.md) | Fácil de achar e de voltar: painel sem rolagem, país na faixa, menu por tarefa, Documentos, "Ir para…" e CSNU completo na demonstração | 42 |
| **Planos posteriores** (ordem em [ordem-de-prioridade.md](../ordem-de-prioridade.md)) | | |
| [44](44-seguranca-dos-dados.md) | Segurança dos dados e das sessões: cache offline por usuário, logout, RLS e Storage, revogação e incidente | 43 |
| [45](45-coletiva-oral.md) | Coletiva de imprensa como fluxo oral: texto da pergunta em tabela própria (parte A, pode ir antes), estados, chamada, telão da coletiva e conclusão (parte B) | 17, 44 |
| [46](46-agora-e-sessao-unificadas.md) | Agora operacional e sessão unificada: nota rápida e próxima fala sempre visíveis | 43 |
| [47](47-modais-saida-e-icones.md) | Modais, menus de escolha, saída com confirmação e ícones do cabeçalho: modal base, fichas de votação, ponto, moção e nota, modais de ação curta | 43, 44 |
| [48](48-demonstracao-online.md) | Demonstração online separada, com entrada por papel | 44, 45, 47 |
| [49](49-edicao-por-clausula.md) | Edição colaborativa por cláusula (depois da validação do piloto) | 09, 44 |
| [50](50-preparacao-da-fala.md) | Preparação de discursos durante o debate (depois da validação do piloto) | 34, 46 |
| [51](51-melhorias-gerais-de-interface.md) | Melhorias gerais de interface, por tela: ações em botões e modais, presidência e Agora sem rolagem (antes do piloto), troca de redator, estados, densidade e preferências | 47, 52 |
| [52](52-testes-do-dia-a-dia.md) | Testes rápidos no dia a dia: só os testes da tela mexida, sem build à toa, sem espera fixa, capturas de uma tela | 39 |
| [53](53-dpo-como-arquivo.md) | DPO como arquivo público: PDF por tópico, aberto ao comitê, sem aprovação | 10, 44, 47 |
| [54](54-correcoes-do-uso-de-24-11.md) | Correções do uso de 24/11: papéis somados (secretaria e mesa), modais no centro, sair do telão, lista de oradores junto de quem fala, página "Sobre" com créditos e LGPD | 51 |
| [55](55-paises-clicaveis.md) | Todo país abre a sua ficha, sempre com as minhas anotações sobre ele (da delegação ou da mesa) | 47, 51, 54 |
| [56](56-ordem-do-topico.md) | A ordem do tópico (agenda, working papers, projeto, resolução) à vista; aba Agenda sem sintaxe; aba Documentos pela ordem, sem rolar | 09, 22, 51, 54, 55 |
| [57](57-escrita-de-documentos.md) | Escrever documentos sem atrito: o documento formatado editado no lugar, assinaturas no topo, posição num toque e comentários na cláusula | 09, 47, 55, 56 |
| [58](58-documentos-da-mesa.md) | Documentos da mesa para o comitê: texto e PDF, publicados ao vivo, com o que mudou | 44, 47, 53, 56 |

## Melhorias depois da revisão

**Antes de começar:** as notificações push (bônus do passo 15) e os bilhetes mais rápidos já estão na `main` (13db7fb). As migrações dos passos 20 a 43 começaram em `20261208090000` e a última é `20261218090000_cronograma_tipo.sql`; as dos passos 44 em diante começam em `20261219090000`. Regras de acesso de tabelas lidas em lista usam os conjuntos de `20261207100000_mensagens_rapidas.sql` (`minhas_delegacoes()`, `meus_comites()`), calculados uma vez por consulta, em vez de uma função chamada linha a linha.

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

## Planos posteriores desta investigação

Viraram os passos 44 a 51 (os passos 52 a 58 vieram de pedidos depois de usar o app). Cada plano detalhado continua sendo a referência do que o passo constrói:

- [Plano de segurança online](../seguranca-online.md) → passo 44.
- [Plano da coletiva de imprensa](../coletiva-de-imprensa.md) → passo 45.
- [Melhorias de interface](../melhorias-interface.pdf) (fonte única das regras de interface) → passos 46 e 51.
- [Plano de interface oficial e demonstração](../interface-e-demonstracao.md) → passos 47 e 48.
- [Edição colaborativa](../plano-editor-documentos.pdf) → passo 49; [preparação de discursos](../plano-preparacao-discursos.pdf) → passo 50.
- [Ordem de prioridade consolidada](../ordem-de-prioridade.md): esforço, dependências e a sequência de trabalho.

## Convenções

**Stack:** SvelteKit 3 com Svelte 5, em modo SPA (`adapter-static`), TypeScript, Supabase (Postgres, Auth, Realtime e Storage) e Cloudflare Workers (só arquivos estáticos). Node 24 (`.nvmrc`).

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
- [ ] Textos novos em português e inglês (`npm run textos` passa).
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
| 42 | — | — | capturas e axe | sim |
| 43 | — | sim | sim (por tarefa) | sim |
| 44 | sim | sim | sim | sim |
| 45 | sim | — | sim | sim |
| 46 | — | sim | sim | sim |
| 47 | — | — | sim | — |
| 48 | — | — | sim | sim |
| 49 | sim | sim | sim | — |
| 50 | sim | sim | sim | sim |
| 51 | — | — | capturas e axe | sim |
| 54 | — | sim | sim | sim |
| 55 | sim (parte B) | sim | sim | sim |
| 56 | sim | sim | sim | sim |
| 57 | sim | sim | sim | sim |
| 58 | sim | sim | sim | sim |

## Aparência

Leve, profissional, diplomática, limpa e com cara de oficial. A referência é um documento oficial bem diagramado, não um app de rede social. Combina com a identidade do UFRGSMUN, que usa azul-marinho e dourado.

- **Cara de oficial:**
  - cabeçalhos no estilo papel timbrado (logo do evento, nome do comitê e uma linha fina embaixo);
  - códigos de documento como `UFRGSMUN/CSNU/RES/3`;
  - rótulos curtos em versalete;
  - selos de situação no estilo carimbo ("APROVADA", "CONFIDENCIAL"), usados com moderação.

- **Cores (estilo chancelaria, passo 42):**
  - fundo branco e cinzas neutros, texto quase preto e destaque azul-marinho;
  - a barra do app é uma faixa marinho profundo com um fio dourado embaixo;
  - o dourado aparece só no fio, no item atual do menu e na presidência (o UFRGSMUN não tem premiação);
  - o vermelho vivo só marca o que está ao vivo: "Com a palavra", sessão em andamento e plantão do telão;
  - as bandeiras são o único elemento muito colorido.
  - Protótipos de referência em `docs/estilos/b-*.html`.
- **Cores de situação:** verde, vermelho e âmbar só para situação (voto, prazo, fila), sempre com ícone e texto.
- **Tipografia:** títulos e documentos com serifa (Spectral, servida pelo próprio app). Os títulos usam o arquivo 600, contado no limite de 300 KB. O 400 e o itálico só são baixados nas telas de documento e na impressão. A interface usa a fonte do sistema, que não precisa ser baixada.
- **Espaço e linhas:** bastante espaço em branco, linhas finas de 1 px em vez de sombras e cantos retos (`--raio: 0`).
- **Ícones:** traço fino, de um único conjunto (Lucide, já instalado), importados um a um e só os usados. Só a lupa e o sino ficam sem texto; as demais ações trazem texto (passo 47).
- **Movimento:** só transições curtas (até 150 ms) e nenhuma animação decorativa. Respeita a opção de reduzir movimento.
- **Tom dos textos:** formal e simples, como "A palavra está com a delegação da França".
- **Tema escuro:** azul-marinho profundo, com o mesmo contraste.
- **Telão:** fundo marinho profundo, letras grandes e o fio dourado sob o topo; o plantão é uma faixa vermelha com texto branco.
- **Marca:** logo e cores do evento são configuráveis. O emblema da ONU nunca é usado.
