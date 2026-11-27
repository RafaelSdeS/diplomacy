# Diplomacy: guia para o Claude Code

App tudo em um para simulações da ONU (piloto: UFRGSMUN). SvelteKit com Svelte 5 (runes), Supabase (Postgres com RLS, RPCs e tempo real) e Cloudflare Workers. O README explica o produto e a arquitetura; `docs/implementacao/` tem cada passo.

## Idioma e textos

- Código, comentários, telas e docs em português.
- Todo texto de tela passa por `t('…')`, e o inglês fica em `src/lib/i18n-en.ts`; `src/lib/i18n.test.ts` cobra a tradução de cada texto novo. `npm run textos` (roda no CI) recusa texto fixo nas telas.

## Comandos

- Node 24: o padrão da máquina é o 20. Use `source ~/.nvm/nvm.sh && nvm use 24` ou ponha `~/.nvm/versions/node/v24.22.3/bin` no `PATH`.
- `npm run check` (tipos), `npx vitest run <arquivo>` (unidade), `npx playwright test <spec>` (ponta a ponta) e `npm run capturas` (capturas de referência no contêiner do CI).
- O projeto não tem Prettier nem ESLint. Não rode `npx prettier`: ele baixa um sem configuração e reformata o arquivo inteiro.
- Migração nova: `npm run db:resetar`, `npm run seed` e `npm run db:tipos`.
- Para parar um preview: `pkill -f "[v]ite preview"`. Com `pkill -f "vite preview"`, o próprio shell entra no padrão e morre.

## Testes

- Por mudança, rode só os testes da tela mexida, e a suíte completa uma vez antes do commit. Testes longos vão em segundo plano.
- Teste de ponta a ponta que muda o estado de um comitê usa uma cópia isolada (`isolado('NN')` em `scripts/delegacoes.ts`) e acrescenta a entrada em `ISOLADOS`. A exceção é o `tests/22-agenda.spec.ts`, que usa o CE-T de verdade.
- Antes da suíte, confira `docker ps -a | grep edge_runtime` (a função do crachá precisa dele) e `free -h`: a máquina tem 15 GiB, e o config usa 4 processos.
- No CI, os testes rodam no contêiner do Playwright, sem Docker. O workflow passa as chaves do Supabase local pelo ambiente (`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`), e o `scripts/admin.ts` lê essas chaves de lá. Não dependa de `npx supabase` dentro de um teste.
- Contas locais do seed: `@exemplo.test`, com a senha `senha-de-teste`.

## Interface

- Toda ação é um botão com fundo e ícone, nunca com cara de link. Criar algo abre um modal no centro (`src/lib/ui/Modal.svelte`). Ação sem volta passa por `Confirmar`.
- Na agenda, no working paper e no projeto, o texto fica limpo, o resumo fica ao lado, e cada item abre o painel à direita (`<Modal lateral>`), com os verbos e as propostas (passo 64).
- Toda ação tem dica (`src/lib/dica.ts`): com o mouse e no foco do teclado (`:focus-visible`), não no foco por clique. A ação indisponível diz por quê, e o que o banco recusaria nem aparece como ação (ex.: andamento sem sessão). A ação principal de cada tela fica visível sem rolar, e deve ser fácil achar as coisas e voltar de onde se veio.

## Passos e documentação

Cada mudança é um passo `NN`, com:

- `docs/implementacao/NN-*.md`, mais a linha no índice `docs/implementacao/README.md` e na tabela do README;
- a linha em `docs/ordem-de-prioridade.md` e no `.html` (escrito à mão);
- o PDF gerado de novo com `chromium-browser --headless --no-sandbox --no-pdf-header-footer --print-to-pdf=docs/ordem-de-prioridade.pdf docs/ordem-de-prioridade.html`.

## Produção

- Cada push na `main` publica o app no Cloudflare (<https://diplomacy.rafesilvadesouza.workers.dev>). As migrações vão para a nuvem à mão, **antes** do push (`docs/publicar.md`).
- No Supabase de produção, um comando que escreve pede `--yes`. O seed e a demonstração recusam a produção de propósito.
- As contas de teste online e a senha delas ficam em `docs/contas-online.local.md`, que só existe neste computador (`*.local.md` fica fora do git, e o repositório é público).
