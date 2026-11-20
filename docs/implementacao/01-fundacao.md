# Passo 01 · Fundação do projeto

**Parte de:** piloto
**Depende de:** nada
**Objetivo:** projeto rodando no computador e publicado, com CI, testes e um layout que já se adapta ao celular e ao notebook.

## O que construir

### Projeto

- [ ] Criar o projeto com `npx sv create` (SvelteKit, TypeScript, Vitest e Playwright).
- [ ] Trocar o adapter por `@sveltejs/adapter-static`, com `fallback` de SPA.
- [ ] Desligar a renderização no servidor: `export const ssr = false` no `src/routes/+layout.ts`.
- [ ] Criar `.env.example` com `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Criar `src/lib/supabase.ts` com o cliente único do Supabase.

### Supabase

- [ ] `supabase init` e ambiente local com Docker (`supabase start`).
- [ ] Projeto gratuito na nuvem, região São Paulo, ligado com `supabase link`.
- [ ] Script `npm run db:types` que gera `src/lib/database.types.ts`.

### Layout responsivo

- [ ] Variáveis de cor, espaçamento e tipografia em `src/app.css`, com tema claro e escuro.
- [ ] Faixas de tela:

  | Largura | Layout |
  |---|---|
  | Até 639 px (celular) | Uma coluna, navegação fixa embaixo, botões grandes |
  | 640 a 1023 px (tablet) | Uma ou duas colunas, navegação embaixo |
  | 1024 px ou mais (notebook) | Barra lateral, até três colunas |
  | Rotas `/telao/*` | Tela cheia, sem navegação |

- [ ] Componentes base em `src/lib/ui/`: botão, cartão, selo com ícone e texto, e diálogo com `<dialog>` nativo.
- [ ] Respeitar o tamanho de letra do sistema (unidades `rem`) e `prefers-reduced-motion`.

### Testes e CI

- [ ] Playwright com três projetos de tela: celular (360 × 740), notebook (1366 × 768) e telão (1920 × 1080).
- [ ] `@axe-core/playwright` para checar acessibilidade em cada rota.
- [ ] GitHub Actions a cada push: instalar, checar tipos, Vitest, build, checar o tamanho do build e rodar Playwright contra o build.
- [ ] A partir do passo 02, rodar também os testes do banco (`supabase test db`) no CI.

### Deploy

- [ ] Cloudflare Pages ligado ao repositório: build `npm run build`, pasta `build` e as variáveis públicas do Supabase.
- [ ] Sem `404.html` na raiz, para o Cloudflare Pages tratar o app como SPA.

## Decisões

- **Sem framework de CSS:** variáveis CSS e estilos por componente do Svelte bastam e não pesam no celular.
- **Sem biblioteca de componentes:** os componentes base são poucos e simples.

## Pronto quando

- [ ] Uma página inicial está no ar em `*.pages.dev`.
- [ ] O CI passa.
- [ ] A navegação muda de lugar entre celular (embaixo) e notebook (lateral).
- [ ] O axe não encontra erros.
- [ ] A primeira abertura tem menos de 300 KB.
