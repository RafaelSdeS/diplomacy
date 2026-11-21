# Passo 39 · Testes e CI mais rápidos

**Depende de:** 38
**Esforço:** M
**Objetivo:** desenvolver sem esperar o CI a cada mudança, sem tirar nenhum teste. As capturas de tela passam a ser geradas no computador, os testes rodam em paralelo e o CI se divide em frentes.

## Por quê

Medido nas últimas 40 execuções do CI (21/11/2026):

- O CI levava cerca de 8 min, dos quais 5,7 min eram os testes de ponta a ponta, num processo só.
- Metade das execuções falhou, a maioria por diferença nas capturas de tela.
- Cada mudança visual custava três execuções (~24 min): falhar, gerar as capturas por `workflow_dispatch`, baixar o artefato, fazer o commit e mandar de novo.
- Em cada execução, de 1 a 3 testes só passavam na segunda tentativa, e o `retries: 1` escondia isso.
- No computador, rodar em paralelo falhava: vários arquivos mexiam na sessão do mesmo comitê ao mesmo tempo.
- A altura de `presidencia.png` dependia dos dados que os testes anteriores deixavam.

## Como ficou

**Um comitê por arquivo de teste.**
- Os arquivos que mexem na sessão, na crise ou nos documentos de um comitê de teste usam uma cópia só deles: `ISOLADOS` e `isolado('NN')`, em `scripts/delegacoes.ts`.
- O seed cria cada cópia com as mesmas delegações e regras do original, e as mesmas contas com `+NN` no e-mail. Exemplo: `mesa-ce+28@exemplo.test` preside a `CE-T-28`.
- Nos testes, `C.sigla` e `C.conta(...)` substituem a sigla e as contas do original.
- Os arquivos que só leem continuam nos comitês de sempre.

**Capturas no contêiner.**
- As capturas só são comparadas dentro de `mcr.microsoft.com/playwright:v1.65.1-noble`: o teste pula quando falta `CAPTURAS=1`.
- O CI roda os testes de ponta a ponta nesse contêiner, e `npm run capturas` (`scripts/capturas.sh`) usa o mesmo contêiner no computador. O script:
  - zera o banco local;
  - roda o seed e a build;
  - roda os arquivos que têm capturas, com `--update-snapshots`.
- As imagens novas aparecem no `git diff`, para conferir antes do commit.
- O telão do 06 não espera mais 22 s pela grade de votos: `page.clock` pula os 30 s.

**CI em três frentes paralelas** (`.github/workflows/ci.yml`):

| Frente | O que roda |
|---|---|
| `rapido` | Checagem de tipos, textos fixos, unidade, build e tamanho, sem Docker |
| `banco` | Supabase, seed duas vezes, pgTAP, tipos do banco em dia e demonstração duas vezes |
| `ponta-a-ponta` | Três partes (`--shard`), cada uma com o próprio Supabase e um processo só, porque o limite de 100 mensagens por segundo do tempo real é por instância. O Supabase sobe enquanto a build e o download do contêiner acontecem |

- Um push novo cancela a execução anterior do mesmo ramo.
- Mudança só em `docs/` ou em arquivos `.md` não roda o CI.
- O `atualizar_capturas` continua como reserva: cada parte sobe um artefato `capturas-N`.

**No computador:**

| Comando | Quando |
|---|---|
| `npm run rapido` | Antes de cada commit (check, textos e unidade) |
| `npx playwright test tests/NN-*.spec.ts --project=notebook` | O passo em andamento |
| `npx playwright test` | A suíte inteira, em paralelo, sem as capturas |
| `npm run capturas` | Quando a aparência mudou de propósito |

O push vai sem esperar o CI, e o que falhar lá se conserta em seguida.

## Testes

- [x] A suíte inteira passa no computador com os workers padrão.
- [x] `npm run capturas` regrava as referências, e o CI as aceita sem mudança (f769bab, CI verde).
- [ ] Três execuções verdes seguidas no CI. Depois disso, ligar `failOnFlakyTests` e testar `workers: 2` por parte.
