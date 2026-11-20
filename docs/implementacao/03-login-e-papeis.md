# Passo 03 · Login e papéis

**Parte de:** piloto
**Depende de:** 02
**Objetivo:** entrar com Google ou com e-mail e senha e ver só as telas da própria função.

## O que construir

### Cliente do Supabase

Veio do passo 01, porque este é o primeiro passo que usa o Supabase no app.

- [x] Variáveis em `src/env.ts` com `defineEnvVars`, lidas de `$app/env/public` (o jeito do SvelteKit 3): `SUPABASE_URL`, `SUPABASE_CHAVE` e `LOGIN_GOOGLE`. Todas públicas e fixadas no build.
- [x] `.env.example` com os valores do Supabase local. Copie para `.env`.
- [x] `src/lib/supabase.ts` com o cliente único, tipado com `database.types.ts`.

### Contas: sem cadastro livre

O plano original previa cadastro livre por e-mail e senha, sem confirmar o e-mail. Isso deixava uma brecha: qualquer pessoa poderia criar uma conta com o e-mail convidado de outra e herdar o papel dela.

- [x] Cadastro livre desligado (`enable_signup = false` no `supabase/config.toml`). No piloto, as contas são criadas pelo seed ou pelo administrador.
- [x] Os convites da secretaria definem o papel de cada conta.
- [ ] Provedor Google: cliente OAuth no Google Cloud, com URLs de retorno do `localhost` e do endereço publicado (`*.workers.dev`). Depende da sua conta no Google Cloud. O botão fica escondido até `LOGIN_GOOGLE=1`. Com o cadastro desligado, o Google entra em contas já criadas com o mesmo e-mail, que o Supabase liga sozinho.
- [x] No projeto na nuvem, desligar "Allow new users to sign up" no painel do Supabase (o `config.toml` só vale no ambiente local).
- O login verificado por e-mail (link e código) e pelo crachá vem no passo 14.

### Convites

Migração `supabase/migrations/20261120130000_convites.sql`:

- [x] Tabela `convite` (e-mail em minúsculas, evento, papel, comitê, delegação), com as mesmas restrições da `participacao`. Só a secretaria do evento vê, cria, altera e remove.
- [x] Gatilho `nova_conta` em `auth.users`: cria a `pessoa` (nome do cadastro, da conta Google ou do e-mail) e transforma os convites do e-mail em participações.
- [x] Gatilho `convite_criado`: convite novo para quem já tem conta vira participação na hora.
- [x] `aplicar_convites` não pode ser chamada direto por ninguém, só pelos gatilhos.
- [x] Visão `minhas_participacoes` (security invoker): as participações de quem está logado, com evento, comitê e delegação.
- [x] Tela `/secretaria/participantes`: criar convite (e-mail, papel, comitê e delegação), listar e remover convites, e ver quem já tem acesso.
- [x] O seed usa o mesmo fluxo: cria os convites e depois as contas, e mais uma conta sem convite.

### Telas

- [x] `/entrar`: formulário de e-mail e senha, com mensagens de erro claras, e o botão do Google quando ligado.
- [x] Botão "Sair" no cabeçalho, com o nome da pessoa no notebook.
- [x] `/sem-acesso`: para quem entrou mas não tem convite no evento.
- [x] Página de erro com título e mensagem (`+error.svelte`), usada no "Sem permissão".

### Navegação por função

- [x] O `+layout.ts` redireciona para `/entrar` quem não tem sessão e para `/sem-acesso` quem não tem participação. `/entrar` e `/estilo` abrem sem login.
- [x] As participações vêm da visão `minhas_participacoes`, carregadas no layout.
- [x] O menu mostra só o que a função usa. Antes de entrar, ou sem convite, não há menu.
- [x] Cada item só aparece quando o passo que cria aquela tela fica pronto. Hoje: "Início" para todos e "Participantes" para a secretaria. O plano completo:

  | Papel | Itens do menu |
  |---|---|
  | Delegado | Agora, Comitê, Sessão, Blocos, Crise, Press |
  | Mesa | Agora, Comitê, Presidência, Documentos, Telão |
  | Crise | Agora, Fila da crise, Atualizações |
  | Press | Agora, Escrever, Meu veículo, Capa |
  | Secretaria | Agora, Participantes, Avisos, Cronograma |

### CI

- [x] Um job só, em `ubuntu-24.04`: os testes de ponta a ponta agora precisam do Supabase local, que usa o Docker do runner. As capturas de referência passam a ser geradas nesse ambiente.

## Testes

Arquivos: `supabase/tests/03-convites.test.sql` (15 testes) e `tests/03-login.spec.ts`.

- [x] pgTAP: só a secretaria lê e escreve convites, e só no próprio evento.
- [x] pgTAP: o gatilho cria a `pessoa` com o nome certo e a participação certa a partir do convite, inclusive com dois convites para o mesmo e-mail e com o e-mail da conta em maiúsculas.
- [x] pgTAP: convite criado depois da conta vale na hora; conta sem convite não ganha participação.
- [x] pgTAP: ninguém chama `aplicar_convites` direto; `minhas_participacoes` mostra só as de quem está logado.
- [x] Ponta a ponta: login e logout com e-mail e senha; senha errada mostra um aviso.
- [x] Ponta a ponta: sem sessão, qualquer rota leva a `/entrar`; sem participação, leva a `/sem-acesso`, sem menu.
- [x] Ponta a ponta: cada uma das cinco funções vê só o próprio menu, nas três telas.
- [x] Ponta a ponta: um delegado que digita a URL da tela da secretaria vê "Sem permissão" e nenhum dado.
- [x] Ponta a ponta: a secretaria cria e remove um convite.
- [x] Acessibilidade: axe sem erros em `/entrar`, `/sem-acesso` e `/secretaria/participantes`, nos dois temas; o formulário de entrar funciona só com o teclado.
- [ ] Manual: login com Google no ambiente publicado.

## Pronto quando

- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores: 44 testes do banco e 74 de ponta a ponta.
- [x] Cada conta fictícia entra e vê só o menu da sua função, no celular e no notebook.
- [x] Uma pessoa sem convite cai em `/sem-acesso`.
