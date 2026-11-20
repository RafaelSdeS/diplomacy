# Passo 14 · Login completo e secretaria

**Parte de:** evento
**Depende de:** 12
**Objetivo:** entrar pelo crachá, por e-mail ou por código, e dar à secretaria as ferramentas de importação, crachás, check-in e certificados.

## Importação das inscrições

- [ ] Tela `/secretaria/importar`: recebe o CSV exportado do Google Forms, mapeia as colunas, mostra uma prévia e cria os convites.
- [ ] Dados reais só no projeto de produção. Nada vai para o repositório: a pasta `dados-reais/` está no `.gitignore`.

## Login pelo crachá

- [ ] Cada participante recebe um código longo e aleatório. O banco guarda só o hash (`sha256`) em `credencial (convite, hash, revogada)`.
- [ ] O QR do crachá aponta para `/entrar/cracha#<código>`. O código vai depois do `#`, então não aparece em logs de servidor.
- [ ] Edge Function `entrar-com-cracha`:
  1. confere o hash, se a credencial foi revogada e o limite de tentativas;
  2. gera um link de login pela API de administração;
  3. devolve o `token_hash`, que o app troca por uma sessão com `verifyOtp`.
- [ ] Testar o problema conhecido de links repetidos para o mesmo usuário antes de depender desse fluxo.
- [ ] Revogar e reemitir um crachá na tela da secretaria.

## Código da secretaria

- [ ] Código curto (8 caracteres), com validade e limite de tentativas, emitido na hora para quem perdeu o crachá. Usa o mesmo fluxo do crachá.

## Login por e-mail

- [ ] Link e código por e-mail com `signInWithOtp({ email, options: { shouldCreateUser: false } })`, enviados por um SMTP gratuito (por exemplo, Brevo). Com o cadastro livre desligado, um e-mail sem conta recebe só uma mensagem genérica, sem dizer se a conta existe.
- [ ] Subir o limite de e-mails de autenticação do Supabase, que é de 30 por hora por padrão.
- [ ] O campo do código aceita 6 ou 8 dígitos.
- [ ] Sessão longa, para ninguém precisar entrar de novo durante o evento.

## Crachás, check-in e certificados

- [ ] `/imprimir/crachas`: folha A4 com vários crachás (nome, comitê, bandeira e QR).
- [ ] Check-in: busca por nome e um toque para marcar presença. Leitura do QR pela câmera com `BarcodeDetector` nos navegadores que suportam; nos outros, a busca por nome resolve.
- [ ] Certificados: impressão em lote, uma página por pessoa, a partir da presença registrada.
- [ ] Cada certificado tem um código de verificação. A rota pública `/verificar/[codigo]` mostra só nome, evento e função.

## Testes

Arquivos: `supabase/tests/14-credenciais.test.sql`, `supabase/functions/entrar-com-cracha/index.test.ts`, `src/lib/secretaria/importar.test.ts` e `tests/14-login-e-secretaria.spec.ts`.

- [ ] Deno (Edge Function): código válido entra; código inválido, revogado ou além do limite de tentativas é recusado; a resposta nunca diz se o código existe.
- [ ] pgTAP: só a secretaria cria, revoga e lê credenciais, e o banco guarda só o hash, nunca o código.
- [ ] Vitest: a importação do CSV mapeia as colunas, ignora linhas vazias e aponta e-mails repetidos ou inválidos.
- [ ] Ponta a ponta: login pelo link do crachá, no celular.
- [ ] Ponta a ponta: login com o código da secretaria.
- [ ] Ponta a ponta: importação de um CSV fictício com 150 linhas.
- [ ] Ponta a ponta: `/verificar/[codigo]` mostra só nome, evento e função, e um código inexistente mostra "não encontrado".
- [ ] Manual: login pelo QR de um crachá impresso num Android e num iPhone, e chegada do e-mail com link e código.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [ ] Um delegado entra escaneando o crachá impresso.
- [ ] Um crachá revogado não entra.
- [ ] 150 certificados saem numa única impressão.
