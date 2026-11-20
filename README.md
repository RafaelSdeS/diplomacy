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

## Plano por fases

| Fase | Quando | Plano |
|---|---|---|
| 0 · Validação | dez/2026 a fev/2027 | [docs/fases/fase-0-validacao.md](docs/fases/fase-0-validacao.md) |
| 1 · Piloto de teste | mar a jun/2027 | [docs/fases/fase-1-piloto.md](docs/fases/fase-1-piloto.md) |
| 2 · Evento completo | jul/2027 até a edição de 2027 | [docs/fases/fase-2-evento.md](docs/fases/fase-2-evento.md) |
| 3 · Crescimento | depois da edição de 2027 | [docs/fases/fase-3-crescimento.md](docs/fases/fase-3-crescimento.md) |

Cada fase só começa quando a anterior passa no seu teste.

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
