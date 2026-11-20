# diplomacy

App web tudo em um para simulações da ONU (MUNs), começando pelo [UFRGSMUN](https://www.ufrgs.br/ufrgsmun/). Funciona no celular e no computador, sem instalar nada.

> **Status:** fase 0 (validação). Por enquanto o repositório só tem o planejamento; o código começa nesta fase.

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

As regras de procedimento vêm do Guia de Regras do UFRGSMUN e são configuráveis por comitê (CSNU com veto, Conselho Europeu por unanimidade, OEA histórica com tecnologia restrita).

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
| Hospedagem | Cloudflare Pages (grátis) | Igual |
| Backend | Supabase grátis, região São Paulo | Supabase Pro no mês do evento |
| Tempo real | Postgres Changes | Broadcast a partir do banco |
| Login | Google e e-mail com senha | Mais QR do crachá e link/código por e-mail |
| Idioma | Português | Português e inglês |

Detalhes e justificativas na seção 16 do plano.

## Plano de implementação

O app é construído em 19 passos, cada um com o seu plano: o que construir, banco, telas para celular e notebook, testes e quando está pronto. O índice, as convenções de código, a definição de pronto, a estratégia de testes e a aparência do app estão em [docs/implementacao/](docs/implementacao/README.md).

Cada passo traz os testes que provam que ele funciona. Um passo só termina quando esses testes, e os de todos os passos anteriores, passam no CI.

| Passo | Entrega |
|---|---|
| **Piloto** (grátis, poucos usuários, dados fictícios) | |
| [01](docs/implementacao/01-fundacao.md) | Projeto, deploy, CI e layout responsivo |
| [02](docs/implementacao/02-banco-e-permissoes.md) | Banco base, papéis, regras de acesso e dados fictícios |
| [03](docs/implementacao/03-login-e-papeis.md) | Login e navegação por função |
| [04](docs/implementacao/04-agora-e-informacoes.md) | Tela "Agora", perfis, comitê, cronograma e avisos |
| [05](docs/implementacao/05-regras-de-procedimento.md) | Regras do Guia de Regras como configuração |
| [06](docs/implementacao/06-sessao-e-telao.md) | Sessão e telão |
| [07](docs/implementacao/07-agenda-e-votacao.md) | Agenda e votação |
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

As fases do projeto (validação, piloto, evento e crescimento) e o calendário até a edição de 2027 estão na seção 17 do plano completo.

## Documentos

- [Plano completo (PDF)](docs/plano-do-app.pdf): problema, módulos, regras, arquitetura, riscos e calendário.
- [Fonte do plano (HTML)](docs/plano-do-app.html). Para gerar o PDF de novo:

  ```sh
  chromium --headless --no-pdf-header-footer --print-to-pdf=docs/plano-do-app.pdf docs/plano-do-app.html
  ```

## Privacidade

Este repositório é público e não guarda dados pessoais. O piloto usa só dados fictícios. No evento, a organização do UFRGSMUN é a controladora dos dados, e o app segue a LGPD: coleta mínima, aviso de privacidade, direitos do titular e exclusão dos dados no prazo combinado.

## Licença

[MIT](LICENSE)
