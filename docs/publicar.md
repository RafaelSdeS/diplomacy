# Publicar o app (piloto)

O que depende das suas contas, na ordem. Tudo no plano gratuito. Nenhuma chave secreta entra no repositório nem no Cloudflare: o app só usa a URL do projeto e a chave pública do Supabase.

> **Nunca compartilhe** a senha do banco nem a chave `service_role` (ou `secret`) do Supabase, nem o segredo do cliente OAuth do Google. A URL do projeto e a chave pública (`anon` ou `publishable`) podem ir para o Cloudflare: elas aparecem no navegador de qualquer forma, e quem protege os dados é a RLS.

## 1. Supabase (banco, login, tempo real e fotos)

1. Crie uma conta em [supabase.com](https://supabase.com) e um projeto novo:
   - região **South America (São Paulo)**;
   - anote a senha do banco num gerenciador de senhas.
2. No painel, em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**. Sem isso, qualquer pessoa cria conta com o e-mail de outra e pega o convite dela (veja o passo 03).
3. No seu computador, na pasta do projeto, envie as migrações:

   ```sh
   npx supabase login
   npx supabase link --project-ref <ref do projeto>   # pede a senha do banco
   npx supabase db push                               # cria tabelas, regras, funções, tempo real e o bucket de fotos
   ```

   O `ref` é o trecho de `https://<ref>.supabase.co`, a URL do projeto.
4. Em **Project Settings → API Keys**, copie a chave pública. É a `publishable` ou, na aba das chaves antigas, a `anon`. Em **Project Settings → Data API**, copie a URL do projeto.
5. Crie a primeira conta da secretaria (a sua). No **SQL Editor**, rode:

   ```sql
   insert into public.evento (nome, ano) values ('UFRGSMUN', 2027) returning id;
   -- com o id que voltou:
   insert into public.convite (email, evento_id, papel)
   values ('seu-email@exemplo.com', '<id do evento>', 'secretaria');
   ```

   Depois crie a conta em **Authentication → Users → Add user → Create new user**: o mesmo e-mail, uma senha, e **Auto Confirm User** marcado. O gatilho `nova_conta` transforma o convite em participação.
6. As outras contas do piloto seguem o mesmo caminho:
   - a secretaria cria os convites no app (Participantes);
   - você cria as contas no painel.

   O seed (`npm run seed`) só roda no Supabase local, de propósito.

O projeto gratuito pausa depois de cerca de uma semana sem uso. Para voltar, clique em **Restore** no painel; os dados ficam.

## 2. Cloudflare Pages (o site)

1. Crie uma conta em [dash.cloudflare.com](https://dash.cloudflare.com).
2. Vá em **Workers & Pages → Create → Pages → Connect to Git** e autorize o GitHub. Escolha o repositório `diplomacy`, branch `main`.
3. Configuração do build:
   - **Framework preset:** None.
   - **Build command:** `npm run build`.
   - **Build output directory:** `build`.
4. Em **Environment variables** (Production), cadastre:

   | Variável | Valor |
   |---|---|
   | `NODE_VERSION` | `24` |
   | `SUPABASE_URL` | a URL do projeto (`https://<ref>.supabase.co`) |
   | `SUPABASE_CHAVE` | a chave pública do passo 1.4 |
   | `LOGIN_GOOGLE` | `0` (vira `1` no passo 3) |

5. Salve e faça o deploy. O app fica em `https://<nome>.pages.dev`, e cada push na `main` publica de novo.
6. De volta ao Supabase, em **Authentication → URL Configuration**:
   - **Site URL:** `https://<nome>.pages.dev`;
   - **Redirect URLs:** adicione `https://<nome>.pages.dev/**` e `http://localhost:5173/**`.

Teste: entre com a conta da secretaria do passo 1.5.

## 3. Login com Google (opcional no piloto)

1. Em [console.cloud.google.com](https://console.cloud.google.com), crie um projeto (por exemplo, "UFRGSMUN piloto").
2. Em **Google Auth Platform**, configure a tela de consentimento:
   - tipo **External**, com o nome do app e o seu e-mail de suporte;
   - em **Audience**, deixe em modo de teste e adicione os e-mails de quem vai testar (até 100).
3. Em **Clients → Create client**, escolha **Web application** e preencha:
   - **Authorized JavaScript origins:** `https://<nome>.pages.dev` e `http://localhost:5173`;
   - **Authorized redirect URIs:** `https://<ref>.supabase.co/auth/v1/callback`.
4. Copie o **Client ID** e o **Client secret**. Cole os dois no Supabase, em **Authentication → Sign In / Providers → Google**, ligue o provedor e salve. O segredo fica só no Supabase.
5. No Cloudflare, mude `LOGIN_GOOGLE` para `1` e publique de novo (**Deployments → Retry deployment**).

Como o cadastro livre está desligado, o Google só entra em contas que já existem: crie a conta antes (passo 1.6), com o mesmo e-mail da conta Google. O Supabase liga as duas pelo e-mail.

## 4. E-mail (SMTP): só no passo 14

O piloto não envia e-mails. O link e o código por e-mail do passo 14 vão precisar de um SMTP gratuito (por exemplo, Brevo), configurado em **Authentication → Emails → SMTP Settings**. O e-mail embutido do Supabase serve só para testes: manda poucas mensagens por hora.

## Depois de publicar

- [ ] Abrir o app num celular Android e num iPhone de verdade (testes manuais dos passos 01 a 06).
- [ ] Rodar o telão num projetor e ler do fundo da sala (passo 06).
- [ ] Marcar nos planos dos passos 01 a 03 os itens que dependiam das contas.
