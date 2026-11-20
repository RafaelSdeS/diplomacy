# Passo 05 · Regras de procedimento

**Parte de:** piloto
**Depende de:** 02
**Objetivo:** transformar o Guia de Regras do UFRGSMUN em configuração, com os cálculos feitos no banco.

## Formato

O padrão do evento fica em `evento.regras_padrao`, e os ajustes de cada comitê em `comite.regras`. Quando os dois definem a mesma chave, vale a do comitê.

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

- `regras(comite_id) returns jsonb`: junta o padrão do evento com os ajustes do comitê.
- `quorum(comite_id) returns int`: 1/3 das delegações previstas, arredondado para cima.
- `maioria_simples(base int) returns int`: o primeiro número inteiro acima da metade da base.
- `dois_tercos(base int) returns int`: dois terços da base, arredondados para cima.

A **base** é o quórum da sessão, como diz o guia. Falta confirmar com a organização se isso significa as delegações presentes.

## Interface

- `src/lib/regras/`: o tipo `Regras` em TypeScript e textos para mostrar cada regra de forma legível.
- `/comite/[sigla]/regras`: tela só de leitura com as regras do comitê. No piloto, as regras são editadas pelo seed; uma tela de edição fica para depois.

## Dados

O seed grava as regras do UFRGSMUN 2026 como padrão do evento e o ajuste do CSNU no comitê de teste: `votacao_substantiva = csnu`, com EUA, Rússia, Reino Unido, França e China como membros permanentes.

## Testes (pgTAP)

Os exemplos do próprio guia viram casos de teste:

- [ ] `maioria_simples(20) = 11` e `maioria_simples(41) = 21`.
- [ ] `dois_tercos(10) = 7` e `dois_tercos(21) = 14`.
- [ ] `quorum` de um comitê com 15 delegações previstas é 5.
- [ ] O ajuste do comitê vence o padrão do evento em `regras()`.

## Pronto quando

- [ ] Os testes com os exemplos do guia passam.
- [ ] O comitê de teste mostra suas regras, com a regra do CSNU, no celular e no notebook.
