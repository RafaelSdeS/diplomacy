# Passo 11 · Press

**Parte de:** piloto
**Depende de:** 06
**Objetivo:** a press de cada comitê publica na hora, sem aprovação, com plantão no telão e moderação só se precisar.

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

Arquivos: `supabase/tests/11-press.test.sql`, `src/lib/press/palavroes.test.ts` e `tests/11-press.spec.ts`.

- [ ] pgTAP: a press de um veículo não publica em outro, e delegados não publicam.
- [ ] pgTAP: notícia oculta some para todos, menos para a mesa da press, e a ocultação fica em `registro`.
- [ ] pgTAP: com a revisão ligada, a notícia `aguardando` não aparece para o público.
- [ ] pgTAP: qualquer participante denuncia, e só a mesa da press lê as denúncias.
- [ ] pgTAP: ao publicar, cada delegação citada recebe um aviso.
- [ ] Vitest: a checagem de palavrões encontra variações com e sem acento nas três línguas, sem acusar palavras comuns parecidas.
- [ ] Ponta a ponta: uma matéria publicada no celular aparece na capa e no feed do veículo.
- [ ] Ponta a ponta: uma notícia urgente aparece no telão do comitê.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [ ] A press do comitê de teste publica do celular, e a matéria chega à capa e ao telão.
- [ ] A delegação citada é avisada.
- [ ] Ocultar uma matéria fica registrado.
