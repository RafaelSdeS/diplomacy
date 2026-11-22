# Plano de segurança online

## Objetivo

Garantir que o app não expõe dados de um participante a outro, que os papéis sejam separados no banco e que o modo online continue seguro em aparelhos compartilhados.

Os controles abaixo estão organizados por ameaça. “Risco confirmado” significa que foi encontrado no código atual; “controle necessário” significa que a arquitetura já permite parcialmente ou ainda exige uma implementação específica.

## Revisão de segurança

| # | Severidade | Arquivo | Linhas | Vulnerabilidade | Confiança |
|---|----------|---------|--------|----------------|-----------|
| 1 | 🟠 HIGH | src/service-worker/index.ts | 64-75,97-98 | Respostas REST autenticadas são guardadas no mesmo cache offline global, podendo servir dados de uma conta para outra no mesmo aparelho. | 9/10 |

Referências:

- cache de API em [src/service-worker/index.ts](/home/rafael/Documents/diplomacy/src/service-worker/index.ts:64);
- cache por URL em [src/service-worker/index.ts](/home/rafael/Documents/diplomacy/src/service-worker/index.ts:97);
- limpeza somente no logout em [src/routes/+layout.svelte](/home/rafael/Documents/diplomacy/src/routes/+layout.svelte:116).

Nenhuma confirmação adicional de vulnerabilidade foi encontrada nesta revisão limitada ao código disponível. Os demais pontos abaixo são controles necessários ou lacunas de implantação que devem ser validados.

## Corrigir o cache offline

### Problema confirmado

O service worker guarda todas as respostas `GET` cujo caminho começa com `/rest/v1/` no cache `dados`. A chave é a própria URL, sem distinção de usuário ou sessão.

Em um aparelho compartilhado, uma conta pode usar uma resposta obtida por outra conta se fizer a mesma consulta offline.

Além disso, dados podem continuar disponíveis depois de troca de participação ou retirada de acesso enquanto o cache não for removido.

### Correção obrigatória

O cache offline deve seguir uma destas estratégias:

1. não cachear nenhuma resposta REST autenticada;
2. cachear apenas uma lista branca explícita de conteúdo público;
3. particionar o cache por usuário e sessão;
4. invalidar todo o cache ao trocar de conta, mudar participação ou encerrar sessão.

Recomendação:

- nunca cachear documentos, cartas, bilhetes, mensagens, votos, crise, dados pessoais ou denúncias;
- permitir cache somente de conteúdo preparado explicitamente como público;
- incluir `Cache-Control: no-store` nas respostas sensíveis;
- não confiar apenas no cabeçalho HTTP do navegador;
- conferir a identidade atual antes de responder pelo cache;
- limpar o cache ao logout e ao detectar mudança de usuário;
- remover dados de sessão persistida em aparelho compartilhado quando o usuário sair.

Arquivos envolvidos:

- [src/service-worker/index.ts](/home/rafael/Documents/diplomacy/src/service-worker/index.ts:55);
- [src/routes/+layout.svelte](/home/rafael/Documents/diplomacy/src/routes/+layout.svelte:116).

## Arquitetura de autorização

### Base atual

O projeto já usa:

- Supabase Auth;
- participação por evento;
- papéis;
- tabelas com RLS;
- funções no banco;
- testes pgTAP;
- migração de banco separada do deploy;
- chave pública no browser.

A chave pública não é segredo. Os dados devem ser protegidos pela RLS e pelas funções RPC.

### Matriz de acesso

| Papel | Mesmo evento | Próprio comitê | Própria delegação | Administração |
|---|---:|---:|---:|---:|
| Delegado | Ler conteúdo permitido | Sim | Conteúdo próprio | Não |
| Bureau | Ler conteúdo permitido | Sim | Substituição somente por regra | Operações da mesa |
| Press | Ler conteúdo permitido | Próprio veículo | Não | Publicar no veículo |
| Diretoria da Press | Ler conteúdo permitido | Todos para moderação | Não | Moderar press |
| Crise | Ler conteúdo permitido | Comitês atribuidos | Não | Operações da crise |
| Secretaria | Evento completo | Todos | Não | Cadastro e arquivo |

