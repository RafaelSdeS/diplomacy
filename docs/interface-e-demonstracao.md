# Plano de interface oficial e demonstração online

## Objetivo

Reforçar a aparência profissional do app e reduzir a navegação por abas. Criar uma demonstração pública em ambiente separado para mostrar comitê, delegações, documentos, bureau e fluxos de operação.

## Diretriz visual

O app deve parecer um sistema oficial de uma organização, não uma rede social.

Manter:

- azul-marinho;
- dourado discreto;
- Spectral nos títulos;
- cantos retos;
- bordas finas;
- selos de estado;
- bandeiras como principal elemento colorido;
- interface clara e sem excesso de sombra.

Preferir ações contextuais em modal ou painel. Navegar para outra página somente para conteúdo que mereça URL, histórico ou visualização completa.

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

A ficha já existe em [src/lib/ui/FichaDelegacao.svelte](/home/rafael/Documents/diplomacy/src/lib/ui/FichaDelegacao.svelte:52).

Ela deve continuar disponível por clique no nome da delegação, sem perder a página atual.

### Ir para

Manter a busca global como modal.

O componente atual em [src/lib/ui/IrPara.svelte](/home/rafael/Documents/diplomacy/src/lib/ui/IrPara.svelte:77) já permite:

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

Usar o componente compartilhado [src/lib/ui/Confirmar.svelte](/home/rafael/Documents/diplomacy/src/lib/ui/Confirmar.svelte:11) para ações irreversíveis:

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

Substituir palavras por ícones quando o significado já estiver claro por posição e contexto.

### Cabeçalho

Prioridade:

| Ação | Ícone | Fallback |
|---|---|---|
| Perfil | `CircleUser` | aria-label |
| Sair | `LogOut` | tooltip e aria-label |
| Busca | `Search` | aria-label |
| Notificações | `Bell` | tooltip e aria-label |
| Tema claro/escuro | `Sun`/`Moon` | aria-label |
| Idioma | `Languages` | tooltip e código atual |

O perfil e a saída podem ficar somente em ícone em notebook estreito e celular.

Manter nome da delegação ou papel em uma identidade visual separada.

Nunca usar ícone sem:

- `aria-label`;
- `title` ou tooltip;
- foco visível;
- teste de teclado;
- fallback textual no mobile se o significado não for óbvio.

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
- confirmação `Sair`;
- cancelamento.

Após confirmação:

- desativar push;
- limpar cache autenticado;
- encerrar sessão;
- esquecer dados locais;
- mostrar página de login.

## Aparência das modals

Manter os padrões já definidos em [src/app.css](/home/rafael/Documents/diplomacy/src/app.css:871):

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

- Cloudflare próprio;
- Supabase próprio;
- domínio separado;
- dados fictícios;
- contas geradas pelo script;
- reinstalação periódica;
- banner permanente `Ambiente de demonstração`.

Nunca usar a demonstração para dados reais ou credenciais reais.

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
- uma pergunta por delegado;
- uma resposta respondida;
- uma resposta pendente;
- uma notícia citando delegação;
- sessão com chamada e presença;
- agenda adotada;
- votação demonstrativa.

O script atual já cria esse tipo de conteúdo em [scripts/demonstracao.ts](/home/rafael/Documents/diplomacy/scripts/demonstracao.ts:180).

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

Não disponibilizar esse recurso no projeto de produção real.

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

O usuário deve alcançar uma tarefa sem passar por várias páginas.

Exemplos:

- `Confirmar chamada` abre um modal curta diretamente no Agora;
- `Ver delegação` abre ficha lateral;
- `Criar documento` abre modal ou painel contextual;
- `Escolher destinatário` abre lista modal;
- `Confirmar encerramento` abre confirmação;
- `Buscar documento` abre Ir para.

URL continua necessária para telas completas, compartilhamento e impressão.

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
