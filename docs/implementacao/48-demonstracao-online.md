# Passo 48 · Demonstração online com acesso por papel

**Parte de:** planos posteriores ([interface e demonstração](../interface-e-demonstracao.md#demonstração-online))
**Depende de:** 44, 45 e 47
**Esforço:** M
**Objetivo:** qualquer pessoa vê o app inteiro, por papel, sem montar dados. Os passos 20 e 43 já criaram o conteúdo (CSNU completo, `npm run demo`); falta o ambiente público, separado da produção, e a entrada por papel.

## O que construir

1. **Projeto separado:** Supabase, Cloudflare e domínio próprios, só com dados fictícios, banner permanente "Ambiente de demonstração". Nada da produção aponta para ele.
2. **Cenário CSNU-T no projeto novo:** 15 delegações, 3 contas de bureau, delegados, press, Diretoria da Press e secretaria; uma coletiva em curso com uma pergunta ainda oculta e uma delegação chamada (cenário do passo 45).
3. **Tela `/demo`** antes do login, com cinco botões (delegado, bureau, press, Diretoria da Press, secretária). Cada um usa a conta fictícia, diz o que a pessoa verá e leva à tela principal do papel. A rota não existe no build de produção.
4. **Reinício protegido** do cenário (documentos, coletiva, respostas novas), por script ou Edge Function com `service_role`, nunca por usuário comum.
5. **Roteiro de 15 minutos** testado à mão em celular e notebook.

## Fora desta etapa

Os seis comitês na demonstração pública, fotos reais e qualquer dado pessoal.

## Testes

- [ ] O build de produção não contém `/demo`; o script de demonstração recusa o projeto real sem `DEMO_PERMITIR_REMOTO=1`.
- [ ] Ponta a ponta: cada botão de `/demo` cai na tela certa do papel.
- [ ] O reinício restaura o cenário e mantém as credenciais.
- [ ] Manual: o roteiro de 15 minutos de ponta a ponta, em celular e notebook.
