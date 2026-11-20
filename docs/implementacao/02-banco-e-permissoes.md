# Passo 02 · Banco base, permissões e dados fictícios

**Parte de:** piloto
**Depende de:** 01
**Objetivo:** criar as tabelas centrais, as regras de acesso de cada função e um conjunto de dados fictícios para desenvolver e testar.

## Banco

```sql
create type papel as enum ('delegado', 'mesa', 'crise', 'press', 'secretaria');
create type situacao_delegacao as enum ('membro', 'observadora', 'suspensa');

create table evento (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ano int not null,
  regras_padrao jsonb not null default '{}'          -- passo 05
);

create table comite (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references evento,
  sigla text not null,
  nome text not null,
  nome_oficial text not null,                        -- usado na linha do comitê das resoluções
  idioma text not null check (idioma in ('pt', 'en')),
  crise_ligada boolean not null default false,
  tecnologia_restrita boolean not null default false,
  regras jsonb not null default '{}',                -- ajustes do comitê (passo 05)
  unique (evento_id, sigla)
);

create table delegacao (
  id uuid primary key default gen_random_uuid(),
  comite_id uuid not null references comite,
  nome text not null,                                -- "Alemanha"
  nome_oficial text not null,                        -- "Federal Republic of Germany"
  situacao situacao_delegacao not null default 'membro',
  bandeira text                                      -- código flag-icons ou caminho no Storage
);

create table pessoa (
  id uuid primary key references auth.users on delete cascade,
  nome text not null
);

create table participacao (
  id uuid primary key default gen_random_uuid(),
  pessoa_id uuid not null references pessoa on delete cascade,
  evento_id uuid not null references evento,
  papel papel not null,
  comite_id uuid references comite,
  delegacao_id uuid references delegacao,
  check (papel <> 'delegado' or delegacao_id is not null)
);
```

Uma delegação pode ter um ou mais delegados: basta ter mais de uma `participacao` apontando para ela.

## Funções auxiliares

Funções `security definer` e `stable`, usadas pelas regras de acesso para evitar consultas recursivas:

- `eh_participante(evento_id)`: a pessoa logada participa do evento.
- `tem_papel(comite_id, papeis papel[])`: a pessoa tem um desses papéis no comitê.
- `minha_delegacao(comite_id) returns uuid`: a delegação da pessoa no comitê, ou nulo.

## Regras de acesso (RLS)

- Todas as tabelas com `enable row level security` e nada liberado por padrão.
- **Leitura:**
  - participantes do evento veem o evento, os comitês e as delegações;
  - o nome de uma pessoa é visível para quem participa do mesmo comitê;
  - cada pessoa vê a própria participação;
  - mesa e secretaria veem as participações do comitê.
- **Escrita:** só a secretaria cria e altera participações. No piloto, pelo seed e pela tela do passo 03.

## Dados fictícios

`scripts/seed.ts` usa a chave de serviço e roda **só** no ambiente local e no projeto de teste. Ele cria:

- o evento "UFRGSMUN Teste";
- o comitê `CSNU-T`, com as 15 delegações do CSNU de 2026;
- contas fictícias com e-mails `@exemplo.test`: `delegado01` a `delegado15` (uma delegação com dois delegados), `mesa01`, `crise01`, `press01` e `secretaria01`.

## Testes

Arquivos: `supabase/tests/00-rls-em-todas-as-tabelas.test.sql` e `supabase/tests/02-permissoes.test.sql`.

- [ ] **Teste geral:** falha se qualquer tabela do esquema `public` estiver sem RLS ou sem nenhuma regra. Vale para todos os passos seguintes.
- [ ] pgTAP: um delegado vê o próprio comitê e as delegações dele.
- [ ] pgTAP: um delegado não vê as participações de outro comitê.
- [ ] pgTAP: um usuário anônimo não vê nada.
- [ ] pgTAP: um delegado não consegue criar nem alterar uma participação.
- [ ] pgTAP: não dá para cadastrar um delegado sem delegação.
- [ ] pgTAP: `tem_papel` e `minha_delegacao` dão a resposta certa para cada conta fictícia.
- [ ] CI: `supabase db reset` e o seed rodam do zero sem erro, duas vezes seguidas.
- [ ] CI: os tipos gerados são iguais aos versionados.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [ ] `supabase db reset` seguido de `npm run seed` monta tudo do zero.
- [ ] Os tipos do banco foram gerados.
