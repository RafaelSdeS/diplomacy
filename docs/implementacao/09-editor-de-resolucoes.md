# Passo 09 · Editor de resoluções

**Parte de:** piloto
**Depende de:** 07
**Objetivo:** escrever working papers e projetos de resolução em blocos, com redator, cláusulas, rodadas com fim e cláusula acordada travada.

## Banco

```sql
create table bloco (
  id uuid primary key default gen_random_uuid(),
  comite_id uuid not null references comite,
  nome text not null                          -- pode ser "Aliança dos Estados do Sahel"
);

create table bloco_membro (
  bloco_id uuid references bloco, delegacao_id uuid references delegacao,
  redator boolean not null default false,
  primary key (bloco_id, delegacao_id)
);

create table documento (
  id uuid primary key default gen_random_uuid(),
  comite_id uuid not null references comite,
  bloco_id uuid references bloco,
  tipo text not null,                         -- working_paper, projeto, resolucao_crise (dpo e carta: passo 10)
  numero int,
  titulo text not null,
  ponto_pauta_id uuid references ponto_pauta, -- subtópico do working paper
  atualizacao_crise_id uuid references atualizacao_crise,
  status text not null default 'rascunho',    -- rascunho, enviado, aprovado_mesa, em_votacao, aprovado, rejeitado
  clausula_em_foco_id uuid,
  max_rodadas int not null default 3
);

create table clausula (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references documento on delete cascade,
  tipo text not null check (tipo in ('preambular', 'operativa', 'subitem')),
  pai_id uuid references clausula,
  ordem numeric not null,
  texto text not null,
  status text not null default 'proposta',    -- proposta, em_discussao, acordada
  versao int not null default 1,
  origem_id uuid references clausula          -- de onde veio, na fusão
);

create table proposta_alteracao (clausula_id uuid, delegacao_id uuid, texto_novo text, status text default 'aberta', ...);
create table comentario (clausula_id uuid, autor_id uuid, texto text, estacionado boolean default false, criado_em timestamptz, ...);
create table nota_bloco (bloco_id uuid, autor_id uuid, texto text, ...);        -- anotações soltas, fora do texto oficial
create table rodada (documento_id uuid, numero int, inicio timestamptz, fim timestamptz, ...);
create table assinatura (documento_id uuid, delegacao_id uuid, primary key (documento_id, delegacao_id));
create table termometro (clausula_id uuid, delegacao_id uuid, opcao text check (opcao in ('manter', 'alterar', 'remover')), ...);
```

## Regras no banco

- Só o redator altera o texto de uma cláusula. Os outros membros do bloco propõem alterações.
- Concorrência: `update clausula ... where id = $1 and versao = $2`. Se nenhuma linha mudar, houve conflito, e o app recarrega a cláusula.
- Cláusula `acordada` fica travada. Para reabrir, é preciso o pedido de um número mínimo de delegações, definido nas regras.
- Rodadas: abrir uma rodada exige que a anterior tenha terminado e respeita `max_rodadas`. Depois da última, o documento só pode ser enviado à mesa.
- Documento `enviado` fica travado. Daí em diante, mudanças só por emenda (passo 16).

## Formatação (TypeScript, funções puras)

- Cláusulas numeradas pela ordem; preambulares terminam com ponto e vírgula; a última operativa termina com ponto, como nos documentos do UNOCT.
- A linha do comitê sai do `nome_oficial` e do idioma do comitê, por exemplo "The United Nations Office of Counter-Terrorism:".
- Os signatários saem do `nome_oficial` das delegações que assinaram.
- Verbos sugeridos ao começar uma cláusula, vindos do guia de vocabulário (inglês) e da tradução (português), em `src/lib/regras/verbos.ts`.

## Telas

| Tela | Celular | Notebook |
|---|---|---|
| Blocos `/comite/[sigla]/blocos` | Lista de blocos e membros; criar e entrar | Igual |
| Documento `/documento/[id]` | Lista de cláusulas; um toque abre a conversa da cláusula | Cláusulas à esquerda e conversa da cláusula à direita |
| Comum às duas | Barra de progresso ("7 de 11 acordadas"), cláusula em foco destacada, tempo da rodada (ligado ao cronômetro da sessão), notas do bloco, botão de assinar e envio à mesa | |
| Fusão | Escolher cláusulas de dois ou mais working papers para um projeto | Working papers lado a lado |

O tempo real usa `clausula`, `proposta_alteracao` e `comentario`, filtrados por documento, em `src/lib/tempo-real.ts`.

## Testes

- [ ] Vitest: numeração, pontuação, linha do comitê e signatários.
- [ ] pgTAP: quem não é redator não altera o texto; cláusula acordada não muda; conflito de versão é detectado; documento enviado fica travado.
- [ ] Ponta a ponta: uma proposta aceita pelo redator aparece para todo o bloco.

## Pronto quando

- [ ] Um bloco de teste escreve um working paper por subtópico, junta os papers num projeto e envia à mesa.
- [ ] Tudo funciona no celular e no notebook.
