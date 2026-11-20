# Plano de implementação

Ordem dos passos para construir o app. Os passos 01 a 12 formam o **piloto**: planos gratuitos, poucos usuários e dados fictícios. Os passos 13 a 19 levam o app à **escala do evento**.

Cada passo só começa quando os passos de que ele depende estão prontos.

| Passo | Entrega | Depende de |
|---|---|---|
| **Piloto** | | |
| [01](01-fundacao.md) | Projeto, deploy, CI e layout responsivo | — |
| [02](02-banco-e-permissoes.md) | Banco base, papéis, regras de acesso e dados fictícios | 01 |
| [03](03-login-e-papeis.md) | Login (Google, e-mail e senha) e navegação por função | 02 |
| [04](04-agora-e-informacoes.md) | Tela "Agora", perfis, comitê, cronograma e avisos | 03 |
| [05](05-regras-de-procedimento.md) | Regras do Guia de Regras como configuração | 02 |
| [06](06-sessao-e-telao.md) | Sessão: chamada, presidência, pedidos de fala, cronômetro e telão | 04, 05 |
| [07](07-agenda-e-votacao.md) | Agenda e votação com resultado automático | 06 |
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

## Convenções

**Stack:** SvelteKit 2 com Svelte 5, em modo SPA (`adapter-static`), TypeScript, Supabase (Postgres, Auth, Realtime e Storage) e Cloudflare Pages.

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
    ui/                componentes compartilhados
supabase/
  migrations/          uma migração por mudança no banco
  tests/               testes pgTAP (regras de acesso e funções)
scripts/
  seed.ts              dados fictícios (só local e projeto de teste)
tests/                 testes de ponta a ponta (Playwright)
```

**Regras de código:**

- Nomes do domínio em português, sem acento: `comite`, `delegacao`, `nota_crise`.
- Regras de negócio ficam no banco (restrições, funções e regras de acesso por linha). A interface só mostra.
- Toda tabela tem regras de acesso por linha (RLS). Funções `security definer` só para ações que precisam de checagem extra, como assumir uma nota ou votar.
- CSS próprio com variáveis e estilos por componente, sem framework de CSS.
- Nenhum dado pessoal real no repositório. As seeds são fictícias.
- Commits pequenos na `main`. Um passo pode virar vários commits.

## Definição de pronto (vale para todo passo)

- [ ] Funciona num celular de 360 × 740 e num notebook de 1366 × 768; telas de telão também em 1920 × 1080.
- [ ] Acessível (WCAG 2.2 AA): contraste, foco visível, rótulos nos controles e nada indicado só por cor.
- [ ] Tabelas novas têm regras de acesso testadas com pgTAP.
- [ ] O fluxo principal tem teste de ponta a ponta.
- [ ] A primeira abertura continua abaixo de 300 KB.
- [ ] Migração versionada e tipos do banco regenerados.
