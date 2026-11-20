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

- [ ] Link e código por e-mail com `signInWithOtp`, enviados por um SMTP gratuito (por exemplo, Brevo).
- [ ] Subir o limite de e-mails de autenticação do Supabase, que é de 30 por hora por padrão.
- [ ] O campo do código aceita 6 ou 8 dígitos.
- [ ] Sessão longa, para ninguém precisar entrar de novo durante o evento.

## Crachás, check-in e certificados

- [ ] `/imprimir/crachas`: folha A4 com vários crachás (nome, comitê, bandeira e QR).
- [ ] Check-in: busca por nome e um toque para marcar presença. Leitura do QR pela câmera com `BarcodeDetector` nos navegadores que suportam; nos outros, a busca por nome resolve.
- [ ] Certificados: impressão em lote, uma página por pessoa, a partir da presença registrada.
- [ ] Cada certificado tem um código de verificação. A rota pública `/verificar/[codigo]` mostra só nome, evento e função.

## Testes

- [ ] pgTAP: crachá revogado não entra; tentativas acima do limite são bloqueadas.
- [ ] Ponta a ponta: login pelo QR de um crachá impresso, no celular.
- [ ] Ponta a ponta: importação de um CSV fictício com 150 linhas.

## Pronto quando

- [ ] Um delegado entra escaneando o crachá impresso.
- [ ] Um crachá revogado não entra.
- [ ] 150 certificados saem numa única impressão.
