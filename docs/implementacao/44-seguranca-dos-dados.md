# Passo 44 · Segurança dos dados e das sessões

**Parte de:** planos posteriores ([plano de segurança](../seguranca-online.md))
**Depende de:** 43
**Esforço:** M
**Objetivo:** nenhuma conta enxerga dados de outra, nem num aparelho compartilhado, nem depois de perder a participação. É o primeiro passo depois do 43 porque os seguintes (coletiva oral, demonstração pública) criam mais dados privados.

## O que construir

Ordem de trabalho:

1. **Cache offline por usuário** (decisão e regras em [seguranca-online.md](../seguranca-online.md#decisão-manter-a-leitura-offline-com-cache-por-usuário)): `dados-<sub>` com o `sub` do JWT, validade de 12 horas, lista de exclusão (texto de pergunta da coletiva, notas de crise e votos individuais), `private, no-store` nas respostas sensíveis. Em `src/service-worker/index.ts`.
2. **Limpeza de sessão:** logout e troca de conta apagam todos os `dados-*`, desativam o push e limpam rascunhos e dados locais; `401`/`403` apagam o cache do usuário (`src/routes/+layout.svelte`).
3. **RLS e Storage:** revisar as políticas de cada objeto; Storage com URL assinada curta e regra por participante.
4. **Revogação:** revogar a participação encerra as sessões da conta e remove as inscrições de push.
5. **Projeto separado para a demonstração** (o script já bloqueia o remoto por padrão; falta o projeto, no passo 48).
6. **Resposta a incidente:** o roteiro de 14 itens do plano, escrito em `docs/` e com o responsável nomeado.

## Fora desta etapa

Sistema de detecção, logs analíticos, auditoria externa e personalização de segurança por usuário.

## Testes

- [ ] pgTAP: usuário de outro evento, comitê ou delegação não lê; participação revogada perde o acesso na hora; Storage rejeita pasta e tipo errados.
- [ ] Ponta a ponta (Playwright):
  - conta A lê online, sai, a conta B entra e fica sem rede: não vê nada de A;
  - troca de conta sem logout apaga o cache da anterior;
  - resposta com mais de 12 horas não é servida sem rede;
  - a lista de exclusão nunca aparece no cache.
- [ ] Unidade: nome do cache a partir do JWT e cálculo da validade.
- [ ] Manual: Android e iPhone compartilhados, troca rápida de conta, dois navegadores no mesmo aparelho, modo avião, URL assinada vencida (lista completa no plano).
- [ ] `npm run tamanho` continua abaixo de 300 KB.
