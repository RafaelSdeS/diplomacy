# diplomacy

App web tudo em um para simulações da ONU (MUNs), começando pelo [UFRGSMUN](https://www.ufrgs.br/ufrgsmun/). Funciona no celular e no computador, sem instalar nada.

**No ar:** [diplomacy.rafesilvadesouza.workers.dev](https://diplomacy.rafesilvadesouza.workers.dev). Não há cadastro livre: as contas são criadas pela secretaria.

> **Status (27/11/2026):** tudo o que está descrito aqui está pronto e no ar. Os comitês funcionam em português e em inglês; a secretaria, só em português. A próxima etapa é a sessão de teste do piloto, pelo roteiro em [docs/piloto.md](docs/piloto.md).

## O problema

Hoje uma simulação roda sobre ferramentas soltas: inscrição no Google Forms, guias no Drive, avisos e press no WhatsApp, Instagram e X, notas de crise em papel. As principais queixas:

- revisões que não acabam e debates que não chegam a lugar nenhum;
- documentos coletivos caóticos, com muita gente editando o mesmo arquivo;
- a equipe de crise perde notas quando todo mundo escreve ao mesmo tempo;
- nada fica de uma edição para a outra.

## Proposta de valor

A sessão anda mais rápido e sem contagem à mão, e cada pessoa vê só o que o seu papel pede.

| Para quem | O que muda |
|---|---|
| **Mesa** | Chamada, quórum, pontos e moções e votações num painel só. Os votos são contados na hora, e a ata de cada sessão sai pronta para imprimir. |
| **Presidência** (a delegação da vez) | O painel mostra quem levantou a placa, os relógios e só o que está em ordem. Quem nunca presidiu não erra o procedimento. |
| **Delegações** | Placa, pontos e moções, votos, bilhetes e documentos no celular, sem sair da cadeira. Cada uma sempre sabe quem preside e o que acontece agora. |
| **Documentos** | Um working paper por item da agenda, de toda a sala. Quem propõe já apoia, as outras marcam posição, quem preside decide, e o projeto sai montado com as assinaturas. |
| **Crise** | As notas chegam numa fila e são respondidas sem papel perdido. A crise vai ao telão com prazo e diz quem foi atingido. |
| **Press** | Matérias, entrevistas e coletiva no mesmo lugar, com o plantão no telão. |
| **Organização** | Inscritos, crachás com QR, check-in, avisos, certificados e o arquivo da edição, com a LGPD cuidada. |

Também conta:

- é um site: abre no navegador, sem instalar nada;
- funciona em português e inglês;
- com internet ruim, o que a pessoa envia fica guardado no aparelho e sai sozinho quando a conexão volta;
- roda em serviços com plano gratuito (Supabase e Cloudflare).

## O que o app faz

| Quem | O que faz no app |
|---|---|
| Delegado | Tela "Agora", DPO, agenda, pedido de fala pela placa digital, votação, blocos e resoluções, notas de crise. Preside a sessão quando é a vez da sua delegação. |
| Mesa (bureau) | Chamada e quórum, rodízio da presidência, aprovação de documentos, votações com as regras de cada comitê, telão. |
| Equipe de crise | Fila de notas que continua clara no pior caso, fichas dos personagens, atualizações para um ou vários comitês. |
| Press | Uma por comitê, cada uma de um veículo. Publica na hora, sem aprovação; o app leva a matéria ao telão, avisa as delegações citadas e prepara a imagem para as redes. |
| Secretaria | Importação das inscrições, crachás, check-in, certificados e o arquivo da edição. |

As regras de procedimento seguem as Rules of Procedure do UNOCT 2026, que valem para todos os comitês, completadas pelo Guia de Regras do UFRGSMUN, e são configuráveis por comitê (CSNU com veto, Conselho Europeu por unanimidade, OEA histórica com tecnologia restrita). Resumo em [docs/regras-de-procedimento.md](docs/regras-de-procedimento.md).

## Princípios

- Competir só onde WhatsApp e Drive não alcançam, e conviver com eles no resto.
- Toda conversa tem um lugar: uma cláusula, um bloco ou uma nota de crise.
- Um app só, que se adapta ao celular (delegados), ao notebook (mesa, crise, press) e ao projetor (telão).
- Leve e econômico em dados móveis; plano B em papel.
- Acessível (WCAG 2.2 AA) e privado por padrão (LGPD).
- Aparência leve, profissional, diplomática, limpa e com cara de oficial: base clara, azul-marinho, dourado discreto, serifa nos títulos e selos no estilo carimbo.

## Como é feito

Para quem quiser os detalhes técnicos. Os números são de 26/11/2026.

### Arquitetura

- **Sem servidor próprio.** A interface é uma SPA em [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5, TypeScript), gerada como arquivos estáticos (`adapter-static`) e servida pelo Cloudflare Workers (`wrangler.jsonc`: só arquivos, qualquer rota devolve o `index.html`).
- **A lógica fica no banco.** O app fala direto com o [Supabase](https://supabase.com) (Postgres, região São Paulo). Toda escrita passa por funções do banco (RPC, `security definer`), que conferem quem chama: mesa, presidência da sessão, redator do bloco, equipe de crise, press ou secretaria. A leitura é filtrada pela RLS, ligada em todas as tabelas.
- **Duas Edge Functions** (Deno, em `supabase/functions/`): `entrar-com-cracha` (o login pelo QR do crachá) e `enviar-push` (as notificações Web Push).

### Banco de dados

- **Postgres no Supabase:** cerca de 76 tabelas, 230 funções, 95 políticas de RLS e 84 gatilhos, criados por 51 migrações em `supabase/migrations/` (sempre novas, nunca editadas depois de publicadas).
- **Principais grupos de tabelas:** evento, comitês, delegações e participações (os papéis); sessão, presença, lista de oradores, pontos e moções, votações e votos; agenda e itens; documentos, cláusulas, propostas, posições, comentários e assinaturas; blocos e mensagens; crise (atualizações, incidentes e notas); press (veículos, notícias, entrevistas e coletiva); DPOs, cartas, caderno, avisos, cronograma, credenciais e registros.
- **Regras de procedimento por comitê:** os valores que mudam de um comitê para outro (mínimo de assinaturas, maiorias, veto, unanimidade, tecnologia restrita) ficam num JSON com padrões, em `regras_do_guia()`, e são conferidos no banco.
- **Privacidade:** dados pessoais mínimos, exclusão ao fim do evento (LGPD) e testes que conferem que nada vaza entre contas e comitês.

### Tempo real, dados móveis e sem internet

- **Tempo real:** os gatilhos do banco avisam pelo Realtime Broadcast do Supabase, em canais privados por comitê, documento, delegação, bloco, mesa e crise (`transmitir()` e `pode_ouvir()`). O aviso só diz o que mudou, e a tela relê só essas leituras (`src/lib/tempo-real.ts`), o que economiza dados no celular.
- **Sem internet:** um service worker (`src/service-worker/`) guarda os arquivos do app e, por conta, as últimas leituras (por até 12 horas). A caixa de saída (IndexedDB) guarda o que foi enviado sem rede e reenvia sozinha, sem duplicar: o id de cada mensagem, nota ou proposta nasce no aparelho.
- **Leveza:** a primeira abertura baixa no máximo 300 KB comprimidos (`npm run tamanho`); bandeiras e telas vêm só quando aparecem.

### Interface

- Svelte 5 com runes; componentes em `src/lib/ui/`; a lógica pura em `src/lib/*.ts`, com testes de unidade ao lado.
- Ícones [Lucide](https://lucide.dev), bandeiras [flag-icons](https://flagicons.lipis.dev), fonte Spectral nos títulos, CSS próprio com variáveis de cor e tema escuro (`src/app.css`).
- Idiomas: português e inglês, com o dicionário em `src/lib/i18n-en.ts`; um teste confere que todo texto da tela e toda mensagem de erro do banco têm tradução.
- Ações em botões com ícone; criar algo abre um modal no centro. Na agenda, no working paper e no projeto, o texto fica limpo na largura toda, o resumo fica ao lado, e cada item ou cláusula abre um painel à direita com o que dá para fazer nele (passo 64).
- Acessibilidade (WCAG 2.2 AA): o axe roda nos testes de ponta a ponta, nos dois temas; toda ação tem dica ao passar o mouse e no foco do teclado (`src/lib/dica.ts`).

### Testes e CI

- **Banco:** pgTAP, 40 arquivos e cerca de 640 verificações (`supabase/tests/`).
- **Unidade:** Vitest, 34 arquivos e 140 testes (`src/lib/*.test.ts`).
- **Ponta a ponta:** Playwright, 54 arquivos e cerca de 290 testes, no celular (360 px), no notebook (1366 × 768) e no telão (1920 × 1080), com capturas de tela comparadas sempre no mesmo contêiner (`npm run capturas`).
- **CI:** GitHub Actions em três partes (rápido, banco e ponta a ponta), com o Supabase local de verdade.

### Estrutura do repositório

```text
src/
  routes/          as telas (Agora, comitê, sessão, documentos, crise, press, secretaria, telão...)
  lib/             lógica pura (regras, sessão, tempo real, idioma...) e os testes de unidade
  lib/ui/          componentes (modais, fichas, trilha do tópico, cronômetro, placa...)
  service-worker/  cache do app e das leituras, para abrir sem internet
supabase/
  migrations/      o banco inteiro: tabelas, RLS, funções e gatilhos
  tests/           testes do banco (pgTAP)
  functions/       Edge Functions (login pelo crachá, notificações)
tests/             testes de ponta a ponta (Playwright) e capturas de referência
scripts/           seed, evento de demonstração, carga, chaves de push e medidas
docs/              plano do app, passos de implementação, regras, piloto e publicação
```

## Desenvolvimento

Requer Node 24 (`nvm install 24 && nvm use`).

Também requer Docker, para o Supabase local.

```sh
npm install
npx playwright install chromium
cp .env.example .env # valores do Supabase local
npm run db:iniciar   # Supabase local (banco, autenticação e API)
npm run seed         # dados fictícios: contas @exemplo.test, senha "senha-de-teste"
npm run demo         # evento de demonstração: os 6 comitês, 147 delegações, contas demo.*@exemplo.test
npm run dev          # app em http://localhost:5173
npm run testar       # tipos, unidade, banco, build, tamanho e ponta a ponta
npm run testar:mudou # só os testes de ponta a ponta ligados ao que mudou (build só se preciso)
SEM_RESET=1 npm run capturas -- tests/06-sessao.spec.ts  # regrava as capturas de um arquivo
```

Contas do seed para entrar: `delegado01@exemplo.test` a `delegado16`, `mesa01`, `crise01`, `press01`, `secretaria01` e `semconvite` (sem convite), todas `@exemplo.test` com a senha `senha-de-teste`. No evento de demonstração (`npm run demo`), as contas seguem o padrão `demo.<sigla>.<nn>@exemplo.test` (delegação `nn` do comitê, em ordem; `01b` e `02b` são segundos delegados), `demo.<sigla>.mesa1`, `.press`, `.crise1`, mais `demo.secretaria` e `demo.diretoria-press`. O CSNU da demonstração tem conteúdo completo para testar: `demo.csnu.mesa1` (mesa), `demo.csnu.08` (Dinamarca, primeira presidência do sorteio), `demo.csnu.03` (França). Não há cadastro livre: as contas são criadas pelo seed ou pelo administrador, e os convites da secretaria definem o papel.

**Versão online** (<https://diplomacy.rafesilvadesouza.workers.dev>): o CSNU-T do evento UFRGSMUN tem contas de teste, `delegado-eua`, `delegado-china`, `delegado-franca`, `delegado-russia`, `delegado-reino-unido`, `mesa-csnu`, `press-csnu` e `crise-csnu`, todas `@exemplo.test`, além de `delegado-brasil`. O comitê tem conteúdo completo (sessões, documentos, mensagens, crise e press). A conta do administrador é mesa e secretaria. A senha não fica no repositório, que é público: está em `docs/contas-online.local.md`, um arquivo só local (`*.local.md` fica fora do git), que também explica como criar e apagar contas. O seed e a demonstração recusam a produção de propósito.

Para ver uma sessão funcionando: entre como `mesa01`, abra o Painel e clique em Abrir sessão; na Chamada, sorteie o rodízio, marque as presenças e conclua (volta ao Painel). No Painel, conduza a plenária de abertura (briefing, discursos e moção do tópico no topo); em outra janela, um delegado propõe o tópico e vota. Depois da plenária, preside a delegação sorteada. O telão fica em `/telao/CSNU-T`.

Para parar o Supabase local: `npx supabase stop`. Depois de criar uma migração, rode `npm run db:resetar` (recria o banco), `npm run seed` e `npm run db:tipos`.

**Capturas de referência:** os testes de aparência comparam telas com capturas geradas sempre no mesmo contêiner do Playwright, o do CI. Fora dele, esses testes são pulados. `npm run capturas` zera o banco local, roda o seed e a build e regrava no contêiner só as capturas que mudaram; confira as imagens no `git diff` antes do commit.

**Publicar:** o passo a passo do Supabase na nuvem, do Cloudflare e do login com Google está em [docs/publicar.md](docs/publicar.md).

## Privacidade

Este repositório é público e não guarda dados pessoais. O piloto usa só dados fictícios. No evento, a organização do UFRGSMUN é a controladora dos dados, e o app segue a LGPD: coleta mínima, aviso de privacidade, direitos do titular e exclusão dos dados no prazo combinado.

## Licença

[MIT](LICENSE)
