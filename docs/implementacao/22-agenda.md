# Passo 22 · Agenda: adoção e agenda antes das resoluções

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), itens 5 e 18)
**Depende de:** 20
**Esforço:** M
**Objetivo:** a agenda de cada tópico é sempre debatida e adotada antes das resoluções; a mesa pode desfazer a adoção e ajustar a agenda adotada sem perder o andamento.

## Como ficou

- Banco (`20261209090000_agenda.sql`): `agenda_adotada`, `retirar_adocao`, `editar_agenda_adotada` (mantém os itens de mesmo texto, com andamento e working papers) e `criar_documento` exigindo a agenda adotada para projeto com tópico.
- Agenda: etapas por tópico, retirar, editar a adotada, trazer itens de outras propostas e andamento por `<select>`.
- Blocos: no projeto, os tópicos sem agenda adotada ficam desabilitados, com o aviso de que a agenda vem antes.

## Antes

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

- [x] `retirar_adocao(p_proposta uuid)`: só a mesa (`exigir_mesa`); `adotada = false`.
- [x] `editar_agenda_adotada(p_proposta uuid, p_itens jsonb)`: só a mesa; a proposta precisa estar adotada.
  - Recebe os itens no formato de `salvar_proposta_agenda` (o que `lerEsboco` devolve).
  - Recria a árvore de `ponto_pauta` e copia o `status` do item antigo de mesmo texto (comparação sem espaços nas pontas).
  - Os working papers ligados a itens que sumirem ficam com `ponto_pauta_id` nulo (a chave já é `on delete set null`).
- [x] `create or replace function public.criar_documento`: se `p_tipo = 'projeto'` e o tópico não tem proposta adotada, `raise exception 'Adote a agenda do tópico antes de apresentar um projeto de resolução.'`. Projeto sem tópico (só pela API; a tela sempre pede o tópico) fica sem a regra, como já ficava sem a de uma resolução por tópico: os testes 12 e 16 usam isso para rodar várias vezes.
- [x] `create or replace function public.agenda_adotada(p_comite uuid, p_topico int) returns boolean` (stable): usada pela função acima e pela tela.
- [x] Regenerar os tipos.

## Telas

**Agenda** (`src/routes/comite/[sigla]/sessao/agenda/+page.svelte`):

- [x] No topo de cada tópico, as etapas visíveis: 1. Debate da agenda → 2. Agenda adotada: working papers e projetos de resolução. A etapa atual fica marcada (`aria-current="step"`). Ficaram duas etapas, porque os documentos que cada pessoa vê dependem do bloco e não dariam uma contagem confiável.
- [x] Na proposta adotada, a mesa vê "Retirar adoção" (com a confirmação nativa do navegador) e "Editar agenda adotada".
- [x] "Editar agenda adotada" abre o campo de esboço preenchido com `escreverEsboco(niveis(...))` e salva com `editar_agenda_adotada`.
- [x] Em cada proposta não adotada, a mesa vê "Trazer itens para a agenda adotada", que acrescenta o esboço daquela proposta ao campo em edição. É no navegador, sem função nova.
- [x] Andamento: `<select>` com os três estados no lugar do botão que gira, chamando o `marcar_ponto_pauta` que já existe.

**Blocos e documentos** (`src/routes/comite/[sigla]/blocos/+page.svelte`):

- [x] Ao criar um projeto, os tópicos sem agenda adotada aparecem desabilitados, com "Agenda ainda não adotada".
- [x] Ao criar um working paper, o campo "Item da agenda" lista a árvore adotada (A.1, A.3), quando existir.

**Documento** (`src/routes/documento/[id]/+page.svelte`):

- [x] No cabeçalho do working paper, o item da agenda já aparecia ("Subtópico: A.1 …"); nada a mudar.

## Textos e idiomas

A nova mensagem de erro e os rótulos das etapas com tradução em `src/lib/i18n-en.ts`.

## Testes

Arquivos: `supabase/tests/22-agenda.test.sql` e `tests/22-agenda.spec.ts`.

- [x] pgTAP: só a mesa retira e edita; editar mantém o andamento dos itens de mesmo texto; um working paper ligado a um item removido fica com `ponto_pauta_id` nulo.
- [x] pgTAP: projeto num tópico sem agenda adotada é recusado; depois de adotar, é aceito; working paper é aceito sempre.
- [x] Os testes que criam projeto num tópico adotam a agenda antes: pgTAP 09 e 12 (direto na tabela), ponta a ponta 10 e 18 (`adotarAgenda()` em `tests/ajuda.ts`).
- [x] Ponta a ponta: a mesa adota a proposta A, retira, adota a B e a edita trazendo um item da A; o item "em debate" continua em debate; o bloco só consegue criar o projeto depois da adoção.

## Pronto quando

- [x] Nenhum projeto de resolução nasce antes da agenda adotada do tópico.
- [x] A mesa adota, retira e corrige a agenda sem perder o andamento.
- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
