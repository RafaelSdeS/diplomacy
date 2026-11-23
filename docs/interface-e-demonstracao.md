# Plano de interface oficial e demonstração online

## Objetivo

Reforçar a aparência profissional do app e reduzir a navegação por abas. Criar uma demonstração pública em ambiente separado para mostrar comitê, delegações, documentos, bureau e fluxos de operação.

## Fonte das regras de interface

As regras gerais de interface (hierarquia, direção visual, quando usar modal, página ou menu suspenso, densidade, estados vazios, navegação móvel) estão em um único lugar: [Melhorias de organização, visual e usabilidade](melhorias-interface.pdf), com fonte em [HTML](melhorias-interface.html). Em caso de divergência, vale esse documento.

Este documento cobre só o que não está lá: o catálogo de modais com os componentes que já existem, a modal de saída, os ícones do cabeçalho e a demonstração online.

## Modals

Usar `<dialog>` para ações que não exigem outra página.

### Tela de delegação

Abrir a delegação em painel lateral direito:

- bandeira;
- nome;
- situação;
- delegados;
- documentos visíveis;
- cartas visíveis;
- contatos ou ações permitidas.

A ficha já existe em [src/lib/ui/FichaDelegacao.svelte](../src/lib/ui/FichaDelegacao.svelte#L52).

Ela deve continuar disponível por clique no nome da delegação, sem perder a página atual.

### Ir para

Manter a busca global como modal.

O componente atual em [src/lib/ui/IrPara.svelte](../src/lib/ui/IrPara.svelte#L77) já permite:

- buscar telas;
- buscar delegações;
- buscar documentos;
- abrir ficha da delegação;
- fechar sem mudança de URL ao selecionar a ficha.

Ampliações possíveis:

- buscar veículos da press;
- buscar matérias;
- buscar comitês;
- agrupar por papel.

### Confirmações

Usar o componente compartilhado [src/lib/ui/Confirmar.svelte](../src/lib/ui/Confirmar.svelte#L11) para ações irreversíveis:

- sair;
- encerrar sessão;
- encerrar votação;
- retirar adoção;
- retirar ponto;
- encerrar coletiva;
- ocultar notícia;
- excluir conta;
- remover participação;
- trocar de cenário em demonstração.

A modal deve explicar o efeito, não apenas repetir o nome do botão.

### Respostas e entrevistas
Usar modals para:

- confirmar a chamada da delegação em uma coletiva oral;
- aceitar ou recusar entrevista;
- escolher horário;
- consultar pedido;
- selecionar destinatários de carta;
- adicionar delegações citadas.

Na coletiva, a modal da delegação não contém um campo de resposta nem revela antecipadamente a pergunta. Ela apenas informa a chamada, o veículo e o estado do microfone. A delegação responde oralmente.

Não abrir uma página inteira para uma ação que pode ser concluída em poucos campos.

### Documentos

Documentos completos podem ter URL própria.

Prévias leves devem ser modals:

- DPO;
- carta;
- working paper;
- projeto;
- notícia.

A visualização completa continua disponível por link para compartilhar ou imprimir.

### Telas que podem continuar em links

Navegação completa ainda faz sentido para:

- Agora;
- sessão;
- painel da mesa;
- documentos completos;
- lista de matérias;
- perfil;
- privacidade;
- exportação LGPD.

Essas telas possuem URL própria e fazem sentido como destino do navegador.

## Ícones

O passo 43 nasceu da queixa "é difícil de achar". Por isso o texto continua onde a pessoa procura uma ação; o ícone entra para reforçar, e só sozinho quando o significado é universal.

O app já usa o conjunto Lucide (`@lucide/svelte`) com importação ícone a ícone, então só entram no pacote os ícones usados. Nenhuma biblioteca nova. Depois de adicionar ícones, rodar `npm run tamanho` (limite de 300 KB; a primeira abertura está em ~167 KB).

### Cabeçalho

| Ação | Notebook | Celular | Ícone |
|---|---|---|---|
| Busca "Ir para…" | ícone | ícone | `Search` |
| Notificações | ícone | ícone | `Bell` |
| Perfil | ícone **e** a palavra "Perfil" | em "Mais", com texto | `CircleUser` |
| Sair | ícone **e** a palavra "Sair" | em "Mais", com texto | `LogOut` |
| Tema claro/escuro | ícone | em "Mais", com texto | `Sun`/`Moon` |
| Idioma | código atual (PT/EN) | em "Mais", com texto | `Languages` |

Só a lupa e o sino ficam sozinhos. Perfil, Sair, tema e idioma sempre trazem texto: "Sair" por ser a ação que apaga dados do aparelho, e os outros porque o ícone não diz o que fazem.

Manter nome da delegação ou papel em uma identidade visual separada.

Todo ícone, com ou sem texto, tem:

- `aria-label` quando estiver sozinho;
- `title` ou tooltip;
- foco visível;
- teste de teclado.

Os protótipos usam os mesmos ícones. Os glifos `◯` e `◉` de versões anteriores não significam nada e saíram.

### Tarefas

No menu, manter nomes curtos e ícones:

- Agora;
- Sessão;
- Documento;
- Crise;
- Press;
- Mais.

### Mais

Mover itens secundários para `/mais` sem remover todos os ícones.

Cada item deve ter nome e descrição curta, especialmente em celular.

## Modal de saída

O botão `Sair` deve abrir modal com:

- usuário atual;
- comitê ou delegação;
- texto “Os dados desta sessão serão removidos deste aparelho”;
- se a caixa de saída tiver itens não enviados: “Há N itens não enviados”, com `Enviar agora` e `Sair mesmo assim`;
- confirmação `Sair`;
- cancelamento.

Após confirmação:

- desativar push;
- apagar todos os caches de dados (`dados-*`, passo 44);
- encerrar sessão;
- esquecer dados locais;
- mostrar página de login.

## Aparência das modals

Manter os padrões já definidos em [src/app.css](../src/app.css#L871):

- borda fina;
- fundo sólido;
- sem sombras exageradas;
- `backdrop` marinho translúcido;
- largura limitada;
- botão de fechar claro;
- botão primário curto.

Adicionar:

- título com hierarquia clara;
- descrição curta;
- estados de loading;
- estado de erro;
- foco inicial no campo principal;
- fechamento por Escape;
- retorno de foco ao acionador;
- não fechar sobre ação ainda em andamento.

## Demonstração online

### Ambiente

Criar uma instância separada da produção.

Recomendações:

- Cloudflare próprio (um segundo Worker, `wrangler.demo.jsonc`, com as próprias variáveis);
- Supabase próprio, com as migrações aplicadas a cada passo que tenha migração;
- domínio separado;
- dados fictícios;
- contas geradas pelo script;
- reinstalação periódica **agendada** (todo dia de madrugada) e também sob demanda;
- banner permanente `Ambiente de demonstração`.

Nunca usar a demonstração para dados reais ou credenciais reais.

Decisões do passo 48 antes de publicar:

- **Plano do projeto.** O projeto gratuito do Supabase pausa depois de cerca de uma semana sem uso: usar um acesso agendado a cada poucos dias ou um plano pago só para a demonstração.
- **Abuso.** As contas da demonstração são públicas, então qualquer pessoa escreve nela: Storage com cota pequena ou desligado, nenhum fluxo que mande e-mail, cadastro público desligado.
- **Trava do script.** `DEMO_PERMITIR_REMOTO=1` sozinha não separa a demonstração da produção; o script também exige o `ref` do projeto (`DEMO_PROJETO_REF`).

### Escopo mínimo

O ambiente inicial pode conter um comitê completo, não necessariamente os seis.

O cenário recomendado é CSNU-T:

- 15 delegações;
- 3 contas de bureau;
- delegados fictícios;
- delegação Dinamarca;
- delegação França;
- delegação Estados Unidos;
- conta de press;
- conta da Diretoria da Press;
- conta da secretária.

### Conteúdo mínimo

No comitê:

- 5 DPOs com estados aprovados, enviados e rascunhos;
- uma carta pública;
- uma carta reservada;
- working paper;
- projeto de resolução;
- rodada com comentários;
- notícias publicadas;
- uma coletiva aberta;
- uma pergunta já concluída (resposta oral, só com a nota curta da press);
- uma pergunta na pauta, oculta da delegação;
- uma delegação chamada neste momento;
- uma notícia citando delegação;
- sessão com chamada e presença;
- agenda adotada;
- votação demonstrativa.

O script atual já cria esse tipo de conteúdo em [scripts/demonstracao.ts](../scripts/demonstracao.ts#L180).

### Personas de acesso rápido

Criar uma página `/demo` ou modal de escolha antes do login, com botões:

- Entrar como delegado;
- Entrar como bureau;
- Entrar como press;
- Entrar como Diretoria da Press;
- Entrar como secretária.

Cada botão:

- usa conta fictícia;
- mostra o papel selecionado;
- explica o que a pessoa verá;
- redireciona para a tela principal adequada.

Não disponibilizar esse recurso no projeto de produção real. Como toda pasta de `src/routes/` entra no build, a tela fica em `src/demo/` e o script `npm run build:demo` a copia para `src/routes/demo/` antes de compilar. As contas e senhas vêm de variáveis de build (`VITE_DEMO_*`) definidas só no Worker de demonstração.

### Reset do cenário

Adicionar botão administrativo protegido:

- restaurar o cenário;
- manter credenciais;
- limpar respostas novas;
- restaurar documentos;
- restaurar coletiva.

Não permitir reset por usuário comum.

Se o reset exigir `service_role`, executar somente em script protegido ou Edge Function.

### Roteiro da demonstração

Exemplo de 15 minutos:

1. Entrar como delegado.
2. Abrir Agora.
3. Abrir uma delegação em modal.
4. Abrir DPO.
5. Abrir o documento completo.
6. Entrar como bureau.
7. Mostrar chamada e painel da mesa.
8. Mostrar documentos aguardando avaliação.
9. Entrar como press.
10. Abrir coletiva.
11. Enviar pergunta.
12. Entrar como delegação chamada.
13. Receber o chamado em modal curta e responder oralmente.
14. Voltar à press.
15. Criar matéria.
16. Mostrar telão.

### Dados fictícios

Todos os nomes devem ser claramente fictícios ou pertencentes a estados/delegações históricas.

Incluir indicador permanente:

- “Demonstração fictícia”;
- “Não use dados pessoais reais”;
- “Dados podem ser reiniciados”.

Não usar fotos reais de participantes.

## Responsividade

Validar:

- celular 360 × 740;
- celular 390 × 844;
- notebook 1366 × 768;
- telão 1920 × 1080;
- retrato e paisagem.

As modals devem caber na tela com rolagem interna e botão de fechamento.

Não colocar ações principais fora da área acessível por rolagem.

## Navegação por tarefa

Exemplos de tarefas que abrem direto no lugar, sem trocar de página:

- `Confirmar chamada` abre uma modal curta no Agora;
- `Ver delegação` abre a ficha lateral;
- `Escolher destinatário` abre lista modal;
- `Confirmar encerramento` abre confirmação;
- `Buscar documento` abre Ir para.

A regra de quando usar modal ou página está em [melhorias-interface](melhorias-interface.html), seções 5 e 11.

## Testes de interface

### Automáticos

- título e descrição da modal;
- foco inicial;
- Escape fecha;
- foco volta ao acionador;
- botão primário visível;
- conteúdo não transborda;
- estado de erro acessível;
- nenhuma ação destrutiva sem confirmação;
- nenhum botão abre link quando deveria abrir modal;
- ícones possuem rótulos.

### Acessibilidade

- contraste;
- tamanho de alvo;
- ordem de tabulação;
- leitores de tela;
- sem conteúdo indicado apenas por cor;
- sem animação por excesso de movimento;
- modal não deixa o fundo utilizável indevidamente;
- texto alternativo em bandeiras e documentos.

### Aparência

Capturas em:

- cabeçalho desktop;
- cabeçalho celular;
- modal de delegação;
- modal de saída;
- modal da coletiva;
- página da demonstração;
- telão da coletiva.

## Sequência de implementação

1. criar padrão visual das modals;
2. substituir links de ações contextuais;
3. criar modal de saída;
4. converter perfil secundário em modal ou painel quando possível;
5. reforçar o componente Ir para;
6. padronizar ícones;
7. criar ambiente de demonstração;
8. criar página de escolha de papel;
9. semear conteúdo mínimo;
10. registrar e testar o roteiro.

## Definição de pronto

- ações contextuais não levam a outra aba sem necessidade;
- ícones têm nome acessível;
- modals fecham por botão, Escape e backdrop seguro;
- o ambiente demonstra pelo menos um comitê completo;
- delegados, bureau, documentos e press são acessíveis;
- dados são fictícios;
- produção e demonstração são ambientes separados;
- nenhum usuário real é necessário para validar o fluxo;
- a demonstração pode ser reiniciada;
- o roteiro foi testado manualmente em celular e notebook.