Uma pessoa pode ter várias participações no mesmo evento ou em eventos diferentes. Cada ação deve indicar explicitamente qual participação está sendo usada.

## RLS obrigatória

Toda tabela em `public` deve:

- estar com RLS ativada;
- ter pelo menos uma política;
- impedir acesso anônimo;
- validar participante e evento;
- validar papel quando o dado exige privilégio;
- limitar ações por delegação ou comitê;
- não depender apenas de IDs secretos.

O teste geral já existe em [supabase/tests/00-rls-em-todas-as-tabelas.test.sql](/home/rafael/Documents/diplomacy/supabase/tests/00-rls-em-todas-as-tabelas.test.sql).

Ele deve continuar falhando para tabelas novas esquecidas.

## Funções RPC

Funções `security definer` devem:

- usar `set search_path = ''`;
- conferir `auth.uid()` explicitamente;
- conferir evento e papel;
- validar todos os argumentos;
- impedir ações repetidas e estados inválidos;
- registrar ações críticas;
- não receber IDs arbitrários sem validação;
- devolver o mínimo necessário ao chamador.

Funções públicas não podem ignorar RLS com um privilégio amplo.

## Convites e contas

Controles obrigatórios:

- cadastro público desligado;
- conta criada apenas por convite ou pelo processo autorizado;
- convite vinculado ao e-mail;
- uma participação atribuída por convite;
- revogação efetiva de participação;
- troca de papel registrada;
- logout em todos os aparelhos quando necessário;
- bloqueio de conta ao fim do evento;
- sessão expirada com frequência adequada.

O cadastro público não deve ser ligado novamente sem modelo de aprovação.

## Login

Controles recomendados:

- senha forte ou login por e-mail/código;
- código de sign-in com prazo curto;
- links de uso único;
- throttling por IP e por conta;
- limite maior apenas na infraestrutura pública do credenciamento;
- não revelar quais e-mails possuem convite;
- não aceitar uma conta criada por Google sem convite;
- mostrar todos os papéis e comitês da pessoa antes de entrar.

O login pelo crachá deve usar uma Edge Function e o secret da chave de serviço apenas no Supabase.

## Storage

### Arquivos privados

- bucket privado por padrão;
- URL assinada com expiração curta;
- política de RLS no objeto;
- expiração mais curta para documentos privados;
- validação no upload de pasta, veículo e comitê;
- limite de tamanho;
- lista de tipos permitidos;
- conversão da imagem no aparelho;
- remoção de arquivos órfãos.

O nome do arquivo não deve ser informação de autorização. Usuários só acessam o objeto depois que o banco confirma participação e regra.

### Imagens públicas

Mesmo imagens publicadas devem validar:

- conteúdo não privado;
- texto alternativo;
- veículo correto;
- conta press correta;
- limite de tamanho;
- tipo real enviado.

## Tempo real

As assinaturas devem continuar protegidas por RLS.

Além disso:

- filtrar por evento ou comitê no banco;
- assinar somente tabelas necessárias;
- invalidar assinaturas ao trocar de papel;
- não confiar em dados recebidos pela assinatura como histórico completo;
- recarregar dados oficiais após reconexão;
- testar com dois usuários em Playwright.

Recarregar uma tela não pode restaurar dados que RLS removeu.

## Sessões em aparelho compartilhado

Políticas:

- logout visível e com confirmação;
- no logout, remover cache autenticado;
- no logout, desativar push;
- limpar dados locais e rascunhos do aparelho;
- impedir que “voltar” mostre dados após logout;
- mostrar nome da conta ativa no cabeçalho;
- avisar antes de trocar de conta;
- limitar persistência da sessão em equipamentos públicos.

A interface não deve mostrar dados sensíveis na tela de espera de login.

## Notificações push

