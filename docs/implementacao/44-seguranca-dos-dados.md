# Passo 44 · Segurança dos dados e das sessões

**Parte de:** planos posteriores ([plano de segurança](../seguranca-online.md))
**Depende de:** 43
**Esforço:** M
**Objetivo:** nenhuma conta enxerga dados de outra, nem num aparelho compartilhado, nem depois de perder a participação. É o primeiro passo depois do 43 porque os seguintes (coletiva oral, demonstração pública) criam mais dados privados.

## O que construir

Ordem de trabalho:

1. **Cache offline por usuário** (decisão e regras em [seguranca-online.md](../seguranca-online.md#decisão-manter-a-leitura-offline-com-cache-por-usuário)): `dados-<sub>` com o `sub` do JWT, validade de 12 horas, lista de exclusão (texto de pergunta da coletiva, notas de crise e votos individuais), `private, no-store` nas respostas sensíveis. Em `src/service-worker/index.ts`. Dois cuidados:
   - **A exclusão olha a URL inteira**, caminho e `select`, não só o caminho: `/rest/v1/coletiva?select=*,coletiva_pergunta_texto(*)` traz o texto por embed (e as consultas do `lerAoVivo`, passo 40, juntam tabelas). As tabelas da lista, pelos nomes de hoje: `coletiva_pergunta_texto` (nova, passo 45), `nota_crise` (e `atualizacao_crise`, se trouxer texto privado) e `voto`. Decidir também se `anotacao` e `anotacao_compartilhada` (caderno) entram.
   - **O `activate` do service worker apaga todo cache fora de `[APP, IMUTAVEIS, DADOS]`.** Trocar `DADOS` por um teste de prefixo (`dados-`); senão cada versão nova do app esvazia o cache offline de todos. O `dados` global antigo sai nessa mesma limpeza.
2. **Limpeza de sessão:** logout e troca de conta apagam todos os `dados-*`, desativam o push e limpam rascunhos e dados locais; `401`/`403` apagam o cache do usuário (`src/routes/+layout.svelte`, função `sair()`). **A caixa de saída não some em silêncio:** se `caixa.pendentes()` (já lida em `+layout.svelte`) tiver itens, o logout só apaga depois de a pessoa ver um aviso com o `Confirmar` do passo 43 ("há N itens não enviados": enviar agora ou sair mesmo assim). O passo 47 reaproveita esse aviso na modal de saída completa. O `401`/`403` nunca apaga a caixa: o item volta a ser tentado quando a conta voltar.
3. **RLS e Storage:** revisar as políticas de cada objeto; Storage com URL assinada curta e regra por participante.
4. **Revogação:** revogar a participação encerra as sessões da conta e remove as inscrições de push.
5. **Trava dos scripts administrativos por projeto:** hoje `conectarAdmin` (`scripts/admin.ts`) só pede `DEMO_PERMITIR_REMOTO=1` (ou a variável equivalente do seed) para aceitar um projeto remoto. A flag não distingue a demonstração da produção: com a chave da produção no `.env`, o script semeia e reinicia dados reais. Passa a exigir também o `ref` do projeto liberado (`DEMO_PROJETO_REF=<ref>`, comparado com a URL) e nunca guardar a chave `service_role` da produção no mesmo `.env` da demonstração. O projeto separado em si é do passo 48.
6. **Cabeçalhos no Cloudflare** (`static/_headers`): `Content-Security-Policy` (primeiro em modo só de relatório, depois estrito, depois de validar scripts e fontes), `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`, `frame-ancestors`, e `Cache-Control: private` nas respostas autenticadas. Seguem o plano ([CSP e headers](../seguranca-online.md#csp-e-headers)).
7. **Resposta a incidente:** o roteiro de 14 itens do plano, escrito em `docs/` e com o responsável nomeado.

## Estado (23/11/2026)

Feito: cache `dados-<sub>` com 12 horas e exclusão pela URL inteira (`src/lib/cache-dados.ts`, `src/service-worker/index.ts`); limpeza no logout e quando outra aba sai (`+layout.svelte`), com aviso da caixa de saída; "Remover acesso" em *Secretaria → Participantes*, que encerra sessões e notificações (gatilho em `20261219090000_seguranca.sql`); `Cache-Control: private, no-store` nas respostas sensíveis (`db_pre_request`); trava por `ref` nos scripts; cabeçalhos em `static/_headers`; roteiro em [incidente.md](../incidente.md).

Decisões tomadas na implementação:

- **Votos fora da lista de exclusão.** São públicos no comitê e vêm embutidos na consulta da sessão; excluí-los quebraria a sessão sem rede (passo 15). Ficam excluídos o texto da coletiva e as notas de crise.
- **Leituras que nunca ficam no cache não tentam de novo** (`.retry(false)`): sem rede, a tela abre na hora, com o cartão vazio ou um aviso.
- **Caminhos absolutos no build** (`paths.relative: false`): o service worker serve a mesma página em qualquer rota sem rede, e com caminhos relativos uma rota funda ficava em branco.
- **A CSP completa está só em relatório.** Passa a obrigatória depois de conferir o console no app publicado (scripts embutidos precisam de hash antes).

Fica com você: os testes manuais em aparelhos compartilhados (lista abaixo) e conferir os avisos da CSP no console do app publicado.

## Fora desta etapa

Sistema de detecção, logs analíticos, auditoria externa e personalização de segurança por usuário. Ficam para depois: limites por pessoa (uploads, convites, denúncias) e a tabela de auditoria do plano, exceto o que a coletiva do passo 45 já registra.

## Testes

- [ ] pgTAP: usuário de outro evento, comitê ou delegação não lê; participação revogada perde o acesso na hora; Storage rejeita pasta e tipo errados.
- [ ] Ponta a ponta (Playwright):
  - conta A lê online, sai, a conta B entra e fica sem rede: não vê nada de A;
  - troca de conta sem logout apaga o cache da anterior;
  - resposta com mais de 12 horas não é servida sem rede;
  - a lista de exclusão nunca aparece no cache, nem por embed (`select=*,coletiva_pergunta_texto(*)`);
  - uma versão nova do service worker mantém o `dados-<sub>` do usuário atual;
  - logout numa aba leva a outra aba ao login e ela não mostra dados de antes;
  - sair com itens na caixa de saída mostra o aviso e não apaga a caixa sem confirmação.
- [ ] Unidade: nome do cache a partir do JWT, cálculo da validade e teste da lista de exclusão sobre a URL inteira.
- [ ] Script: `conectarAdmin` recusa um projeto remoto sem o `ref` liberado, mesmo com a flag ligada.
- [ ] Manual: Android e iPhone compartilhados, troca rápida de conta, dois navegadores no mesmo aparelho, modo avião, URL assinada vencida (lista completa no plano).
- [ ] `npm run tamanho` continua abaixo de 300 KB.
