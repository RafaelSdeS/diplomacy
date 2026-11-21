# Passo 34 · Caderno da delegação

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 16)
**Depende de:** 26 e 32
**Esforço:** M
**Objetivo:** cada delegação tem um caderno para anotar o debate, registrar o que pensa das outras delegações e preparar as falas, e pode compartilhar anotações com as delegações que escolher (EUA e Israel, por exemplo).

## Hoje

Não há nada para anotar no app. A caixa de saída (`src/lib/caixa-de-saida.ts`) envia qualquer chamada de função com id gerado no aparelho, então serve para anotações feitas sem internet.

## Decisões

- O caderno é da **delegação**: os delegados dela leem e escrevem tudo.
- **Compartilhamento por anotação** (você, 20/11): a delegação escolhe com quais delegações do comitê compartilha cada anotação. Quem recebe só lê; pode haver vários destinatários. Desfazer o compartilhamento tira o acesso na hora.
- Compartilhar uma anotação "sobre o Irã" com o próprio Irã é permitido, mas a tela avisa antes.
- A **mesa não lê** o caderno, nem o compartilhado.
- Comitês com tecnologia restrita seguem a regra do comitê: sem escrever durante a sessão.

## Banco

Migração `supabase/migrations/20261215090000_caderno.sql`:

- [ ] Tabela `anotacao`:
  - `id uuid primary key` (gerado no aparelho), `comite_id`, `delegacao_id` (dona);
  - `tipo text check (tipo in ('nota', 'sobre', 'fala'))`;
  - `sobre_delegacao_id` (no tipo `sobre`), `topico int`, `orador_delegacao_id` (quem falava quando a nota foi feita), `titulo text check (char_length(titulo) <= 120)`, `texto text check (char_length(texto) between 1 and 4000)`;
  - `autor_id references pessoa on delete set null`, `criado_em`, `atualizado_em`;
  - chaves compostas para `delegacao`.
- [ ] Tabela `anotacao_compartilhada` (`anotacao_id`, `comite_id`, `delegacao_id`; chave `(anotacao_id, delegacao_id)`).
- [ ] `pode_ver_anotacao(p_id)` (security definer): a dona (`minha_delegacao(comite_id) = delegacao_id`) ou uma delegação com quem foi compartilhada. Sem caminho para a mesa.
- [ ] RLS de leitura: na lista, com os conjuntos de `20261207100000_mensagens_rapidas.sql` (`delegacao_id in (select minhas_delegacoes())` ou compartilhada com uma delegação desse conjunto); `pode_ver_anotacao` fica para as funções que olham uma anotação só. Em `anotacao_compartilhada`, só a dona e a destinatária. Sem escrita direta.
- [ ] Funções (todas exigem ser da delegação dona; recebem `p_id` do aparelho):
  - `salvar_anotacao(p_id, p_comite, p_tipo, p_texto, p_titulo, p_sobre, p_topico, p_orador)`: `insert … on conflict (id) do update`;
  - `apagar_anotacao(p_id)`;
  - `compartilhar_anotacao(p_id, p_delegacoes uuid[])`: substitui a lista; só delegações do mesmo comitê, nunca a própria.
- [ ] Broadcast:
  - em `anotacao`, `transmitir('delegacao', 'delegacao_id')`, para os outros delegados da mesma delegação;
  - em `anotacao_compartilhada`, `transmitir('delegacao', 'delegacao_id')`, para quem recebe.
- [ ] Gatilho `bloquear_tecnologia_restrita` nas duas tabelas.
- [ ] LGPD:
  - `meus_dados()` (versão atual em `20261207090000_notificacoes.sql`) inclui as anotações de que a pessoa é autora;
  - `apagar_dados_pessoais` (`20261205090000_lgpd.sql`) apaga as duas tabelas dos comitês do evento.
- [ ] Regenerar os tipos.

## Código e telas

- [ ] `src/lib/caderno.ts`: `estimarDuracao(texto, palavrasPorMinuto = 130)` em segundos, com Vitest.
- [ ] Página nova `/comite/[sigla]/caderno`, com três abas:
  - **Notas:** notas rápidas, as mais recentes primeiro, com o tópico e quem falava;
  - **Sobre as delegações:** uma entrada por delegação (posição, aliados, o que disse), com a bandeira;
  - **Falas:** rascunhos com a duração estimada comparada ao tempo de fala atual ("~1 min 20 s de 1 min 30 s"; em âmbar quando passa).
  
  Seção "Compartilhadas com a sua delegação", só leitura, com a delegação de origem.
- [ ] Em cada anotação, "Compartilhar com…": lista de delegações com caixas de seleção, e as escolhidas aparecem como etiquetas.
- [ ] **Sessão:** botão "Anotar" sempre à mão (abre um campo curto); a nota guarda sozinha o tópico em debate e quem tem a palavra. Envio pela caixa de saída.
- [ ] **Página da delegação** (passo 26): bloco "Suas anotações sobre o Irã", só para a própria delegação, com "Nova anotação".
- [ ] **Fala:** "Usar na próxima fala" abre o texto em letra grande, em tela cheia (como a placa), com o relógio da fala.
- [ ] Link "Caderno" na tela do comitê e no Agora do delegado. A rota entra na trilha (passo 25).

## Testes

Arquivos: `src/lib/caderno.test.ts`, `supabase/tests/34-caderno.test.sql` e `tests/34-caderno.spec.ts`.

- [ ] Vitest: `estimarDuracao` com textos de 0, 130 e 260 palavras.
- [ ] pgTAP:
  - o outro delegado da mesma delegação lê e edita;
  - outra delegação não lê, a não ser a anotação compartilhada com ela, e mesmo essa ela não edita;
  - a mesa não lê nada;
  - desfazer o compartilhamento tira o acesso;
  - não compartilha com delegação de outro comitê nem consigo mesma.
- [ ] Ponta a ponta:
  - nota feita sem internet chega uma vez;
  - os EUA compartilham uma anotação com Israel, e Israel a vê em "Compartilhadas", só leitura;
  - o rascunho mostra a duração estimada.

## Pronto quando

- [ ] Os delegados anotam, preparam falas e trocam análises com aliados sem papel.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
