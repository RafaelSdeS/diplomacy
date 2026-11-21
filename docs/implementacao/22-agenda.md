# Passo 22 · Agenda: adoção e agenda antes das resoluções

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), itens 5 e 18)
**Depende de:** 20
**Esforço:** M
**Objetivo:** a agenda de cada tópico é sempre debatida e adotada antes das resoluções; a mesa pode desfazer a adoção e ajustar a agenda adotada sem perder o andamento.

## Hoje

- `adotar_proposta` (`20261124090000_plenaria_e_votacao.sql:850`) só troca qual proposta está adotada no tópico. Não existe "retirar".
- `salvar_proposta_agenda` recusa mudar uma proposta adotada ("A agenda adotada não muda mais."). Para corrigir um item, não há caminho.
- O andamento de cada item (pendente, em debate, debatido) muda num botão que gira entre os três (`PROXIMO` em `sessao/agenda/+page.svelte`).
- `criar_documento` (`20261126090000_editor.sql:296`) cria projeto de resolução a qualquer momento, sem olhar a agenda. O working paper já pode apontar para um item da agenda (`documento.ponto_pauta_id`).

## Decisões

- **A agenda sempre vem antes das resoluções** (você, 20/11). O banco recusa criar um projeto de resolução num tópico sem agenda adotada. Não é regra configurável. Working papers continuam livres, porque são material de apoio e ajudam a debater a própria agenda.
- Delegações e mesa continuam propondo agendas (é o comportamento atual). A pergunta aberta em `docs/regras-de-procedimento.md:100` fica para a revisão das regras de 2027.
- Editar a agenda adotada **mantém o andamento** dos itens cujo texto não mudou.
- Retirar a adoção depois de já existir um projeto não apaga o projeto: só impede novos projetos até adotar de novo.

## Banco

Migração `supabase/migrations/20261209090000_agenda.sql`:

- [ ] `retirar_adocao(p_proposta uuid)`: só a mesa (`exigir_mesa`); `adotada = false`.
- [ ] `editar_agenda_adotada(p_proposta uuid, p_itens jsonb)`: só a mesa; a proposta precisa estar adotada.
  - Recebe os itens no formato de `salvar_proposta_agenda` (o que `lerEsboco` devolve).
  - Recria a árvore de `ponto_pauta` e copia o `status` do item antigo de mesmo texto (comparação sem espaços nas pontas).
  - Os working papers ligados a itens que sumirem ficam com `ponto_pauta_id` nulo (a chave já é `on delete set null`).
- [ ] `create or replace function public.criar_documento`: se `p_tipo = 'projeto'` e o tópico não tem proposta adotada, `raise exception 'Adote a agenda do tópico antes de apresentar um projeto de resolução.'`. Também exige `p_topico` no projeto.
- [ ] `create or replace function public.agenda_adotada(p_comite uuid, p_topico int) returns boolean` (stable): usada pela função acima e pela tela.
- [ ] Regenerar os tipos.

## Telas

**Agenda** (`src/routes/comite/[sigla]/sessao/agenda/+page.svelte`):

- [ ] No topo de cada tópico, as etapas visíveis, calculadas dos dados: 1. Agenda em debate → 2. Agenda adotada → 3. Working papers → 4. Projeto de resolução. A etapa atual fica marcada (`aria-current="step"`).
- [ ] Na proposta adotada, a mesa vê "Retirar adoção" (com confirmação) e "Editar agenda adotada".
- [ ] "Editar agenda adotada" abre o campo de esboço preenchido com `escreverEsboco(niveis(...))` e salva com `editar_agenda_adotada`.
- [ ] Em cada proposta não adotada, a mesa vê "Trazer itens para a agenda adotada", que acrescenta o esboço daquela proposta ao campo em edição. É no navegador, sem função nova.
- [ ] Andamento: `<select>` com os três estados no lugar do botão que gira, chamando o `marcar_ponto_pauta` que já existe.

**Blocos e documentos** (`src/routes/comite/[sigla]/blocos/+page.svelte`):

- [ ] Ao criar um projeto, os tópicos sem agenda adotada aparecem desabilitados, com "Agenda ainda não adotada".
- [ ] Ao criar um working paper, o campo "Item da agenda" lista a árvore adotada (A.1, A.3), quando existir.

**Documento** (`src/routes/documento/[id]/+page.svelte`):

- [ ] No cabeçalho do working paper, "Responde ao item A.1 da agenda".

## Textos e idiomas

A nova mensagem de erro e os rótulos das etapas com tradução em `src/lib/i18n-en.ts`.

## Testes

Arquivos: `supabase/tests/22-agenda.test.sql` e `tests/22-agenda.spec.ts`.

- [ ] pgTAP: só a mesa retira e edita; editar mantém o andamento dos itens de mesmo texto; um working paper ligado a um item removido fica com `ponto_pauta_id` nulo.
- [ ] pgTAP: projeto num tópico sem agenda adotada é recusado; depois de adotar, é aceito; working paper é aceito sempre.
- [ ] Conferir os testes que já criam projetos (`09-editor`, `12-votacao-de-projeto`, `16-procedimento`): adotar a agenda do tópico antes, no próprio teste ou no seed.
- [ ] Ponta a ponta: a mesa adota a proposta A, retira, adota a B e a edita trazendo um item da A; o item "em debate" continua em debate; o bloco só consegue criar o projeto depois da adoção.

## Pronto quando

- [ ] Nenhum projeto de resolução nasce antes da agenda adotada do tópico.
- [ ] A mesa adota, retira e corrige a agenda sem perder o andamento.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
