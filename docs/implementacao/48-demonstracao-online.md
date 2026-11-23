# Passo 48 · Demonstração online com acesso por papel

**Parte de:** planos posteriores ([interface e demonstração](../interface-e-demonstracao.md#demonstração-online))
**Depende de:** 44, 45 e 47
**Esforço:** M
**Quando:** depois do piloto (passo 12) e dos passos 45 parte B e 47, de que depende.
**Objetivo:** qualquer pessoa vê o app inteiro, por papel, sem montar dados. Os passos 20 e 43 já criaram o conteúdo (CSNU completo, `npm run demo`); falta o ambiente público, separado da produção, e a entrada por papel.

## Decisões antes de começar

- **Plano do projeto de demonstração.** O projeto gratuito do Supabase pausa depois de cerca de uma semana sem uso ([publicar.md](../publicar.md)), e uma demonstração pública fica parada entre uma visita e outra. Escolher: (a) plano gratuito com um acesso agendado a cada poucos dias (por exemplo, uma tarefa do GitHub Actions que lê uma linha), aceitando a pausa se falhar; ou (b) plano pago só para a demonstração. Conferir também quantos projetos ativos a conta gratuita permite junto com a produção e o projeto de teste.
- **Quem pode abusar.** As contas e senhas da demonstração são públicas, então qualquer pessoa escreve nela. Antes de publicar: limite de tamanho dos textos (já nas tabelas), Storage com cota pequena ou envio desligado, nenhum fluxo que mande e-mail, e cadastro público desligado como na produção.

## O que construir

1. **Projeto separado:** Supabase, Cloudflare e domínio próprios, só com dados fictícios, banner permanente "Ambiente de demonstração". Nada da produção aponta para ele. No Cloudflare, um segundo Worker (`wrangler.demo.jsonc`, nome `diplomacy-demo`) com as próprias variáveis `SUPABASE_URL` e `SUPABASE_CHAVE`; o `wrangler.jsonc` atual tem um Worker só. As migrações passam a ser aplicadas nos dois projetos (`db push` no de demonstração a cada passo com migração), para a demonstração não ficar com o banco desatualizado.
2. **Cenário CSNU-T no projeto novo:** 15 delegações, 3 contas de bureau, delegados, press, Diretoria da Press e secretaria; uma coletiva em curso com uma pergunta ainda oculta e uma delegação chamada (cenário do passo 45).
3. **Tela `/demo`** antes do login, com cinco botões (delegado, bureau, press, Diretoria da Press, secretária). Cada um usa a conta fictícia, diz o que a pessoa verá e leva à tela principal do papel. **A rota não existe no build de produção:** no SvelteKit toda pasta em `src/routes/` entra no build, então a tela fica fora de `src/routes/` (por exemplo, `src/demo/`) e um script `npm run build:demo` a copia para `src/routes/demo/` antes de compilar; o build de produção nunca a vê. As contas e senhas vêm de variáveis de build (`VITE_DEMO_*`) definidas só no Worker de demonstração e nunca ficam no repositório nem no build de produção.
4. **Reinício protegido** do cenário (documentos, coletiva, respostas novas), por script ou Edge Function com `service_role`, nunca por usuário comum. **Roda sozinho** em horário fixo (por exemplo, toda madrugada, por uma tarefa agendada do GitHub Actions ou `pg_cron`) e também sob demanda. O script só aceita o projeto cujo `ref` está liberado em `DEMO_PROJETO_REF` (passo 44, item 5).
5. **Roteiro de 15 minutos** testado à mão em celular e notebook.

## Fora desta etapa

Os seis comitês na demonstração pública, fotos reais e qualquer dado pessoal.

## Testes

- [ ] O build de produção não contém `/demo` nem as contas da demonstração (um teste procura o texto da rota e a senha em `build/`); o `npm run build:demo` contém.
- [ ] O script de demonstração recusa qualquer projeto remoto cujo `ref` não esteja em `DEMO_PROJETO_REF`, mesmo com `DEMO_PERMITIR_REMOTO=1`.
- [ ] Ponta a ponta: cada botão de `/demo` cai na tela certa do papel.
- [ ] O reinício restaura o cenário e mantém as credenciais; o reinício agendado roda uma vez e não duplica dados.
- [ ] Manual: o roteiro de 15 minutos de ponta a ponta, em celular e notebook, e a demonstração volta a responder depois de uma semana parada (pausa do plano gratuito, ou o acesso agendado).
