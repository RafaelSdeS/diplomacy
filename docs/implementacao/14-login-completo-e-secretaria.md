# Passo 14 · Login completo e secretaria

**Parte de:** evento
**Depende de:** 12
**Objetivo:** entrar pelo crachá, por e-mail ou por código, e dar à secretaria as ferramentas de importação, crachás, check-in e certificados.

## Como ficou

- **A conta nasce no primeiro login:** com o cadastro livre desligado, a Edge Function cria a conta a partir do convite no primeiro uso do crachá ou do código. A importação do CSV só cria convites (com o nome, coluna nova em `convite`).
- **Credenciais:** `credencial` guarda o hash do código do crachá (24 caracteres aleatórios) ou do código da secretaria (8 caracteres sem letras que se confundem, 30 minutos, uma vez). O código aparece só na emissão. `entrar_com_codigo` (só o service role) conta as tentativas erradas por origem (o IP em hash): 30 em 15 minutos. Só as erradas contam, porque no evento todos saem pelo mesmo IP.
- **Links repetidos:** o mesmo crachá entra em dois aparelhos seguidos (teste de ponta a ponta). Num pico, o limite de verificação de tokens do Supabase precisa subir (veja `docs/publicar.md`).
- **Check-in e certificados:** por e-mail do convite (quem nunca entrou no app também faz check-in). O código da secretaria e a revogação do crachá ficam no check-in, ao lado de cada pessoa. Os certificados guardam nome e função na emissão.
- **Testes da Edge Function:** em vez de testes em Deno, os de ponta a ponta chamam a função de verdade (o Supabase local agora sobe o edge runtime), e o pgTAP cobre as regras do código no banco.
- Os crachás impressos vão 8 por folha A4, com QR gerado no aparelho (`qrcode-generator`, carregado só nessa página).

## Importação das inscrições

- [x] Tela `/secretaria/importar`: recebe o CSV exportado do Google Forms, mapeia as colunas, mostra uma prévia e cria os convites.
- [x] Dados reais só no projeto de produção. Nada vai para o repositório: a pasta `dados-reais/` está no `.gitignore`.

## Login pelo crachá

- [x] Cada participante recebe um código longo e aleatório. O banco guarda só o hash (`sha256`) em `credencial (convite, hash, revogada)`.
- [x] O QR do crachá aponta para `/entrar/cracha#<código>`. O código vai depois do `#`, então não aparece em logs de servidor.
- [x] Edge Function `entrar-com-cracha`:
  1. confere o hash, se a credencial foi revogada e o limite de tentativas;
  2. gera um link de login pela API de administração;
  3. devolve o `token_hash`, que o app troca por uma sessão com `verifyOtp`.
- [x] Testar o problema conhecido de links repetidos para o mesmo usuário antes de depender desse fluxo.
- [x] Revogar e reemitir um crachá na tela da secretaria.

## Código da secretaria

- [x] Código curto (8 caracteres), com validade e limite de tentativas, emitido na hora para quem perdeu o crachá. Usa o mesmo fluxo do crachá.

## Login por e-mail

- [x] A tela de entrar já pede o link e o código por e-mail. Falta o SMTP, que é seu (veja `docs/publicar.md`): link e código por e-mail com `signInWithOtp({ email, options: { shouldCreateUser: false } })`, enviados por um SMTP gratuito (por exemplo, Brevo). Com o cadastro livre desligado, um e-mail sem conta recebe só uma mensagem genérica, sem dizer se a conta existe.
- [ ] Subir o limite de e-mails de autenticação do Supabase, que é de 30 por hora por padrão.
- [x] O campo do código aceita 6 ou 8 dígitos.
- [x] Sessão longa, para ninguém precisar entrar de novo durante o evento: o app renova o token sozinho, e a sessão não tem prazo (o padrão do Supabase, sem `timebox`).

## Crachás, check-in e certificados

- [x] `/imprimir/crachas`: folha A4 com vários crachás (nome, comitê, bandeira e QR).
- [x] Check-in: busca por nome e um toque para marcar presença. Leitura do QR pela câmera com `BarcodeDetector` nos navegadores que suportam; nos outros, a busca por nome resolve.
- [x] Certificados: impressão em lote, uma página por pessoa, a partir da presença registrada.
- [x] Cada certificado tem um código de verificação. A rota pública `/verificar/[codigo]` mostra só nome, evento e função.

## Testes

Arquivos: `supabase/tests/14-credenciais.test.sql`, `src/lib/importar.test.ts` e `tests/14-login-e-secretaria.spec.ts`.

- [x] Edge Function (pelo pgTAP e pelos testes de ponta a ponta, em vez de Deno): código válido entra; código inválido, revogado ou além do limite de tentativas é recusado; a resposta nunca diz se o código existe.
- [x] pgTAP: só a secretaria cria, revoga e lê credenciais, e o banco guarda só o hash, nunca o código.
- [x] Vitest: a importação do CSV mapeia as colunas, ignora linhas vazias e aponta e-mails repetidos ou inválidos.
- [x] Ponta a ponta: login pelo link do crachá, no celular.
- [x] Ponta a ponta: login com o código da secretaria.
- [x] Ponta a ponta: importação de um CSV fictício com 150 linhas.
- [x] Ponta a ponta: `/verificar/[codigo]` mostra só nome, evento e função, e um código inexistente mostra "não encontrado".
- [ ] Manual: login pelo QR de um crachá impresso num Android e num iPhone, e chegada do e-mail com link e código.

## Pronto quando

- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [ ] Um delegado entra escaneando o crachá impresso.
- [x] Um crachá revogado não entra.
- [x] 150 certificados saem numa única impressão.
