# Passo 03 · Login e papéis

**Parte de:** piloto
**Depende de:** 02
**Objetivo:** entrar com Google ou com e-mail e senha e ver só as telas da própria função.

## O que construir

### Supabase Auth

- [ ] Provedor Google: cliente OAuth no Google Cloud, com URLs de retorno do `localhost` e do `*.pages.dev`.
- [ ] E-mail e senha com a confirmação de e-mail **desligada**: o piloto não envia e-mail.

### Convites

Uma `participacao` precisa de uma `pessoa`, que só existe depois do primeiro login. Por isso a secretaria cadastra **convites** pelo e-mail:

```sql
create table convite (
  email text not null,
  evento_id uuid not null references evento,
  papel papel not null,
  comite_id uuid references comite,
  delegacao_id uuid references delegacao,
  primary key (email, evento_id, papel)
);
```

- [ ] Um gatilho em `auth.users` cria a `pessoa` e transforma os convites daquele e-mail em `participacao`.
- [ ] Tela `/secretaria/participantes`: adicionar convite (e-mail, papel, comitê e delegação), listar e remover.

### Telas

- [ ] `/entrar`: botão do Google, formulário de e-mail e senha e mensagens de erro claras.
- [ ] Botão "Sair" no menu.
- [ ] `/sem-acesso`: para quem entrou mas não tem participação no evento.

### Navegação por função

- [ ] O `+layout.ts` redireciona para `/entrar` quem não tem sessão.
- [ ] As participações da pessoa ficam num estado global, carregado uma vez.
- [ ] O menu mostra só o que a função usa:

  | Papel | Itens do menu |
  |---|---|
  | Delegado | Agora, Comitê, Sessão, Blocos, Crise, Press |
  | Mesa | Agora, Comitê, Presidência, Documentos, Telão |
  | Crise | Agora, Fila da crise, Atualizações |
  | Press | Agora, Escrever, Meu veículo, Capa |
  | Secretaria | Agora, Participantes, Avisos, Cronograma |

  Cada item só aparece quando o passo que cria aquela tela fica pronto.

## Testes

Arquivos: `supabase/tests/03-convites.test.sql` e `tests/03-login.spec.ts`.

- [ ] pgTAP: só a secretaria lê e escreve convites.
- [ ] pgTAP: o gatilho cria a `pessoa` e a participação certa a partir do convite, inclusive quando há dois convites para o mesmo e-mail.
- [ ] Ponta a ponta: login e logout com e-mail e senha.
- [ ] Ponta a ponta: sem sessão, qualquer rota leva a `/entrar`; sem participação, leva a `/sem-acesso`.
- [ ] Ponta a ponta: cada uma das cinco funções vê só o próprio menu, no celular e no notebook.
- [ ] Ponta a ponta: um delegado que digita a URL de uma tela da mesa não vê os dados dela.
- [ ] Acessibilidade: axe sem erros em `/entrar`, e o formulário funciona só com o teclado.
- [ ] Manual: login com Google no ambiente publicado.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [ ] Cada conta fictícia entra e vê só o menu da sua função, no celular e no notebook.
- [ ] Uma pessoa sem convite cai em `/sem-acesso`.
