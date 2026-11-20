# Passo 04 · Tela "Agora", perfis, comitê, cronograma e avisos

**Parte de:** piloto
**Depende de:** 03
**Objetivo:** dar a cada pessoa uma tela inicial com o que importa naquele minuto, mais as informações do evento.

## Vitest

- [x] Primeiro passo com testes de unidade: Vitest configurado no próprio `vite.config.ts` (precisa do plugin do SvelteKit para achar o `$app/tsconfig`), `npm run test:unit` no `npm run testar` e no CI.

## Banco

Migração `supabase/migrations/20261121090000_informacoes.sql`:

- [x] `comite` ganha `topicos` e `guia_url` (só `https://`).
- [x] `pessoa` ganha `bio` (até 500 caracteres), `foto_path` e `avisos_vistos_em`.
- [x] `cronograma_item`: geral (sem comitê) ou de um comitê, com fim depois do início. Participantes veem o geral e o do próprio comitê; só a secretaria cria, altera e remove.
- [x] `aviso`: geral (só a secretaria) ou de um comitê (secretaria ou mesa dele). Ninguém publica em nome de outra pessoa; a secretaria e o autor removem. Está na publicação de tempo real.
- [x] `marcar_avisos_vistos()`: marca os avisos como vistos com o relógio do servidor (o do aparelho pode estar adiantado e esconder avisos novos).
- [x] Cada pessoa edita o próprio perfil.
- [x] Mudança na regra do passo 02: quem está num comitê vê as participações dele (quem é da mesa, quem representa cada delegação), como no evento real. Função nova `participa_do_comite`.
- [x] Bucket `fotos` no Storage: privado, até 200 KB, WebP ou JPEG. Cada pessoa envia e troca só a própria foto (`<id>/foto`); só quem pode ver a pessoa vê a foto.
- [x] O Supabase local agora sobe também o tempo real e o storage (`npm run db:iniciar`).

## Telas

| Rota | Celular | Notebook |
|---|---|---|
| `/` Agora | Cartões empilhados: acontecendo agora, depois, avisos (com os novos) e "você" | Cartões em duas colunas |
| `/cronograma` | Lista do dia com o item atual destacado (`aria-current="time"` e selo "Agora") | Igual, mais largo |
| `/avisos` | Lista com os novos marcados; formulário para quem pode publicar | Igual |
| `/comite/[sigla]` | Tópicos, guia, mesa e delegações com bandeira | Delegações em grade |
| `/perfil` | Participação, foto, nome e minibiografia | Igual |

- **Agora:** o relógio da tela anda sozinho, então o cartão "Acontecendo agora" vira na hora certa. Todos os horários aparecem no fuso do evento, qualquer que seja o do aparelho.
- **Menu:** Agora, Comitê (para quem tem comitê), Cronograma e Avisos, mais Participantes para a secretaria. O perfil fica no cabeçalho.
- **Avisos ao vivo:** o layout assina os avisos pelo tempo real (`src/lib/tempo-real.ts`, o único lugar com assinaturas, que vira Broadcast no passo 13).
- **Bandeiras:** `flag-icons` (MIT). Cada SVG vira um arquivo próprio no build, sem embutir no JavaScript (`assetsInlineLimit` no `vite.config.ts`), e só é baixado quando aparece.
- **Fotos:** reduzidas no aparelho antes do envio (até 512 px; WebP, ou JPEG nos navegadores que não geram WebP).
- **Guias:** link para fora; o PDF não é carregado com a tela.

## Tamanho

- [x] `scripts/tamanho.js` agora mede só a primeira abertura, a partir do manifesto do Vite: `index.html`, as entradas do SvelteKit, o layout raiz e a tela `/entrar`, com tudo o que importam (JS, CSS e a fonte). Somar o build inteiro deixou de fazer sentido com as 271 bandeiras. Hoje: 127 KB de 300 KB.

## Testes

Arquivos: `supabase/tests/04-informacoes.test.sql` (22 testes), `src/lib/cronograma.test.ts`, `src/lib/imagem.test.ts` (12 testes de unidade) e `tests/04-agora.spec.ts`.

- [x] pgTAP: um aviso de um comitê não aparece para quem é de outro comitê; o cronograma também.
- [x] pgTAP: só a secretaria mexe no cronograma e publica avisos gerais; a mesa publica avisos só do próprio comitê; ninguém publica em nome de outra pessoa.
- [x] pgTAP: cada pessoa edita só o próprio perfil e envia só a própria foto; quem é de outro evento não vê a foto.
- [x] pgTAP: `marcar_avisos_vistos` e a publicação de tempo real dos avisos.
- [x] Vitest: o que está acontecendo (começo incluído, fim excluído), o próximo item, o agrupamento por dia no fuso do evento e o formato das horas.
- [x] Vitest: a redução de imagem entrega no máximo 512 px, sem aumentar as pequenas.
- [x] Ponta a ponta: um aviso da secretaria chega ao delegado sem recarregar, e some quando é removido.
- [x] Ponta a ponta: a Agora mostra o item atual, o próximo e a participação (relógio congelado no dia do evento de teste).
- [x] Ponta a ponta: o cronograma agrupa por dia e destaca o item atual; a secretaria adiciona e remove um item.
- [x] Ponta a ponta: a página do comitê lista as 15 delegações com bandeira e nome, a mesa e os tópicos.
- [x] Ponta a ponta: o perfil salva a minibiografia e envia a foto.
- [x] Acessibilidade: axe sem erros na Agora, no comitê, no cronograma, nos avisos e no perfil, nos dois temas, para delegado e secretaria.
- [x] Reflow: nenhuma tela com login rola na horizontal com 320 px. Este teste pegou dois vazamentos reais, corrigidos no CSS: a navegação de baixo (agora os itens dividem a largura e o rótulo encurta) e o campo de foto do perfil.
- [x] WCAG 2.4.11: no celular, o que é rolado até a tela não fica atrás da navegação fixa (`scroll-padding-bottom`). O CI pegou isso antes do teste: com as fontes do runner, o botão "Salvar perfil" ficava atrás da navegação.

O relógio dos testes fica no passado (as datas do evento de teste no seed são de 2026): congelado depois do vencimento da sessão, o login seria renovado o tempo todo e cairia.

## Pronto quando

- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores: 66 do banco, 12 de unidade e 101 de ponta a ponta.
- [x] A Agora mostra a sessão atual, o próximo item e os avisos.
- [x] Um aviso novo chega sem recarregar a página.
- [x] As telas funcionam com 360 px e com 1366 px.
