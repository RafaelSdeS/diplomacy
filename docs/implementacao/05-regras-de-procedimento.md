# Passo 05 · Regras de procedimento

**Parte de:** piloto
**Depende de:** 02
**Objetivo:** transformar o Guia de Regras do UFRGSMUN em configuração, com os cálculos feitos no banco.

## Formato

Valem, nesta ordem (a última vence): os padrões do Guia de Regras, gravados na migração (`regras_do_guia()`), o padrão do evento (`evento.regras_padrao`) e os ajustes de cada comitê (`comite.regras`). Assim toda chave sempre tem valor, e o evento e o comitê só guardam o que muda.

```json
{
  "quorum_fracao": [1, 3],
  "informal_informal_max_min": 45,
  "aviso_fala_seg": 10,
  "limite_notas_pendentes": 2,
  "votacao_substantiva": "maioria_simples",
  "membros_permanentes": [],
  "assinaturas_projeto_fracao": [1, 5],
  "assinaturas_emenda": 3,
  "reabrir_clausula_min_delegacoes": 3,
  "dpos_publicos": false,
  "mesa_le_bilhetes": false,
  "press_revisao": false
}
```

- `votacao_substantiva` aceita `maioria_simples`, `csnu` ou `unanimidade`. No CSNU, `membros_permanentes` lista as cinco delegações com veto.
- `reabrir_clausula_min_delegacoes`, `dpos_publicos` e `mesa_le_bilhetes` não vêm do guia: são decisões da organização, com padrões provisórios.

## Banco

Migração `supabase/migrations/20261122090000_regras.sql`:

- [x] `regras(comite_id) returns jsonb`: junta o guia, o padrão do evento e os ajustes do comitê. Roda com as permissões de quem chama: quem não vê o comitê recebe `null`.
- [x] `quorum(comite_id) returns int`: a fração do quórum (1/3) das delegações previstas, arredondada para cima. Delegações suspensas não contam como previstas.
- [x] `maioria_simples(base int) returns int`: o primeiro número inteiro acima da metade da base.
- [x] `dois_tercos(base int) returns int`: dois terços da base, arredondados para cima (conta só com inteiros).
- [x] `regras_validas(jsonb)`: só chaves conhecidas, cada uma com o tipo certo. É uma restrição (`check`) de `evento.regras_padrao` e de `comite.regras`.
- [x] Só a secretaria altera o evento e os comitês dele, e com isso as regras.

A **base** é o quórum da sessão, como diz o guia. Falta confirmar com a organização se isso significa as delegações presentes, e se as delegações suspensas (como Cuba na OEA) ficam fora do quórum.

## Interface

- [x] `src/lib/regras.ts`: o tipo `Regras` em TypeScript e `regrasLegiveis`, que escreve cada regra por extenso, agrupada em Sessão, Votações, Documentos e Comunicação.
- [x] `/comite/[sigla]/regras`: tela só de leitura com as regras do comitê e o quórum de hoje ("5 de 15 delegações"), com link na página do comitê. No piloto, as regras são editadas pelo seed; uma tela de edição fica para depois.
- [x] A busca do comitê pela sigla foi para `src/routes/comite/[sigla]/+layout.ts`, compartilhada pela página do comitê e pela de regras.
- [x] No menu, "Comitê" continua marcado nas subtelas (`aria-current="true"`).

## Dados

- [x] As regras do UFRGSMUN 2026 já vêm do guia (`regras_do_guia()`), então o seed grava só o ajuste do CSNU no comitê de teste: `votacao_substantiva = csnu`, com China, EUA, França, Reino Unido e Rússia como membros permanentes (pelo nome da delegação no comitê).

## Testes

Arquivos: `supabase/tests/05-regras.test.sql` (20 testes), `src/lib/regras.test.ts` (5 testes) e `tests/05-regras.spec.ts`.

Os exemplos do próprio guia viram casos de teste:

- [x] pgTAP: `maioria_simples(20) = 11` e `maioria_simples(41) = 21`.
- [x] pgTAP: `dois_tercos(10) = 7` e `dois_tercos(21) = 14`.
- [x] pgTAP: o `quorum` de um comitê com 15 delegações previstas é 5 (uma 16ª, suspensa, não conta).
- [x] pgTAP: em `regras()`, o ajuste do comitê vence o padrão do evento, uma chave que o comitê não define vem do padrão do evento, e uma que nenhum dos dois define vem do guia; o ajuste de um comitê não vaza para outro.
- [x] pgTAP: só a secretaria do evento altera as regras (nem o delegado, nem a secretaria de outro evento).
- [x] pgTAP: regras inválidas (fração com zero, tipo de votação ou chave desconhecidos) são recusadas.
- [x] Vitest: cada regra vira um texto legível, como "Informal-informal: até 45 minutos por sessão", com singular e plural e os membros permanentes em ordem alfabética.
- [x] Ponta a ponta: a tela de regras do comitê de teste mostra a regra do CSNU e o quórum.
- [x] Acessibilidade: axe sem erros nos dois temas; a tela entra no teste de reflow com 320 px.

## Pronto quando

- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores: 86 do banco, 17 de unidade e 110 de ponta a ponta.
- [x] Os testes com os exemplos do guia passam.
- [x] O comitê de teste mostra suas regras, com a regra do CSNU, no celular e no notebook.