- enviar somente dados mínimos;
- não colocar respostas completas na notificação;
- o texto deve levar a uma tela protegida;
- revogar inscrição ao sair;
- registrar o endpoint por pessoa/aparelho;
- remover inscrições inválidas;
- não compartilhar tokens entre contas;
- remover as inscrições ao revogar participação;
- transmitir pelo serviço push com texto criptografado pelo navegador.

## Limites e detecção

Adicionar limites de:

- perguntas por coletiva;
- matérias por intervalo;
- denúncias por pessoa;
- convites por hora;
- uploads por pessoa;
- consultas por página;
- login por conta;
- RPC por sessão.

Adicionar auditoria para:

- publicação;
- ocultação;
- mudança de papel;
- convite;
- remoção de participação;
- acesso administrativo a dados exportados;
- exportação em massa;
- alteração de regras;
- resposta à coletiva;
- chamada de delegação.

Alertas devem ser enviados para pessoa responsável, não expostos na interface pública.

## Logs e privacidade

Armazenar apenas:

- identificadores necessários;
- ação;
- pessoa;
- horário;
- objeto afetado;
- motivo explicitamente informado.

Evitar:

- texto completo de bilhetes em log;
- senhas;
- tokens;
- service_role;
- documentos inteiros em log;
- dados pessoais fora do período necessário.

Os logs devem obedecer LGPD e prazo definido pela organização.

## Ambiente separado

Produção e demonstração devem usar projetos Supabase diferentes.

O script de demonstração não deve funcionar no projeto real sem uma autorização explícita.

Controles já existentes:

- demonstração bloqueada em remoto por padrão;
- variável `DEMO_PERMITIR_REMOTO=1`;
- chave de serviço usada apenas pelos scripts administrativos;
- seed limitado a local ou projeto de teste.

Continuar impedindo:

- `service_role` no app;
- `service_role` no Cloudflare;
- criação de contas reais por scripts públicos;
- demonstração em ambiente de dados pessoais.

## CSP e headers

Configurar no Cloudflare ou no Worker:

- Content-Security-Policy;
- Referrer-Policy;
- X-Content-Type-Options;
- Permissions-Policy;
- frame ancestors apropriado;
- HTTPS obrigatório;
- cache privado para respostas autenticadas.

Validar os scripts e fontes permitidos pela CSP antes de ativar bloqueio estrito.

## Testes obrigatórios

### Banco

- delegado de outro evento não vê dados;
- delegado de outro comitê não vê dados privados;
- press não publica em veículo estranho;
- delegação suspensa não tem ações;
- papel removido perde acesso imediatamente;
- conta sem convite perde acesso;
- RLS continua ativa em toda tabela nova;
- Storage rejeita pasta ou tipo errado;
- função não aceita estado inválido.

### Ponta a ponta

- conta A não vê dados da conta B;
- usuário direto digita URL de objeto proibido;
- troca de sessão em duas abas;
- logout de uma aba limpa a outra;
- conta antiga não recebe alteração do tempo real;
- cache offline não fornece dados da conta anterior;
- press vê somente próprio veículo;
- Diretoria vê somente moderação permitida.

### Manual

Antes do evento real:

- testar em celular Android compartilhado;
- testar em iPhone compartilhado;
- testar Wi-Fi instável;
- testar troca rápida de conta;
- testar dois navegadores no mesmo aparelho;
- testar expiração de sessão;
- testar URL direta;
- testar link antigo depois de revogação;
- testar URL assinada após expirar;
- testar modo avião;
- testar tela de perfil após logout.

## Plano de incidente

Um plano de vazamento deve definir:

1. responsável técnico;
2. responsável pela comunicação;
3. revogação imediata de sessões;
4. remoção de contas afetadas;
5. desativação temporária da API;
6. pausa dos uploads;
7. isolamento do projeto;
8. preservação dos logs necessários;
9. identificação dos dados afetados;
10. avaliação do impacto segundo a LGPD;
11. comunicação à organização e aos titulares;
12. correção e teste;
13. restauração controlada;
14. relatório pós-incidente.

Não existe garantia absoluta contra vazamentos. O objetivo é impedir acesso não autorizado por padrão, limitar o impacto e detectar desvios rapidamente.
