# Passo 02 · Banco base, permissões e dados fictícios

**Parte de:** piloto
**Depende de:** 01
**Objetivo:** criar as tabelas centrais, as regras de acesso de cada função e um conjunto de dados fictícios para desenvolver e testar.

## Supabase

Veio do passo 01, porque aqui o banco passa a ser usado.

- [x] Supabase CLI (3.2) como dependência de desenvolvimento e `supabase init` (Postgres 17).
- [x] Ambiente local com Docker: `npm run db:iniciar` sobe só banco, autenticação, API e gateway. Para ter também o Studio, use `npx supabase start`.
- [x] `npm run db:tipos` gera `src/lib/database.types.ts`.
- [x] CI: job `banco` sobe o Supabase do zero, roda o seed duas vezes, os testes do banco e confere os tipos.
- [ ] Projeto gratuito na nuvem, região São Paulo, ligado com `supabase link`. Precisa da sua conta e só é necessário no deploy.

## Banco

O SQL completo está em `supabase/migrations/20261120120000_base.sql`. Em resumo:

| Tabela | O que guarda | Restrições |
|---|---|---|
| `evento` | Nome, ano e regras padrão (passo 05) | Nome e ano únicos |
| `comite` | Sigla, nome, nome oficial, idioma, crise ligada, tecnologia restrita e ajustes de regras | Sigla única no evento |
| `delegacao` | Nome, nome oficial, situação (membro, observadora, suspensa) e bandeira | Nome único no comitê |
| `pessoa` | Nome, ligado à conta em `auth.users` | Apagada junto com a conta |
| `participacao` | Pessoa, evento, papel, comitê e delegação | Ver abaixo |

Restrições da `participacao`, garantidas pelo banco:

- delegado sempre tem delegação;
- a secretaria vale para o evento todo e não fica presa a um comitê; os outros papéis têm comitê;
- o comitê é do mesmo evento, e a delegação é do mesmo comitê (chaves estrangeiras compostas);
- a mesma pessoa não repete o mesmo papel no mesmo comitê.

Uma delegação pode ter um ou mais delegados: basta ter mais de uma `participacao` apontando para ela.

## Funções auxiliares

Funções `security definer` e `stable`, usadas pelas regras de acesso para ler `participacao` sem cair em recursão. Só usuários logados podem chamá-las.

- `eh_participante(evento)`: a pessoa logada participa do evento.
- `eh_secretaria(evento)`: a pessoa logada é da secretaria do evento.
- `evento_do_comite(comite)`: o evento de um comitê.
- `tem_papel(comite, papeis[])`: a pessoa tem um desses papéis no comitê. A secretaria vale para todos os comitês do evento.
- `minha_delegacao(comite)`: a delegação da pessoa no comitê, ou nulo.
- `pode_ver_pessoa(pessoa)`: as duas estão no mesmo comitê, ou quem pergunta é da secretaria do evento.

## Regras de acesso (RLS)

- Todas as tabelas com `enable row level security`; usuários anônimos não veem nada.
- **Leitura:**
  - participantes do evento veem o evento, os comitês e as delegações;
  - o nome de uma pessoa é visível para quem está no mesmo comitê e para a secretaria;
  - cada pessoa vê a própria participação; a mesa vê as do comitê; a secretaria, as do evento.
- **Escrita:** só a secretaria cria, altera e remove participações do próprio evento.

## Dados fictícios

`npm run seed` (`scripts/seed.ts`, rodado direto pelo Node 24) usa a chave de serviço e só roda no Supabase local, a menos que `SEED_PERMITIR_REMOTO=1` seja definido para um projeto de teste. Pode rodar várias vezes sem duplicar nada. Ele cria:

- o evento "UFRGSMUN Teste";
- o comitê `CSNU-T`, com as 15 delegações do CSNU de 2026, os nomes oficiais e as bandeiras;
- 20 contas `@exemplo.test` com a senha `senha-de-teste`:
  - `delegado01` a `delegado15`, um por delegação, mais `delegado16`, o segundo delegado dos EUA;
  - `mesa01`, `crise01`, `press01` e `secretaria01`.

## Testes

Arquivos: `supabase/tests/00-rls-em-todas-as-tabelas.test.sql` (2 testes) e `supabase/tests/02-permissoes.test.sql` (27 testes). Os testes criam os próprios dados dentro de uma transação e desfazem tudo no fim.

- [x] **Teste geral:** falha se qualquer tabela do esquema `public` estiver sem RLS ou sem nenhuma regra. Vale para todos os passos seguintes.
- [x] pgTAP: um delegado vê o próprio evento, os comitês e as delegações dele, e nada de outro evento.
- [x] pgTAP: um delegado vê só a própria participação, e só o nome de quem está no mesmo comitê.
- [x] pgTAP: a mesa vê as participações do próprio comitê; a secretaria, as do evento.
- [x] pgTAP: um usuário anônimo não vê nada nas cinco tabelas.
- [x] pgTAP: um delegado não consegue criar nem alterar uma participação; a secretaria cria no próprio evento e não em outro.
- [x] pgTAP: o banco recusa delegado sem delegação, delegação de outro comitê, secretaria presa a um comitê e comitê de outro evento.
- [x] pgTAP: `tem_papel` e `minha_delegacao` dão a resposta certa para cada papel.
- [x] CI: as migrações sobem do zero e o seed roda duas vezes seguidas sem erro.
- [x] CI: os tipos gerados são iguais aos versionados.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [x] `npm run db:iniciar` seguido de `npm run seed` monta tudo do zero.
- [x] Os tipos do banco foram gerados.
