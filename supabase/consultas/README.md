# Consultas do piloto

Métricas da sessão de teste (passo 12). Só leem dados e não mostram nomes de pessoas.

```sh
npx supabase db query --remote --file supabase/consultas/crise-tempo-de-resposta.sql
```

Sem `--remote`, rodam no banco local.

| Arquivo | O que mede |
|---|---|
| `crise-tempo-de-resposta.sql` | Tempo médio e máximo entre o envio de uma nota de crise e a resposta, por comitê |
| `crise-sem-resposta.sql` | Notas sem resposta no fim de cada sessão |
| `projeto-ate-votacao.sql` | Tempo do envio do projeto à mesa até a abertura da votação, e o resultado |
| `press-publicadas.sql` | Matérias por veículo e por dia, publicadas, aguardando e ocultas |

O app não registra quem leu cada matéria (dado pessoal sem necessidade, pela LGPD). Para
saber se a press foi lida, pergunte no questionário (veja `docs/piloto.md`).
