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
- [ ] Os testes listados no passo foram escritos junto com o código e passam no CI, junto com os de todos os passos anteriores.
- [ ] A primeira abertura continua abaixo de 300 KB.
- [ ] Migração versionada e tipos do banco regenerados.
- [ ] Segue a aparência definida abaixo: leve, profissional, diplomática, limpa e com cara de oficial.

## Testes

Cada passo tem uma seção "Testes" com os testes que provam que ele funciona e os arquivos onde eles ficam. Um passo só termina quando esses testes, e os de todos os passos anteriores, passam no CI.

### Camadas

| Camada | Ferramenta | O que garante | Onde fica |
|---|---|---|---|
| Banco | pgTAP (`supabase test db`) | Regras de acesso, funções e regras de negócio | `supabase/tests/NN-nome.test.sql` |
| Unidade | Vitest | Funções puras: cálculos, formatação e validações | Ao lado do código, `*.test.ts` |
| Ponta a ponta | Playwright, nas três telas | Fluxos completos como o usuário faz, inclusive tempo real com dois navegadores | `tests/NN-nome.spec.ts` |
| Acessibilidade | axe dentro do Playwright | Erros de acessibilidade em cada rota | Junto dos testes de ponta a ponta |
| Aparência | Capturas de tela de referência do Playwright | Mudanças de layout sem querer | Junto dos testes de ponta a ponta |
| Tamanho | Script no CI | Primeira abertura abaixo de 300 KB | `scripts/tamanho.ts` |
| Manual | Lista no próprio passo | O que não dá para automatizar: celulares reais, leitor de tela, login do Google, projetor | Seção "Testes" do passo |

### Testes que valem para o projeto inteiro

- **Toda tabela tem regras de acesso:** um teste do banco falha se alguma tabela do esquema `public` estiver sem RLS ou sem nenhuma regra (consulta `pg_tables` e `pg_policies`).
- **O banco sobe do zero:** o CI roda `supabase db reset` e o seed antes dos testes, então uma migração quebrada falha na hora.
- **Tipos em dia:** o CI gera os tipos do banco e falha se eles forem diferentes dos versionados.
- **Checagem de tipos** com `svelte-check`.
- **Privacidade:** os testes do tipo "um não vê o do outro" nunca são apagados, só ampliados.

### Como os testes rodam

- Cada passo é feito numa branch `passo-NN` e entra na `main` por pull request.
- A `main` tem uma regra de proteção: o merge só acontece com o CI verde.
- `npm run testar` roda localmente tudo o que o CI roda.
- Testes de tempo real usam dois navegadores (dois contextos do Playwright) e esperam a atualização chegar.
- Testes que dependem de horário usam o relógio controlado do Playwright (`page.clock`).
- Os dados vêm do seed fictício, e cada teste de ponta a ponta começa com o banco no estado do seed.

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

## Aparência

Leve, profissional, diplomática, limpa e com cara de oficial. A referência é um documento oficial bem diagramado, não um app de rede social. Combina com a identidade do UFRGSMUN, que usa azul-marinho e dourado.

- **Cara de oficial:**
  - cabeçalhos no estilo papel timbrado (logo do evento, nome do comitê e uma linha fina embaixo);
  - códigos de documento como `UFRGSMUN/CSNU/RES/3`;
  - rótulos curtos em versalete;
  - selos de situação no estilo carimbo ("APROVADA", "CONFIDENCIAL"), usados com moderação.

- **Cores:** fundo branco e cinzas muito claros, texto grafite e uma cor de destaque azul-marinho. Um dourado discreto aparece só em destaques especiais, como a presidência e os prêmios. As bandeiras são o único elemento muito colorido.
- **Cores de situação:** verde, vermelho e âmbar só para situação (voto, prazo, fila), sempre com ícone e texto.
- **Tipografia:** títulos e documentos com serifa (Source Serif 4, um único arquivo `woff2` reduzido aos caracteres latinos, servido pelo próprio app e contado no limite de 300 KB). A interface usa a fonte do sistema, que não precisa ser baixada.
- **Espaço e linhas:** bastante espaço em branco, linhas finas de 1 px em vez de sombras e cantos levemente arredondados (4 a 8 px).
- **Ícones:** traço fino, de um único conjunto (Lucide), só os usados.
- **Movimento:** só transições curtas (até 150 ms) e nenhuma animação decorativa. Respeita a opção de reduzir movimento.
- **Tom dos textos:** formal e simples, como "A palavra está com a delegação da França".
- **Tema escuro:** azul-marinho profundo, com o mesmo contraste.
- **Telão:** fundo claro e letras grandes por padrão, que funcionam melhor em salas iluminadas; tema escuro opcional.
- **Marca:** logo e cores do evento são configuráveis. O emblema da ONU nunca é usado.
