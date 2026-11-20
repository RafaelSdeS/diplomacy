# Passo 19 · LGPD e pós-evento

**Parte de:** evento
**Depende de:** 14
**Objetivo:** cumprir a LGPD do começo ao fim e entregar à organização o que fica de cada edição.

## Como ficou

- **Aviso de privacidade:** `/privacidade`, pública e com link na tela de entrar. É um rascunho, marcado como tal, para combinar com a organização.
- **Dados mínimos (revisão):** pessoa (nome, minibiografia, foto opcional), e-mail da conta, convite (nome, e-mail, papel, comitê, delegação), check-in e certificado (por e-mail). Não há telefone, endereço, documento nem data de nascimento.
- **Direitos do titular** (`/perfil/meus-dados`): o JSON vem de `meus_dados()`, que nunca traz o hash das credenciais. O nome se corrige no perfil. O pedido de exclusão vai para a secretaria (`/secretaria/dados`), que apaga a conta: fotos primeiro, pela API do Storage (o banco não deixa apagar arquivos direto), depois `apagar_pessoa`. Os textos públicos ficam sem autor, e o certificado fica, sem o e-mail.
- **Registro:** gatilhos gravam mudança de papel e resposta de nota de crise; ocultar matéria, ocultar bilhete, a regra dos bilhetes e as exclusões já gravavam. Só a secretaria lê; a Diretoria da Press, só o que é da press.
- **Exclusão no prazo:** `apagar_dados_pessoais(evento)`, disparada pela secretaria em `/secretaria/dados` (com o nome do evento como confirmação). Ela apaga as contas de quem só esteve naquele evento, os convites, as credenciais, o check-in, as mensagens, as notas de crise, as cartas privadas, os rascunhos, os comentários, as propostas e as entrevistas. Ficam os documentos públicos (sem os autores) e os certificados (com o código no lugar do e-mail). O `pg_cron` ficou de fora: a secretaria dispara no prazo combinado.
- **Arquivo da edição:** em vez de um ZIP de PDFs (o app não tem servidor para gerar PDFs), saem um PDF único pela impressão do navegador (`/imprimir/arquivo`, um comitê por página: agenda aprovada, resoluções e notícias publicadas, mais as atualizações de crise) e um JSON com os dados públicos e as regras de cada comitê (`arquivo_publico`).
- **Pesquisa de satisfação:** `/pesquisa`, anônima (a resposta não guarda quem respondeu; uma tabela à parte só impede responder duas vezes), com as perguntas do roteiro do piloto por função. O resumo fica em `/secretaria/dados`.
- **Modelos:** `copiar_evento` cria o evento seguinte com os comitês, as regras, as delegações e os veículos; quem copiou vira a secretaria dele. Roteiros de crise não existem no app (a crise escreve na hora), então não há o que copiar.

## LGPD

- [x] **Aviso de privacidade** (o texto final é com a organização): página pública com o link no formulário de inscrição. Diz o que é coletado, para quê, por quanto tempo e quem vê cada coisa, inclusive a regra de leitura dos bilhetes. O texto final é combinado com a organização, que é a controladora dos dados.
- [x] **Dados mínimos:** revisar todas as colunas. Nada de telefone ou endereço; CPF só se o certificado exigir.
- [x] **Direitos do titular** em `/perfil/meus-dados`:
  - baixar os próprios dados em JSON;
  - corrigir o nome;
  - pedir a exclusão.
- [x] **Registro:** gatilhos gravam em `registro` as ações sensíveis, como ocultar matéria, responder nota, mudar papel e apagar dados.
- [x] **Prazo de exclusão:** a função `apagar_dados_pessoais(evento)`:
  - apaga as contas e os e-mails;
  - troca o nome das pessoas pelo da delegação nos documentos;
  - mantém só os documentos públicos e os certificados.
  
  Ela roda no prazo combinado, agendada com `pg_cron` ou disparada pela secretaria.
- [ ] **Menores de idade**, se houver no futuro: consentimento dos responsáveis na inscrição.

## Pós-evento

- [x] **Arquivo da edição** (PDF único pela impressão e JSON): exportação num ZIP com os PDFs (agenda aprovada, resoluções, resoluções de crise e edições da press), as regras usadas e um JSON com os dados públicos. É entregue à organização.
- [x] **Pesquisa de satisfação** no app, separada por função.
- [x] **Modelos para a próxima edição:** comitês, regras e roteiros de crise copiados para um novo evento.
- [ ] **Infraestrutura:** backup final e volta do Supabase para o plano gratuito.

## Testes

Arquivos: `supabase/tests/19-lgpd.test.sql` e `tests/19-lgpd.spec.ts`.

- [x] pgTAP: depois de `apagar_dados_pessoais`, não sobra e-mail, conta nem nome de pessoa, e os documentos públicos e os certificados continuam.
- [x] pgTAP: as ações sensíveis ficam em `registro`, e só a secretaria lê o registro.
- [x] pgTAP: a exportação de uma pessoa traz só os dados dela.
- [x] Ponta a ponta: uma pessoa baixa os próprios dados e pede a exclusão.
- [x] Ponta a ponta: o arquivo da edição tem todos os PDFs e o JSON esperados.
- [ ] Manual: revisão do aviso de privacidade com a organização.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [x] Os direitos do titular funcionam pelo app.
- [x] A exclusão no prazo foi testada com dados fictícios (pgTAP).
- [ ] O arquivo da edição é gerado e entregue.
