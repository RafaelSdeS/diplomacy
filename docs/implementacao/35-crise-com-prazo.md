# Passo 35 · Crise com prazo

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 15)
**Depende de:** 31 e 32
**Esforço:** M–G
**Objetivo:** a equipe de crise lança um incidente tenso e inesperado, com prazo, que toma o telão, chega ao celular de todos e pode deixar delegações sem voz. Exemplos: o delegado russo "assassinado" por rebeldes do Sahel no UNOCT; o representante da Polônia sequestrado no Conselho Europeu.

## Como ficou

- Banco (`20261216090000_incidente_crise.sql`): `incidente_crise`, `incidente_comite`, `incidente_efeito`, `lancar_incidente`, `encerrar_incidente` (que publica o desfecho como atualização), `delegacao_sem_voz`, e `exigir_delegacao` e `validar_voto` recusando a atingida.
- Equipe: formulário de lançar (comitês, título, briefing, prazo, delegações atingidas) e de encerrar (desfecho). `ui/AlertaCrise.svelte` na sessão, no painel e no Agora; telão em modo crise; na sessão, a atingida vê o motivo e perde placa, pontos e voto.

## Antes

- Notas e diretivas das delegações, com fila e resposta da equipe (`nota_crise`).
- Atualizações em texto para um ou mais comitês (`atualizacao_crise`, `atualizacao_comite`, `publicar_atualizacao` em `20261125090000_crise.sql:164`), com 5 minutos de plantão no telão.
- Não há prazo, contagem regressiva nem efeito sobre uma delegação.

## Decisões

- **Delegação atingida fica sem voz:** sem placa, sem pontos e moções, sem voto e sem assinar moção, até o prazo do efeito ou o fim do incidente. Ela continua mandando notas de crise e bilhetes, porque a negociação acontece por aí.
- **A crise não pausa a sessão sozinha:** a mesa decide (os botões de pausa já existem).
- Um incidente pode valer para vários comitês, como as atualizações.
- No fim do prazo nada acontece sozinho: a equipe registra o desfecho (resolvido ou fracassou), que vira atualização.

## Banco

Migração `supabase/migrations/20261216090000_incidente_crise.sql`:

- [x] Tabela `incidente_crise`:
  - `id`, `evento_id`, `titulo` (até 120), `texto` (até 3000), `prazo timestamptz not null`;
  - `desfecho text check (desfecho in ('resolvido', 'fracassou'))`, `desfecho_texto`;
  - `autor_id`, `criado_em`, `encerrado_em`.
- [x] Tabela `incidente_comite` (`incidente_id`, `comite_id`, `evento_id`, `encerrado_em`), como `atualizacao_comite`; o `encerrado_em` repetido faz o fim chegar ao canal de cada comitê.
- [x] Tabela `incidente_efeito`:
  - `incidente_id`, `comite_id`, `delegacao_id`;
  - `texto` (até 200, como "Delegado assassinado por rebeldes do Sahel");
  - `ate timestamptz` (nulo: até o fim do incidente).
- [x] RLS:
  - quem participa de um comitê do incidente lê o incidente e os efeitos;
  - a equipe de crise e a mesa desses comitês leem tudo;
  - sem escrita direta.
- [x] `lancar_incidente(p_comites uuid[], p_titulo, p_texto, p_minutos int, p_efeitos jsonb)`: exige o papel `crise` em todos os comitês; cria tudo numa transação.
- [x] `encerrar_incidente(p_id, p_desfecho, p_texto)`: equipe de crise; grava o desfecho e chama `publicar_atualizacao` com "Desfecho: …".
- [x] `delegacao_sem_voz(p_delegacao) returns boolean` (stable): existe efeito com incidente não encerrado e `ate` nulo ou futuro.
- [x] `create or replace function public.exigir_delegacao` (a versão do passo 31): recusa com "Sua delegação está impedida pela crise." quando `delegacao_sem_voz`. Também em `validar_voto` (votos da delegação e os registrados pela mesa).
- [x] Broadcast em `incidente_comite` e `incidente_efeito`: `transmitir('comite', 'comite_id', 'crise', 'comite_id')`. O fim chega pelo `encerrado_em` de `incidente_comite`.
- [x] Notificação push no lançamento, pelo mesmo caminho das notificações do passo 15: `push_a_enviar('crise', id)` (título "Crise: <título>", para todos do comitê) e a Edge Function `enviar-push` aceitando o tipo `crise`. A função com o tipo `crise` foi publicada na nuvem em 21/11/2026 (`npx supabase functions deploy enviar-push`).
- [x] Regenerar os tipos.

## Telas

- [x] **Equipe** (`/crise/[sigla]`):
  - formulário "Lançar incidente": comitês, título, briefing, prazo em minutos e efeitos (delegação, texto e duração opcional);
  - o incidente ativo com a contagem e "Encerrar" (desfecho e texto).
- [x] **Telão, modo crise:**
  - com incidente ativo no comitê, tela cheia com a faixa "URGENTE", o título, a contagem regressiva grande e as delegações atingidas;
  - depois do encerramento, o desfecho por 30 s.
  
  A contagem usa a diferença de relógio do telão. Respeita a opção de reduzir movimento: sem piscar.
- [x] **Sessão e Agora** (delegado):
  - cartão de alerta com a contagem;
  - a delegação atingida vê "Sua delegação está impedida: <texto>", e os controles aparecem desabilitados com esse motivo.
- [x] **Painel:** cartão com a contagem; na fila, as atingidas com o selo "impedida".

## Testes

Arquivos: `supabase/tests/35-incidente-crise.test.sql` e `tests/35-crise-com-prazo.spec.ts`.

- [x] pgTAP:
  - só a equipe de crise lança e encerra;
  - só os comitês do incidente o veem;
  - o efeito bloqueia `levantar_placa`, `enviar_ponto` e `votar` da atingida, e as outras seguem normais;
  - a nota de crise da atingida continua aceita;
  - efeito com `ate` vencido libera;
  - encerrar publica a atualização.
- [x] Ponta a ponta (TREINO): a equipe lança uma crise de 20 minutos que deixa o Brasil sem voz; o telão entra em modo crise com a contagem; o Brasil vê "impedida pela crise" e perde o formulário de ponto ou moção; a equipe encerra como resolvida; o telão mostra o desfecho e o formulário volta.
- [x] Capturas do telão em modo crise e com o desfecho (passo 41: `telao-crise.png` e `telao-desfecho.png`).

## Pronto quando

- [x] A equipe de crise cria um momento de tensão com prazo em segundos, e todos no comitê sentem.
- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
