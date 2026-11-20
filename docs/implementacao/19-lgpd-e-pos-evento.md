# Passo 19 · LGPD e pós-evento

**Parte de:** evento
**Depende de:** 14
**Objetivo:** cumprir a LGPD do começo ao fim e entregar à organização o que fica de cada edição.

## LGPD

- [ ] **Aviso de privacidade:** página pública com o link no formulário de inscrição. Diz o que é coletado, para quê, por quanto tempo e quem vê cada coisa, inclusive a regra de leitura dos bilhetes. O texto final é combinado com a organização, que é a controladora dos dados.
- [ ] **Dados mínimos:** revisar todas as colunas. Nada de telefone ou endereço; CPF só se o certificado exigir.
- [ ] **Direitos do titular** em `/perfil/meus-dados`:
  - baixar os próprios dados em JSON;
  - corrigir o nome;
  - pedir a exclusão.
- [ ] **Registro:** gatilhos gravam em `registro` as ações sensíveis, como ocultar matéria, responder nota, mudar papel e apagar dados.
- [ ] **Prazo de exclusão:** a função `apagar_dados_pessoais(evento)`:
  - apaga as contas e os e-mails;
  - troca o nome das pessoas pelo da delegação nos documentos;
  - mantém só os documentos públicos e os certificados.
  
  Ela roda no prazo combinado, agendada com `pg_cron` ou disparada pela secretaria.
- [ ] **Menores de idade**, se houver no futuro: consentimento dos responsáveis na inscrição.

## Pós-evento

- [ ] **Arquivo da edição:** exportação num ZIP com os PDFs (agenda aprovada, resoluções, resoluções de crise, edições da press e premiados), as regras usadas e um JSON com os dados públicos. É entregue à organização.
- [ ] **Pesquisa de satisfação** no app, separada por função.
- [ ] **Modelos para a próxima edição:** comitês, regras e roteiros de crise copiados para um novo evento.
- [ ] **Infraestrutura:** backup final e volta do Supabase para o plano gratuito.

## Testes

- [ ] pgTAP: depois de `apagar_dados_pessoais`, não sobra e-mail nem nome de pessoa; os documentos públicos continuam.
- [ ] Ponta a ponta: uma pessoa baixa os próprios dados e pede a exclusão.

## Pronto quando

- [ ] Os direitos do titular funcionam pelo app.
- [ ] A exclusão no prazo foi testada com dados fictícios.
- [ ] O arquivo da edição é gerado e entregue.
