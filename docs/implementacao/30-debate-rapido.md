# Passo 30 · Debate rápido: "há pontos ou moções?" e lista curta

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 13; o item 22 fica registrado aqui)
**Depende de:** 28 e 29
**Esforço:** M
**Objetivo:** o app acompanha o ritmo da sala: fala, pausa para pontos e moções, placas, próxima fala. Ajuda a parte física do evento, sem substituí-la.

## Como ficou

- Banco (`20261213090000_debate_rapido.sql`): regra `pausa_pontos_seg` (10 s; 0 desliga), `estado_sessao.pausa_ate`, `proximo_orador`, `dar_palavra` cuidando da pausa e da lista curta, `encerrar_pausa`, `definir_proximos`, `baixar_todas_placas`.
- Painel: cartão da pausa com contagem; escolha dos próximos na fila (1º, 2º…); seção "Próximos"; "Baixar todas as placas" e o atalho B; Enter dá a palavra ao primeiro da lista curta.
- Sessão: faixa "Há pontos ou moções?" que leva ao formulário; "Sua delegação é a 2ª da lista curta". Telão: faixa da pausa e a lista curta em "Próximos".

## Antes

- Encerrar uma fala (`dar_palavra(null)`) só zera o orador.
- As placas levantadas formam a fila "Pedidos de fala" (`pedido_fala`), por ordem de chegada; a presidência dá a palavra a qualquer uma.
- A lista de oradores (`lista_oradores`) só existe na plenária de abertura e nas listas especiais (2 a favor, 2 contra).
- O painel tem os atalhos Espaço (pausa) e Enter (próximo).

## Decisões

- **Pausa de 10 s** depois de cada fala, em regra nova `pausa_pontos_seg`; o valor 0 desliga.
- **Placas continuam levantadas** entre as falas (menos atrito); a presidência tem "Baixar todas".
- **Lista curta** de até 4 delegações, escolhidas pela presidência entre as placas.
- **Tipos de debate (item 22):** ficam os três de hoje, iguais às regras do UNOCT (`docs/regras-de-procedimento.md:43`). Se as regras de 2027 trouxerem outra forma, como o debate moderado, vira passo próprio.

## Banco

Migração `supabase/migrations/20261213090000_debate_rapido.sql`:

- [x] Regra `pausa_pontos_seg` (número, padrão 10): `create or replace` de `regras_do_guia` e `regras_validas` a partir das versões de `20261204100000_comunicacao.sql:62` e `:85`. Tipo e texto legível em `src/lib/regras.ts` (português e inglês).
- [x] `estado_sessao.pausa_ate timestamptz`.
- [x] `create or replace function public.dar_palavra`:
  - sem delegação (encerrar a fala), no debate formal-informal, grava `pausa_ate = now() + pausa_pontos_seg`;
  - com delegação, limpa `pausa_ate` e tira a delegação da lista curta.
- [x] `encerrar_pausa(p_comite)`: presidência; limpa `pausa_ate`.
- [x] Tabela `proximo_orador` (`sessao_id`, `comite_id`, `delegacao_id`, `ordem`; chave `(sessao_id, delegacao_id)`; chaves compostas):
  - RLS: o comitê lê, sem escrita direta;
  - Broadcast `transmitir('comite', 'comite_id')`.
- [x] `definir_proximos(p_comite, p_delegacoes uuid[])`: presidência; substitui a lista (até 4, só delegações presentes).
- [x] `baixar_todas_placas(p_comite)`: presidência; os pedidos abertos da sessão viram `baixado`.
- [x] Regenerar os tipos.

## Código e telas

- [x] `src/lib/sessao.ts`: `momentoDoDebate(estado, agoraMs)` devolve `'fala'`, `'pausa'` ou `'placas'` (função pura).
- [x] **Painel:**
  - depois de "Encerrar fala", cartão grande "Há pontos ou moções?" com a contagem da pausa e "Encerrar a pausa";
  - a fila de placas vira lista de escolha: tocar marca a ordem (1, 2, 3, 4), e "Definir próximos" salva;
  - Enter dá a palavra ao primeiro da lista curta, depois ao da lista de oradores, depois ao da fila;
  - novo atalho B baixa todas as placas.
- [x] **Sessão** (delegado):
  - na pausa, faixa "Há pontos ou moções?" com o botão que leva ao formulário de ponto ou moção (rola e põe o foco no primeiro campo);
  - nas placas, "Levantar placa" em destaque;
  - "Você é o 2º da lista" quando a delegação está na lista curta.
- [x] **Telão:** faixa da pausa e "Próximos: Brasil, França, Japão".

## Testes

Arquivos: `src/lib/sessao.test.ts`, `supabase/tests/30-debate-rapido.test.sql` e `tests/30-debate-rapido.spec.ts`.

- [x] Vitest: `momentoDoDebate` nos três momentos e no fim da pausa.
- [x] pgTAP:
  - encerrar a fala no formal-informal cria a pausa da regra, e com regra 0 não cria;
  - só a presidência define os próximos e baixa as placas;
  - dar a palavra tira a delegação da lista curta;
  - delegação ausente não entra na lista.
- [x] Ponta a ponta (CE-T em debate, duas placas): a presidência escolhe França e Alemanha; o telão e o celular mostram a lista curta; a França fala; ao encerrar, a pausa aparece no painel, no celular (que leva ao campo de ponto ou moção) e no telão; a presidência encerra a pausa e baixa as placas. O fim da pausa pelo tempo fica no Vitest (`momentoDoDebate`).
- [ ] Capturas do telão na pausa e com os próximos (as de referência do telão e do painel são regeradas no CI).

## Pronto quando

- [x] Uma sessão de teste flui no ritmo da sala, sem a presidência procurar botões.
- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
