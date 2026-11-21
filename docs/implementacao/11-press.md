# Passo 11 · Press

**Parte de:** piloto
**Depende de:** 06
**Objetivo:** a press de cada comitê publica na hora, sem aprovação, com plantão no telão e moderação só se precisar.

As redes da press são separadas das institucionais: `@press.ufrgsmun` para a press e `@ufrgsmun` para o evento. A coletiva de imprensa acontece no fim do terceiro dia.

## Como ficou

- **Diretoria da Press:** no piloto, usa uma conta da secretaria (aprova, oculta e lê denúncias). Um papel próprio, só com esses poderes, vem com a coletiva no passo 17.
- **Endereço do veículo:** `/press/[sigla do comitê]`, já que cada comitê tem um veículo; a matéria aberta vai em `?n=<id>`.
- **Urgente:** é o tipo `nota_urgente`, sem a coluna `urgente` separada.
- **Citação:** em vez de um aviso novo, a Agora tem o cartão "Na press" com as últimas matérias que citam a delegação.
- **Imagem:** pede uma descrição (texto alternativo); sem ela, a publicação com imagem é recusada.
- `noticia` guarda também o `comite_id` do veículo, para o filtro do tempo real (feed e telão). A capa acompanha o evento todo (`assinarEvento`).
- O telão mostra o plantão mais recente, de crise ou da press, por 5 minutos.
- O aviso de palavrão fica em `src/lib/palavroes.ts`.

## Banco

```sql
create table veiculo (
  id uuid primary key default gen_random_uuid(),
  comite_id uuid not null unique references comite,  -- uma press por comitê
  nome text not null,                                 -- "El País"
  linha_editorial text
);

create table noticia (
  id uuid primary key,                                -- gerado no aparelho
  veiculo_id uuid not null references veiculo,
  autor_id uuid not null references pessoa,
  tipo text not null,                                 -- nota_urgente, reportagem, entrevista, opiniao, charge
  titulo text not null,
  linha_fina text,
  texto text not null,
  imagem_path text,
  data_simulacao date,                                -- comitês históricos
  urgente boolean not null default false,
  status text not null default 'publicada',           -- publicada, aguardando (revisão opcional), oculta
  motivo_ocultacao text,
  publicada_em timestamptz not null default now()
);

create table citacao (noticia_id uuid, delegacao_id uuid, primary key (noticia_id, delegacao_id));
create table denuncia (noticia_id uuid, autor_id uuid, motivo text, criado_em timestamptz default now());
create table registro (id bigint generated always as identity, pessoa_id uuid, acao text, alvo uuid, detalhe text, em timestamptz default now());
```

## Regras

- **Publicar:** a press insere direto no próprio veículo. Se `regras.press_revisao` estiver ligada no comitê, a notícia entra como `aguardando` até a Diretoria da Press aprovar. O padrão é desligado.
- **Aviso de palavrão:** antes de publicar, o app compara o texto (sem acentos) com uma lista em português, inglês e espanhol e avisa a press. O aviso não bloqueia a publicação.
- **Ocultar:** `ocultar_noticia(id, motivo)`, só para a mesa da press. Grava em `registro`.
- **Denúncia:** qualquer participante pode denunciar uma notícia.
- **Citação:** ao publicar, cada delegação citada recebe um aviso na Agora.

## Telas

| Tela | Celular | Notebook |
|---|---|---|
| Capa `/press` | Manchetes de todos os veículos, uma coluna | Grade de manchetes |
| Veículo `/press/[veiculo]` | Feed do veículo | Feed com a matéria aberta ao lado |
| Escrever `/press/escrever` | Formulário em uma coluna | Formulário à esquerda e prévia à direita |
| Telão | Não se aplica | Notícia urgente aparece como plantão do comitê |

**Imagens:** reduzidas no aparelho antes do envio (até 1280 px, WebP), no bucket `press`.

## Testes

Arquivos: `supabase/tests/11-press.test.sql`, `src/lib/palavroes.test.ts` e `tests/11-press.spec.ts`.

- [x] pgTAP: a press de um veículo não publica em outro, e delegados não publicam.
- [x] pgTAP: notícia oculta some para todos, menos para a Diretoria da Press (e a press do veículo), e a ocultação fica em `registro`.
- [x] pgTAP: com a revisão ligada, a notícia `aguardando` não aparece para o público.
- [x] pgTAP: qualquer participante denuncia, e só a Diretoria da Press lê as denúncias.
- [x] pgTAP: ao publicar, cada delegação citada fica registrada e vê a citação (a de outro evento, não).
- [x] Vitest: a checagem de palavrões encontra variações com e sem acento nas três línguas, sem acusar palavras comuns parecidas.
- [x] Ponta a ponta: uma matéria publicada no celular, com imagem, aparece na capa (sem recarregar) e no feed do veículo; a delegação citada a vê na Agora.
- [x] Ponta a ponta: denunciada, a matéria é ocultada pela Diretoria da Press e some da capa.
- [x] Ponta a ponta: uma notícia urgente aparece no telão do comitê.

## Pronto quando

- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [x] A press do comitê de teste publica do celular, e a matéria chega à capa e ao telão.
- [x] A delegação citada é avisada.
- [x] Ocultar uma matéria fica registrado.
