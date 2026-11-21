# Passo 15 · Offline, PWA e notificações

**Parte de:** evento
**Depende de:** 13
**Objetivo:** o app abre sem internet, não perde nada escrito offline e gasta pouco da internet móvel.

## Como ficou

- **Service worker** em `src/service-worker/` (o SvelteKit 3 pede uma pasta com tsconfig próprio): a interface de cada versão fica no aparelho, e a versão nova apaga as antigas. As leituras da API ficam guardadas (rede primeiro; sem rede, a última resposta). As funções só de leitura usadas nas telas passaram a ir por GET (`{ get: true }`), para entrarem no cache; `agora` continua por POST, porque uma hora guardada estragaria o relógio. Ao sair da conta, os dados guardados são apagados.
- **Layout raiz:** as participações e o nome ficam em memória (`src/lib/conta.ts`) e só recarregam ao trocar de conta, ao sair ou depois de editar o perfil.
- **Caixa de saída** (`src/lib/caixa-de-saida.ts`, com `idb-keyval`): notas de crise, matérias (com a imagem já reduzida) e propostas de alteração. A proposta ganhou o id do aparelho (`propor_alteracao(..., p_id)`). Erro de rede ou login vencido: o item fica e é reenviado; erro do banco: o item sai e a tela mostra o motivo. O cabeçalho mostra "Sem conexão" e "N para enviar". Bilhetes ficam para o passo 17.
- **Laço de recargas (achado ao medir o consumo):** o componente ao vivo reassinava o canal a cada recarga da tela (o `data` novo mudava a dependência do efeito), e o canal já conectado mandava recarregar de novo. Eram 157 recargas em 5 atualizações. Agora o efeito depende só de uma chave de texto, e avisos em rajada viram uma recarga só (100 ms). O mesmo valia para os avisos do layout.
- **Consumo medido** (`tests/15-offline.spec.ts`, Supabase local, sem compressão): cerca de 7 KB por atualização da sessão no celular de um delegado, ou uns 2,4 MB numa sessão de 2 h com uma mudança a cada 20 s. Um dia de 4 sessões fica perto de 10 MB, bem abaixo de um pacote de dados comum. Em 21/11/2026, depois dos passos 20 a 38, a medida era 10,2 KB (sessão) e 15,0 KB ("Agora"); o passo 40 baixou para 3,6 KB e 4,1 KB, relendo só o que mudou. Na nuvem, as respostas vêm comprimidas e gastam menos.
- **Notificações (bônus):** só as importantes, avisos da organização e a resposta da crise a uma nota da delegação (só o título da nota, porque a notificação aparece na tela bloqueada). Cada pessoa ativa no perfil, por aparelho; sair da conta desativa naquele aparelho. O app chama a Edge Function `enviar-push` depois de publicar; ela pede ao banco os destinatários e o texto no idioma de cada um (`push_a_enviar`), e cada aviso ou nota sai uma vez só, mesmo que a função seja chamada de novo. As chaves VAPID ficam nos segredos do Supabase (veja `docs/publicar.md`). Se o app fechar entre publicar e pedir o envio, a notificação não sai; o aviso aparece no app do mesmo jeito.

## O que construir

### PWA

- [x] `src/service-worker/` (o service worker nativo do SvelteKit): guarda no aparelho a interface e os arquivos de cada versão.
- [x] Dados lidos recentemente (cronograma, perfis, pauta, guias abertos) também ficam em cache.
- [x] O layout raiz deixa de consultar as participações e o nome a cada troca de tela: hoje são duas consultas por navegação. Guardar em memória e recarregar só em `app:sessao`.
- [x] `manifest.webmanifest` com nome, ícones, `display: standalone` e cores do tema.

### Caixa de saída

- [x] Notas de crise, matérias e propostas de alteração (os bilhetes chegam no passo 17) vão para uma caixa de saída no IndexedDB (`idb-keyval`).
- [x] O envio é tentado na hora. Se falhar, o item fica guardado e é reenviado no evento `online`, quando o app volta ao primeiro plano (`visibilitychange`) e quando o app abre.
- [x] O Safari não tem Background Sync, então nada depende disso.
- [x] Os IDs são gerados no aparelho, e o banco usa `on conflict do nothing`: reenviar nunca duplica.
- [x] Indicador discreto de conexão e de itens esperando na caixa de saída.

### Notificações (bônus)

- [x] Web Push com chaves VAPID, assinatura salva por pessoa e uma Edge Function para enviar.
- [x] No iPhone só funciona com o app adicionado à tela inicial (o perfil explica como). Nenhuma função depende de notificação: a Agora e o telão continuam sendo o canal principal.

### Consumo de dados

- [x] Medir quanto um delegado gasta num dia simulado de sessões. A meta é ficar bem abaixo de um pacote de dados comum.

## Testes

Arquivos: `src/lib/caixa-de-saida.test.ts`, `tests/15-offline.spec.ts` e, para as notificações, `supabase/tests/15-notificacoes.test.sql` e `tests/15-notificacoes.spec.ts`.

- [x] Vitest (com `fake-indexeddb`): um item que falhou fica guardado, é reenviado quando a rede volta e só sai da caixa depois de confirmado.
- [x] Vitest: dois reenvios do mesmo item não geram dois envios ao mesmo tempo.
- [x] Ponta a ponta: com a rede desligada no meio da sessão (`context.setOffline`), uma nota escrita offline chega ao reconectar, uma vez só.
- [x] Ponta a ponta: o app abre sem rede depois do primeiro acesso.
- [x] Ponta a ponta: uma nova versão do app substitui a antiga no cache.
- [x] pgTAP: cada pessoa vê só os próprios aparelhos; o aviso vai ao evento (ou ao comitê), no idioma de cada um, e sai uma vez só; a resposta da crise vai só à delegação; o app não pede os destinatários direto.
- [x] Ponta a ponta: ativar no perfil guarda o aparelho, um aviso publicado dispara o envio pela Edge Function, a mensagem que chega vira notificação, e desativar remove o aparelho.
- [ ] Manual: modo avião num Android e num iPhone reais, e notificação push num Android e num iPhone com o app na tela inicial.

## Pronto quando

- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [x] Nada escrito sem conexão se perde nem se duplica.
- [x] O app abre sem internet.
- [x] O consumo de dados de um dia está medido e documentado.
