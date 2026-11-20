# Passo 15 · Offline, PWA e notificações

**Parte de:** evento
**Depende de:** 13
**Objetivo:** o app abre sem internet, não perde nada escrito offline e gasta pouco da internet móvel.

## O que construir

### PWA

- [ ] `src/service-worker.ts` (o service worker nativo do SvelteKit): guarda no aparelho a interface e os arquivos de cada versão.
- [ ] Dados lidos recentemente (cronograma, perfis, pauta, guias abertos) também ficam em cache.
- [ ] `manifest.webmanifest` com nome, ícones, `display: standalone` e cores do tema.

### Caixa de saída

- [ ] Notas de crise, bilhetes, matérias e propostas de alteração vão para uma caixa de saída no IndexedDB (`idb-keyval`).
- [ ] O envio é tentado na hora. Se falhar, o item fica guardado e é reenviado no evento `online`, quando o app volta ao primeiro plano (`visibilitychange`) e quando o app abre.
- [ ] O Safari não tem Background Sync, então nada depende disso.
- [ ] Os IDs são gerados no aparelho, e o banco usa `on conflict do nothing`: reenviar nunca duplica.
- [ ] Indicador discreto de conexão e de itens esperando na caixa de saída.

### Notificações (bônus)

- [ ] Web Push com chaves VAPID, assinatura salva por pessoa e uma Edge Function para enviar.
- [ ] No iPhone só funciona com o app adicionado à tela inicial. Nenhuma função depende de notificação: a Agora e o telão continuam sendo o canal principal.

### Consumo de dados

- [ ] Medir quanto um delegado gasta num dia simulado de sessões. A meta é ficar bem abaixo de um pacote de dados comum.

## Testes

- [ ] Ponta a ponta: modo avião no meio da sessão, uma nota escrita offline chega ao reconectar, uma vez só.
- [ ] Ponta a ponta: o app abre sem rede depois do primeiro acesso.
- [ ] Teste manual em Android e iPhone reais.

## Pronto quando

- [ ] Nada escrito sem conexão se perde nem se duplica.
- [ ] O app abre sem internet.
- [ ] O consumo de dados de um dia está medido e documentado.
