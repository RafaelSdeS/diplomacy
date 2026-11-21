# Passo 35 · Crise com prazo

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), item 15)
**Depende de:** 31 e 32
**Esforço:** M–G
**Objetivo:** a equipe de crise lança um incidente tenso e inesperado, com prazo, que toma o telão, chega ao celular de todos e pode deixar delegações sem voz. Exemplos: o delegado russo "assassinado" por rebeldes do Sahel no UNOCT; o representante da Polônia sequestrado no Conselho Europeu.

## Hoje

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

- [ ] Tabela `incidente_crise`:
  - `id`, `evento_id`, `titulo` (até 120), `texto` (até 3000), `prazo timestamptz not null`;
  - `desfecho text check (desfecho in ('resolvido', 'fracassou'))`, `desfecho_texto`;
  - `autor_id`, `criado_em`, `encerrado_em`.
- [ ] Tabela `incidente_comite` (`incidente_id`, `comite_id`, `evento_id`), como `atualizacao_comite`.
- [ ] Tabela `incidente_efeito`:
  - `incidente_id`, `comite_id`, `delegacao_id`;
  - `texto` (até 200, como "Delegado assassinado por rebeldes do Sahel");
  - `ate timestamptz` (nulo: até o fim do incidente).
- [ ] RLS:
  - quem participa de um comitê do incidente lê o incidente e os efeitos;
  - a equipe de crise e a mesa desses comitês leem tudo;
  - sem escrita direta.
- [ ] `lancar_incidente(p_comites uuid[], p_titulo, p_texto, p_minutos int, p_efeitos jsonb)`: exige o papel `crise` em todos os comitês; cria tudo numa transação.
- [ ] `encerrar_incidente(p_id, p_desfecho, p_texto)`: equipe de crise; grava o desfecho e chama `publicar_atualizacao` com "Desfecho: …".
- [ ] `delegacao_sem_voz(p_delegacao) returns boolean` (stable): existe efeito com incidente não encerrado e `ate` nulo ou futuro.
- [ ] `create or replace function public.exigir_delegacao` (a versão do passo 31): recusa com "Sua delegação está impedida pela crise." quando `delegacao_sem_voz`. Também em `validar_voto` (votos da delegação e os registrados pela mesa).
- [ ] Broadcast:
  - em `incidente_comite` e `incidente_efeito`, `transmitir('comite', 'comite_id', 'crise', 'comite_id')`;
  - em `incidente_crise`, `transmitir('evento', 'evento_id')`.
- [ ] Notificação push no lançamento, pelo mesmo caminho das notificações do passo 15 (`push_a_enviar` e a função `enviar-push`).
- [ ] Regenerar os tipos.

## Telas

- [ ] **Equipe** (`/crise/[sigla]`):
  - formulário "Lançar incidente": comitês, título, briefing, prazo em minutos e efeitos (delegação, texto e duração opcional);
  - o incidente ativo com a contagem e "Encerrar" (desfecho e texto).
- [ ] **Telão, modo crise:**
  - com incidente ativo no comitê, tela cheia com a faixa "URGENTE", o título, a contagem regressiva grande e as delegações atingidas;
  - depois do encerramento, o desfecho por 30 s.
  
  A contagem usa a diferença de relógio do telão. Respeita a opção de reduzir movimento: sem piscar.
- [ ] **Sessão e Agora** (delegado):
  - cartão de alerta com a contagem;
  - a delegação atingida vê "Sua delegação está impedida: <texto>", e os controles aparecem desabilitados com esse motivo.
- [ ] **Painel:** cartão com a contagem; na fila, as atingidas com o selo "impedida".

## Testes

Arquivos: `supabase/tests/35-incidente-crise.test.sql` e `tests/35-crise-com-prazo.spec.ts`.

- [ ] pgTAP:
  - só a equipe de crise lança e encerra;
  - só os comitês do incidente o veem;
  - o efeito bloqueia `levantar_placa`, `enviar_ponto` e `votar` da atingida, e as outras seguem normais;
  - a nota de crise da atingida continua aceita;
  - efeito com `ate` vencido libera;
  - encerrar publica a atualização.
- [ ] Ponta a ponta, com relógio controlado: a equipe lança um incidente de 1 minuto com efeito sobre a Rússia; o telão entra em modo crise; a Rússia vê os controles desabilitados; a equipe encerra como resolvido; o telão mostra o desfecho e a Rússia volta a levantar a placa.
- [ ] Capturas do telão em modo crise e com o desfecho.

## Pronto quando

- [ ] A equipe de crise cria um momento de tensão com prazo em segundos, e todos no comitê sentem.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
