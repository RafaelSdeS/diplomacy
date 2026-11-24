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

1. **Rodar só o que mudou.** `npm run testar:tela -- <arquivo>` roda os testes da tela mexida, sem refazer a build se `src/` e `static/` não mudaram desde a última. O `webServer` só refaz a build quando há arquivo mais novo que `build/`.
2. **Mapa de tela para teste**, mantido à mão no topo de cada arquivo de teste: `// telas: /comite/[sigla]/sessao, ui/FichaPonto`. Um script lista os arquivos de teste que citam as telas e componentes alterados (`git diff --name-only`). O `--only-changed` do Playwright não basta: os testes de ponta a ponta não importam as telas.
3. **Sem espera fixa.** O desfazer usa o relógio do Playwright (`page.clock`) nos testes, e o tempo de espera vem de uma constante que o teste pode encurtar. Toda espera por "ao vivo" passa pelo mesmo auxiliar, com o limite num lugar só.
4. **Capturas de uma tela só.** `npm run capturas -- tests/06-sessao.spec.ts` regrava só as daquele arquivo, e `--sem-reset` pula zerar o banco quando o seed é recente.
5. **Instáveis viram defeito.** Corrigir os dois casos do passo 47 e ligar `failOnFlakyTests` no CI, que estava pendente desde o passo 39. Um teste instável quebra o CI em vez de ser repetido em silêncio.
6. **Forma de trabalhar** (vale para quem programa, inclusive o agente):
   - a cada mudança, rodar só os testes da tela;
   - a suíte inteira, uma vez por item, antes do commit;
   - o CI, em segundo plano, depois do push;
   - capturas só quando o visual muda.

## Fora desta etapa

Tirar testes ou cobrir menos. Paralelizar mais no CI, que já leva cerca de 4 min.

## Testes

- [ ] Mexer num componente de uma tela e rodar `npm run testar:tela`: menos de 30 s, sem build nova se só o teste mudou.
- [ ] O script de mapa acha os testes de uma tela alterada (teste de unidade com uma lista de arquivos de exemplo).
- [ ] O teste do desfazer não espera 5 s de verdade.
- [ ] Três execuções seguidas do CI sem teste instável, com `failOnFlakyTests` ligado.
