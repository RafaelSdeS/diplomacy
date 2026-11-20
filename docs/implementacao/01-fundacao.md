# Passo 01 · Fundação do projeto

**Parte de:** piloto
**Depende de:** nada
**Objetivo:** projeto rodando no computador e publicado, com CI, testes e um layout que já se adapta ao celular e ao notebook.

## O que construir

### Projeto

- [x] SvelteKit 3 com Svelte 5 e TypeScript, a partir do gerador oficial (`sv create`). No SvelteKit 3, a configuração fica no `vite.config.ts` (não existe `svelte.config.js`) e o atalho para `src/lib` é `#lib`.
- [x] `@sveltejs/adapter-static` com `fallback: 'index.html'` (SPA).
- [x] Renderização no servidor desligada: `export const ssr = false` em `src/routes/+layout.ts`.
- [x] Node 24 fixado em `.nvmrc`, com `engine-strict` no `.npmrc`. O SvelteKit 3 exige Node 22.17 ou mais novo.

### Layout responsivo e aparência

- [x] Variáveis de cor, espaçamento e tipografia em `src/app.css`, com tema claro e escuro, seguindo a seção "Aparência" do índice: base clara, azul-marinho, dourado discreto, linhas finas, serifa nos títulos e cara de oficial (cabeçalho timbrado e selos no estilo carimbo).
- [x] Fonte Source Serif 4 só no peso 600 e nos caracteres latinos (`@fontsource/source-serif-4/latin-600.css`, 21 KB), servida pelo próprio app. A interface usa a fonte do sistema.
- [x] Ícones do `@lucide/svelte`, importados um a um (`@lucide/svelte/icons/house`).
- [x] Faixas de tela:

  | Largura | Layout |
  |---|---|
  | Até 1023 px (celular e tablet) | Uma coluna, navegação fixa embaixo, botões grandes |
  | 1024 px ou mais (notebook) | Navegação na lateral |
  | Rotas `/telao/*` | Tela cheia, sem navegação (passo 06) |

- [x] Componentes base como classes CSS em `src/app.css`: `.botao`, `.cartao`, `.selo`, `.carimbo`, `.rotulo` e `.codigo-doc`. O diálogo é o `<dialog>` nativo. Um componente Svelte só aparece quando houver comportamento.
- [x] Página `/estilo` com cores, tipos e componentes. Não tem dados nem aparece no menu; serve de referência visual e de base para os testes de aparência.
- [x] Link "Pular para o conteúdo", foco visível, unidades `rem` e respeito a `prefers-reduced-motion`.

### Testes e CI

- [x] Playwright com três projetos de tela, todos no Chromium: celular (360 × 740), notebook (1366 × 768) e telão (1920 × 1080).
- [x] `@axe-core/playwright` para checar acessibilidade.
- [x] `scripts/tamanho.js`: soma o build com gzip e falha acima de 300 KB.
- [x] GitHub Actions (`.github/workflows/ci.yml`): instalar, checar tipos, build, tamanho e testes de ponta a ponta. Desde o passo 03 é um job só em `ubuntu-24.04`, com o Supabase local.
- [x] Capturas de referência geradas só no CI, para não variar de máquina para máquina: rodar o workflow manualmente com "atualizar capturas", baixar o artefato `capturas` e fazer o commit em `tests/capturas/`.
- [x] `npm run testar` roda localmente o mesmo que o CI.
- Sem regra de proteção nem pull request: há uma pessoa só no projeto, então o trabalho vai direto para a `main` e o CI roda a cada push.

### Deploy

- [ ] Cloudflare Pages ligado ao repositório: build `npm run build`, pasta `build`, variável `NODE_VERSION=24`. Precisa da sua conta do Cloudflare.
- [x] Sem `404.html` na raiz, para o Cloudflare Pages tratar o app como SPA.

## Mudou em relação ao plano original

- O Supabase (`supabase init`, projeto na nuvem, tipos do banco) passou para o passo 02, onde o banco é usado de fato.
- O cliente do Supabase (`src/lib/supabase.ts` e `.env.example`) passou para o passo 03, o primeiro a usá-lo.
- O Vitest entra no passo 04, junto com o primeiro teste de unidade.

## Testes

Arquivo: `tests/01-fundacao.spec.ts`.

- [x] Tipos do Node (`@types/node`) declarados no `tsconfig.json`, que o TypeScript 6 exige para usar `process` nos testes.
- [x] Ponta a ponta: `/` e `/estilo` abrem com um título nas três telas.
- [x] Ponta a ponta: a navegação fica embaixo no celular e na lateral no notebook.
- [x] Ponta a ponta: o link "Pular para o conteúdo" aparece com o teclado e leva ao conteúdo.
- [x] Ponta a ponta: com 320 px de largura (o mesmo que zoom de 200%), nada rola na horizontal.
- [x] Aparência: capturas de referência de `/estilo` nos temas claro e escuro e nas três telas.
- [x] Acessibilidade: axe sem erros em `/` e em `/estilo`, nos dois temas.
- [x] Tamanho: o CI falha se o app passar de 300 KB, contando a fonte.
- [x] CI: checagem de tipos e build.
- [ ] Manual: a página publicada abre num Android e num iPhone reais.

## Pronto quando

- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores: 32 testes, nenhum falhando.
- [ ] Uma página inicial está no ar em `*.pages.dev`. Depende de ligar o repositório ao Cloudflare Pages.
- [x] A navegação muda de lugar entre celular (embaixo) e notebook (lateral).
- [x] O axe não encontra erros.
- [x] A primeira abertura tem menos de 300 KB: o build inteiro tem 69,3 KB com gzip.
