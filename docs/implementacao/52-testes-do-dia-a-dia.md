# Passo 52 · Testes rápidos no dia a dia

**Parte de:** pedido de 24/11/2026 ("os testes demoram muito, tendo que refazê-los constantemente")
**Depende de:** 39
**Esforço:** P a M
**Quando:** antes dos lotes do passo 51, porque cada lote roda os testes várias vezes.
**Objetivo:** depois de mexer numa tela, o retorno vem em menos de 30 segundos. A suíte inteira roda uma vez antes de subir, e o CI continua cobrindo tudo em segundo plano.

## Por quê

Medido no passo 47 (24/11/2026):

- **Cada rodada local refaz a build**, de 20 a 30 s, mesmo quando só um teste mudou. O `webServer` do Playwright roda `npm run build && npm run preview` toda vez.
- **A suíte inteira leva de 1,3 a 1,9 min** (cerca de 255 testes em três tamanhos de tela). Ela rodou de novo depois de quase toda mudança pequena, em vez de rodar só os testes da tela mexida.
- **`npm run capturas` leva cerca de 2 min**, porque zera o banco, roda o seed e a build e depois as capturas, mesmo quando só uma tela mudou.
- **Esperas fixas:** o desfazer espera 5 s de verdade, e telas ao vivo esperam até 10 s pela conexão.
- **Testes instáveis obrigam a repetir a suíte:** no 47 falharam por tempo, e não por defeito, o editor (dois `status` ao mesmo tempo) e o login de um teste do perfil.

## O que construir

1. **Rodar só o que mudou.** `npm run testar:mudou` roda os testes da tela mexida, sem refazer a build se `src/` e `static/` não mudaram desde a última. O `webServer` só refaz a build quando há arquivo mais novo que `build/`.
2. **Mapa de tela para teste**. Um script lista os arquivos de teste que citam as telas e componentes alterados (`git diff --name-only`). O `--only-changed` do Playwright não basta: os testes de ponta a ponta não importam as telas.
3. **Sem espera fixa.** O desfazer usa o relógio do Playwright (`page.clock`) nos testes, e o tempo de espera vem de uma constante que o teste pode encurtar. Toda espera por "ao vivo" passa pelo mesmo auxiliar, com o limite num lugar só.
4. **Capturas de uma tela só.** `npm run capturas -- tests/06-sessao.spec.ts` regrava só as daquele arquivo, e `--sem-reset` pula zerar o banco quando o seed é recente.
5. **Instáveis viram defeito.** Corrigir os dois casos do passo 47 e ligar `failOnFlakyTests` no CI, que estava pendente desde o passo 39. Um teste instável quebra o CI em vez de ser repetido em silêncio.
6. **Forma de trabalhar** (vale para quem programa, inclusive o agente):
   - a cada mudança, rodar só os testes da tela;
   - a suíte inteira, uma vez por item, antes do commit;
   - o CI, em segundo plano, depois do push;
   - capturas só quando o visual muda.

## Como ficou (24/11/2026)

- **Build só quando precisa:** `scripts/build-se-preciso.ts` compara o arquivo mais novo de `src/`, `static/` e da configuração com a marca `build/.feita`. O `webServer` do Playwright e o `npm run capturas` usam o script; o CI continua com a build própria.
- **`npm run testar:mudou`:** roda os testes ligados ao que mudou no disco e nos commits que ainda não subiram. Argumentos extras vão para o Playwright, como `-- --project=notebook`. O mapa sai do código, sem anotação à mão (`scripts/testes-da-mudanca.ts`, com teste de unidade):
  - um arquivo de `src/lib` leva às telas que o importam;
  - a tela leva aos testes que citam a rota dela;
  - o layout raiz, a Agora, o CSS, o banco e os auxiliares dos testes pedem a suíte inteira.
- **Sem espera fixa:** o desfazer lê `window.__esperaDesfazer`, e `desfazerRapido(page)` de `tests/ajuda.ts` a põe em 1 s. O relógio do Playwright (`page.clock`) ficou de fora porque atrapalha a medição do relógio do servidor nas telas ao vivo (ver o passo 39). As esperas por "ao vivo" de 10 s são limites, não esperas fixas, então ficaram.
- **Capturas de um arquivo:** `SEM_RESET=1 npm run capturas -- tests/47-modais.spec.ts`.
- **Instáveis:** `failOnFlakyTests` ligado no CI, porque as três últimas execuções não tiveram teste instável. O login dos testes espera até 15 s, o tempo que faltou sob carga. O caso do editor (dois `status`) sumiu com o passo 47: o aviso "N para enviar" virou botão.

**Medido:**

| Situação | Antes | Agora |
|---|---|---|
| Testes de uma tela, com a build em dia | cerca de 40 s (com build) | 12 s |
| Suíte inteira com build | de 1,7 a 2,3 min | 76 s |
| Capturas de um arquivo | cerca de 2 min (banco, seed, build e todas) | 4 s |

**Depois (24/11/2026, à noite):** com 10 processos locais, a carga da máquina passou de 30 e testes sem relação estouravam o tempo. O computador usa 6 processos (`workers: ci ? 2 : 6`): a suíte inteira leva cerca de 2,5 min com a máquina ocupada, sem falhas por tempo.

## Fora desta etapa

Tirar testes ou cobrir menos. Paralelizar mais no CI, que já leva cerca de 4 min.

## Testes

- [x] Mexer num componente de uma tela e rodar `npm run testar:mudou`: menos de 30 s, sem build nova se só o teste mudou.
- [x] O script de mapa acha os testes de uma tela alterada (teste de unidade com uma lista de arquivos de exemplo).
- [x] O teste do desfazer não espera 5 s de verdade.
- [ ] Três execuções seguidas do CI sem teste instável, com `failOnFlakyTests` ligado.
