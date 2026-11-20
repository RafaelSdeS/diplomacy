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
   npx supabase login                                 # no seu terminal: abre o navegador
   npx supabase link --project-ref <ref do projeto>
   npx supabase db push --remote --dry-run            # mostra o que vai ser aplicado
   npx supabase db push --remote                      # cria tabelas, regras, funções, tempo real e o bucket de fotos
   ```

   O `ref` é o trecho de `https://<ref>.supabase.co`, a URL do projeto. Na CLI 3, sem `--remote` o `db push` age no Supabase local. Com o login feito, a CLI não pede a senha do banco. A cada passo novo com migração, rode de novo os dois últimos comandos.
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

## 2. Cloudflare (o site)

O app é publicado como um **Worker só com arquivos estáticos**. O `wrangler.jsonc` na raiz do repositório diz que a pasta `build` é uma SPA. Por isso, qualquer rota desconhecida devolve o `index.html`.

1. Crie uma conta em [dash.cloudflare.com](https://dash.cloudflare.com).
2. Vá em **Workers & Pages → Create** e escolha importar um repositório do Git. Autorize o GitHub e escolha o repositório `diplomacy`, branch `main`. O nome do Worker precisa ser `diplomacy`, o mesmo do `wrangler.jsonc`.
3. Configuração do build:
   - **Build command:** `npm run build`.
   - **Deploy command:** `npx wrangler deploy` (o padrão).
4. Em **Settings → Build → Variables and secrets**, cadastre as variáveis do build (tipo Text). As de **Runtime variables and secrets** não servem: o build não as enxerga.

   | Variável | Valor |
   |---|---|
   | `NODE_VERSION` | `24` |
   | `SUPABASE_URL` | a URL do projeto (`https://<ref>.supabase.co`) |
   | `SUPABASE_CHAVE` | a chave pública do passo 1.4 |
   | `LOGIN_GOOGLE` | `0` (vira `1` no passo 3) |

5. Rode o build de novo (aba **Deployments**). O app fica em `https://diplomacy.<sua-conta>.workers.dev`, e cada push na `main` publica de novo.
6. De volta ao Supabase, em **Authentication → URL Configuration**:
   - **Site URL:** o endereço do app;
   - **Redirect URLs:** adicione `<endereço do app>/**` e `http://localhost:5173/**`.

Também funciona como projeto do **Cloudflare Pages**. Nesse caso, use Build output directory `build`, ponha as mesmas variáveis em **Settings → Variables and Secrets** (Production) e ignore o `wrangler.jsonc`.

Teste: entre com a conta da secretaria do passo 1.5.

## 2b. Dados de demonstração (opcional)

O projeto na nuvem começa vazio: o seed só roda no Supabase local. Para testar o app publicado sem dados pessoais, `supabase/demonstracao.sql` cria o comitê de teste CSNU-T no evento UFRGSMUN 2027, com as 15 delegações e as regras do CSNU:

```sh
npx supabase db query --remote --file supabase/demonstracao.sql
```

Depois, para testar com várias pessoas:

1. Crie as contas de teste no painel (**Authentication → Users → Add user**, com **Auto Confirm User**). Muitos provedores de e-mail aceitam variações do mesmo endereço, como `voce+eua@gmail.com`.
2. Entre como secretaria e convide cada conta em **Participantes**: papel, comitê e, para delegados, a delegação. Convide a si mesmo como mesa do CSNU-T para ver "Sessão" e "Comitê" no menu.

## 3. Login com Google (opcional no piloto)

1. Em [console.cloud.google.com](https://console.cloud.google.com), crie um projeto (por exemplo, "UFRGSMUN piloto").
2. Em **Google Auth Platform**, configure a tela de consentimento:
   - tipo **External**, com o nome do app e o seu e-mail de suporte;
   - em **Audience**, deixe em modo de teste e adicione os e-mails de quem vai testar (até 100).
3. Em **Clients → Create client**, escolha **Web application** e preencha:
   - **Authorized JavaScript origins:** o endereço do app (sem barra no fim) e `http://localhost:5173`;
   - **Authorized redirect URIs:** `https://<ref>.supabase.co/auth/v1/callback`.
4. Copie o **Client ID** e o **Client secret**. Cole os dois no Supabase, em **Authentication → Sign In / Providers → Google**, ligue o provedor e salve. O segredo fica só no Supabase.
5. No Cloudflare, mude `LOGIN_GOOGLE` para `1` nas variáveis do build e rode o build de novo.

Como o cadastro livre está desligado, o Google só entra em contas que já existem: crie a conta antes (passo 1.6), com o mesmo e-mail da conta Google. O Supabase liga as duas pelo e-mail.

## 4. E-mail (SMTP): só no passo 14

O piloto não envia e-mails. O link e o código por e-mail do passo 14 vão precisar de um SMTP gratuito (por exemplo, Brevo), configurado em **Authentication → Emails → SMTP Settings**. O e-mail embutido do Supabase serve só para testes: manda poucas mensagens por hora.

## A cada passo novo com migração

O Cloudflare publica o app a cada push na `main`, mas as migrações vão para a nuvem à mão. Se o código chegar antes do banco, o app publicado quebra. A ordem é sempre esta:

1. `npx supabase db push --remote --dry-run`, para conferir o que vai ser aplicado;
2. `npx supabase db push --remote`;
3. só então `git push`.

Quando a migração só acrescenta tabelas e funções, o app antigo continua funcionando com o banco novo durante o deploy. Quando ela muda ou apaga algo que o app antigo usa (como o passo 07, que troca a assinatura de funções da sessão), o app publicado fica com erro por um ou dois minutos, até o Cloudflare terminar o build novo. Com dados de teste isso não importa; perto do evento, faça essas mudanças em duas etapas (acrescentar, publicar, depois remover o antigo).

## Depois de publicar

- [x] Supabase na nuvem com as migrações, o cadastro livre desligado e a conta da secretaria.
- [x] App publicado no Cloudflare, apontando para o Supabase na nuvem.
- [ ] Abrir o app num celular Android e num iPhone de verdade (testes manuais dos passos 01 a 06).
- [ ] Rodar o telão num projetor e ler do fundo da sala (passo 06).
- [ ] Marcar nos planos dos passos 01 a 03 os itens que dependiam das contas.
