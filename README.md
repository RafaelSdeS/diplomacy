# diplomacy

App web tudo em um para simulações da ONU (MUNs), começando pelo [UFRGSMUN](https://www.ufrgs.br/ufrgsmun/). Funciona no celular e no computador, sem instalar nada.

**No ar:** [diplomacy.rafesilvadesouza.workers.dev](https://diplomacy.rafesilvadesouza.workers.dev). Não há cadastro livre: as contas são criadas pela secretaria.

> **Status:** os passos 01 a 47 estão prontos (do 45, só a parte A), e o piloto está [publicado](https://diplomacy.rafesilvadesouza.workers.dev). Os comitês funcionam em português e em inglês; a secretaria, só em português. A etapa atual é a interface: o passo 47 (modais, fichas, menus de escolha, confirmação e desfazer, cabeçalho com ícones) está pronto; o passo 52 (testes rápidos) e os lotes 0 e 0b do passo 51 (ações em botões e modais, cabeçalho só com ícones, caderno de qualquer lugar, quem preside à vista, mensagens como conversas e a aba do DPO) também, assim como a presidência e a Agora sem rolagem (lotes 1 e 2); o próximo é a sessão de teste do piloto. A sessão de teste com pessoas, pelo roteiro em [docs/piloto.md](docs/piloto.md), vem depois; em seguida, o 45 parte B e o 48.

## O problema

Hoje uma simulação roda sobre ferramentas soltas: inscrição no Google Forms, guias no Drive, avisos e press no WhatsApp, Instagram e X, notas de crise em papel. As principais queixas:

- revisões que não acabam e debates que não chegam a lugar nenhum;
- documentos coletivos caóticos, com muita gente editando o mesmo arquivo;
- a equipe de crise perde notas quando todo mundo escreve ao mesmo tempo;
- nada fica de uma edição para a outra.

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

## Stack

| Peça | Piloto (grátis, poucos usuários) | Evento completo |
|---|---|---|
| Interface | SvelteKit em modo SPA, responsivo | Igual, mais PWA com cache completo |
| Hospedagem | Cloudflare Workers, só arquivos estáticos (grátis) | Igual |
| Backend | Supabase grátis, região São Paulo | Supabase Pro no mês do evento |
| Tempo real | Postgres Changes | Broadcast a partir do banco |
| Login | Google e e-mail com senha | Mais QR do crachá e link/código por e-mail |
| Idioma | Português | Português e inglês |

Detalhes e justificativas na seção 16 do plano.

## Plano de implementação

O app é construído em passos, cada um com o seu plano: o que construir, banco, telas para celular e notebook, testes e quando está pronto. O índice, as convenções de código, a definição de pronto, a estratégia de testes e a aparência do app estão em [docs/implementacao/](docs/implementacao/README.md).

Cada passo traz os testes que provam que ele funciona. Um passo só termina quando esses testes, e os de todos os passos anteriores, passam no CI.

| Passo | Entrega |
|---|---|
| **Piloto** (grátis, poucos usuários, dados fictícios) | |
| [01](docs/implementacao/01-fundacao.md) | Projeto, deploy, CI e layout responsivo |
| [02](docs/implementacao/02-banco-e-permissoes.md) | Banco base, papéis, regras de acesso e dados fictícios |
| [03](docs/implementacao/03-login-e-papeis.md) | Login e navegação por função |
| [04](docs/implementacao/04-agora-e-informacoes.md) | Tela "Agora", perfis, comitê, cronograma e avisos |
| [05](docs/implementacao/05-regras-de-procedimento.md) | Regras de procedimento como configuração |
| [06](docs/implementacao/06-sessao-e-telao.md) | Sessão e telão |
| [07](docs/implementacao/07-agenda-e-votacao.md) | Plenária de abertura, agenda e votação |
| [08](docs/implementacao/08-crise.md) | Crise |
| [09](docs/implementacao/09-editor-de-resolucoes.md) | Editor de resoluções |
| [10](docs/implementacao/10-dpo-e-documentos-em-pdf.md) | DPO, cartas e documentos em PDF |
| [11](docs/implementacao/11-press.md) | Press |
| [12](docs/implementacao/12-teste-do-piloto.md) | Teste do piloto |
| **Evento** (escala do UFRGSMUN) | |
| [13](docs/implementacao/13-escala-e-tempo-real.md) | Escala e tempo real |
| [14](docs/implementacao/14-login-completo-e-secretaria.md) | Login completo e secretaria |
| [15](docs/implementacao/15-offline-e-pwa.md) | Offline, PWA e notificações |
| [16](docs/implementacao/16-procedimento-completo.md) | Procedimento completo |
| [17](docs/implementacao/17-comunicacao-completa.md) | Comunicação completa |
| [18](docs/implementacao/18-idiomas.md) | Idiomas |
| [19](docs/implementacao/19-lgpd-e-pos-evento.md) | LGPD e pós-evento |
| **Melhorias depois da revisão** ([PDF](docs/melhorias-pos-revisao.pdf)) | |
| [20](docs/implementacao/20-proposta-e-demonstracao.md) | Proposta de valor e evento de demonstração |
| [21](docs/implementacao/21-chamada-e-sessao.md) | Chamada, abertura e encerramento de sessão |
| [22](docs/implementacao/22-agenda.md) | Agenda antes das resoluções |
| [23](docs/implementacao/23-lista-de-votos.md) | Lista de votos |
| [24](docs/implementacao/24-bloqueio-de-bilhetes.md) | Bloqueio de bilhetes entre delegações |
| [25](docs/implementacao/25-trilha.md) | Trilha de navegação |
| [26](docs/implementacao/26-pagina-da-delegacao.md) | Página da delegação |
| [27](docs/implementacao/27-diplomacy-nome-e-logo.md) | Nome Diplomacy e logo |
| [28](docs/implementacao/28-dois-cronometros.md) | Dois cronômetros |
| [29](docs/implementacao/29-mocoes-em-duas-etapas.md) | Pontos e moções em duas etapas |
| [30](docs/implementacao/30-debate-rapido.md) | Debate rápido |
| [31](docs/implementacao/31-bureau-representa-delegacao.md) | Bureau no lugar de uma delegação ausente |
| [32](docs/implementacao/32-agora-por-papel.md) | Aba Agora e menu por papel |
| [33](docs/implementacao/33-numeros-clicaveis.md) | Números clicáveis |
| [34](docs/implementacao/34-caderno-da-delegacao.md) | Caderno da delegação |
| [35](docs/implementacao/35-crise-com-prazo.md) | Crise com prazo |
| [36](docs/implementacao/36-press-nas-redes.md) | Press nas redes |
| [37](docs/implementacao/37-visual-geral.md) | Visual geral |
| [38](docs/implementacao/38-melhorias-de-uso.md) | Melhorias de uso |
| [39](docs/implementacao/39-testes-e-ci-rapidos.md) | Testes e CI mais rápidos |
| [40](docs/implementacao/40-menos-dados-no-celular.md) | Menos dados no celular |
| [41](docs/implementacao/41-pendencias.md) | Pendências |
| [42](docs/implementacao/42-estilo-chancelaria.md) | Estilo chancelaria |
| [43](docs/implementacao/43-facil-de-achar-e-voltar.md) | Fácil de achar e de voltar |
| **Planos posteriores** ([ordem](docs/ordem-de-prioridade.pdf)) | |
| [44](docs/implementacao/44-seguranca-dos-dados.md) | Segurança dos dados e das sessões |
| [45](docs/implementacao/45-coletiva-oral.md) | Coletiva de imprensa como fluxo oral |
| [46](docs/implementacao/46-agora-e-sessao-unificadas.md) | Agora operacional e sessão unificada |
| [47](docs/implementacao/47-modais-saida-e-icones.md) | Modais, menus de escolha, saída com confirmação e ícones |
| [48](docs/implementacao/48-demonstracao-online.md) | Demonstração online com acesso por papel |
| [49](docs/implementacao/49-edicao-por-clausula.md) | Edição colaborativa por cláusula |
| [50](docs/implementacao/50-preparacao-da-fala.md) | Preparação de discursos durante o debate |
| [51](docs/implementacao/51-melhorias-gerais-de-interface.md) | Melhorias gerais de interface |
| [52](docs/implementacao/52-testes-do-dia-a-dia.md) | Testes rápidos no dia a dia |
| [53](docs/implementacao/53-dpo-como-arquivo.md) | DPO como arquivo público |

As fases do projeto (validação, piloto, evento e crescimento) e o calendário até a edição de 2027 estão na seção 17 do plano completo.

## Documentos

- [Plano completo (PDF)](docs/plano-do-app.pdf): problema, módulos, regras, arquitetura, riscos e calendário.
- [Plano da coletiva de imprensa](docs/coletiva-de-imprensa.md): dinâmica oral, chamada de delegação, pauta, telão e produção posterior.
- [Plano de segurança online](docs/seguranca-online.md): revisão de riscos, RLS, cache offline, Storage, demo e incidente.
- [Melhorias de interface (PDF)](docs/melhorias-interface.pdf): fonte única das regras de interface; [melhorias.txt](docs/melhorias.txt) é só o texto de partida.
- [Plano de interface oficial e demonstração](docs/interface-e-demonstracao.md): catálogo de modais, ícones do cabeçalho, ambiente público fictício e roteiro.
- [Ordem de prioridade dos planos](docs/ordem-de-prioridade.pdf): consolidação e sequência recomendada para o trabalho futuro.
- Protótipos visuais: [coletiva de imprensa](docs/prototipos-coletiva.pdf), [interface e demonstração](docs/prototipos-interface-demonstracao.pdf) e [segurança ao sair](docs/prototipos-seguranca.pdf).
- Propostas visuais adicionais: [edição colaborativa](docs/prototipos-editor-documentos.pdf), [preparação de fala](docs/prototipos-preparacao-fala.pdf), [Agora e sessão](docs/prototipos-agora-sessao.pdf) e [melhorias gerais de interface](docs/prototipos-melhorias-interface.pdf).
- Imagens dos protótipos em [docs/imagens/](docs/imagens/). O HTML-fonte está em [docs/prototipos-telas.html](docs/prototipos-telas.html).
- [Plano da edição colaborativa de documentos (PDF)](docs/plano-editor-documentos.pdf): edição em tempo real, propostas por cláusula, rodadas curtas, conflitos e fusão de working papers.
- [Plano de preparação de discursos durante o debate (PDF)](docs/plano-preparacao-discursos.pdf): notas rápidas, contexto das delegações, rascunho por blocos e ensaio da fala.
- [Por que cada um usaria o Diplomacy](docs/proposta-de-valor.md): a frase de valor de cada papel e o roteiro do "mock and rules".
- [Melhorias depois da revisão (PDF)](docs/melhorias-pos-revisao.pdf): as observações da revisão, priorizadas por impacto e esforço; fonte em [HTML](docs/melhorias-pos-revisao.html), gerada do mesmo jeito.
- [Fonte do plano (HTML)](docs/plano-do-app.html). Para gerar o PDF de novo:

  ```sh
  chromium --headless --no-pdf-header-footer --print-to-pdf=docs/plano-do-app.pdf docs/plano-do-app.html
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

**Versão online** (<https://diplomacy.rafesilvadesouza.workers.dev>): o CSNU-T do evento UFRGSMUN tem contas de teste, `delegado-eua`, `delegado-china`, `delegado-franca`, `delegado-russia`, `delegado-reino-unido`, `press-csnu` e `crise-csnu`, todas `@exemplo.test`, além de `delegado-brasil`. A mesa é a conta do administrador. A senha não fica no repositório, que é público: está em `docs/contas-online.local.md`, um arquivo só local (`*.local.md` fica fora do git), que também explica como criar e apagar contas. O seed e a demonstração recusam a produção de propósito.

Para ver uma sessão funcionando: entre como `mesa01`, abra o Painel e clique em Abrir sessão; na Chamada, sorteie o rodízio, marque as presenças e conclua (volta ao Painel). No Painel, conduza a plenária de abertura (briefing, discursos e moção do tópico no topo); em outra janela, um delegado propõe o tópico e vota. Depois da plenária, preside a delegação sorteada. O telão fica em `/telao/CSNU-T`.

Para parar o Supabase local: `npx supabase stop`. Depois de criar uma migração, rode `npm run db:resetar` (recria o banco), `npm run seed` e `npm run db:tipos`.

**Capturas de referência:** os testes de aparência comparam telas com capturas geradas no CI, sempre no mesmo contêiner. No seu computador eles são pulados. Para gerar ou atualizar as capturas:

1. Em Actions, abra o workflow "CI", clique em "Run workflow" na branch desejada e marque "Gerar novas capturas".
2. Baixe o artefato `capturas`.
3. Coloque o conteúdo em `tests/capturas/` e faça o commit.

**Publicar:** o passo a passo do Supabase na nuvem, do Cloudflare e do login com Google está em [docs/publicar.md](docs/publicar.md).

## Privacidade

Este repositório é público e não guarda dados pessoais. O piloto usa só dados fictícios. No evento, a organização do UFRGSMUN é a controladora dos dados, e o app segue a LGPD: coleta mínima, aviso de privacidade, direitos do titular e exclusão dos dados no prazo combinado.

## Licença

[MIT](LICENSE)
