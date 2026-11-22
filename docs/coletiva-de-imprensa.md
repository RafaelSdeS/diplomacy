# Plano detalhado da coletiva de imprensa

## Correção conceitual

A coletiva de imprensa é um momento ao vivo e improvisado.

- os jornalistas fazem perguntas para delegações selecionadas;
- uma delegação pode ser chamada sem saber qual pergunta receberá;
- a pergunta é feita oralmente;
- a delegação escolhida responde oralmente, sem preparação escrita prévia;
- não existe formulário de resposta para substituir a fala;
- o app organiza a ordem, revela a pergunta no momento certo e registra o resultado operacional;
- a press pode transformar a informação oral em matéria depois da coletiva.

Este plano não transforma a coletiva em uma entrevista por chat nem em um questionário escrito.

## Objetivo

Transformar `/press/coletiva` em uma ferramenta operacional para conduzir o momento real:

- organizar veículos, delegações e perguntas;
- ocultar a pergunta da delegação até a chamada;
- indicar claramente quem deve responder;
- acompanhar a ordem da fala;
- oferecer um cronômetro curto;
- registrar o início, a chamada e o fim da resposta;
- guardar contexto suficiente para a press produzir a matéria;
- mostrar ao público apenas o que já foi autorizado.

A Diretoria da Press continua moderando manualmente. O app reduz dúvidas e troca de páginas.

## Participantes

| Papel | Responsabilidade |
|---|---|
| Diretoria da Press | Abre a coletiva, organiza a fila, chama a delegação e encerra o momento |
| Jornalista / Press | Prepara uma pergunta detalhada, escolhe delegações do próprio comitê e faz a pergunta ao vivo |
| Delegação escolhida | Não vê a pergunta antes da chamada e responde oralmente |
| Bureau | Pode acompanhar o andamento público |
| Participantes | Veem apenas a pauta e o estado autorizados pela Diretoria |

O app não grava automaticamente a fala. Para uma gravação posterior, ela deve ser uma decisão explícita da organização, com aviso e autorização adequados.

## Informação necessária na pauta

Cada pergunta na pauta contém:

- veículo;
- jornalista responsável;
- delegação selecionada;
- texto da pergunta;
- estado;
- ordem;
- horário da criação;
- horário da chamada;
- horário do início da resposta;
- horário do encerramento da resposta;
- observação opcional da press para redação posterior.

A delegação não recebe o texto da pergunta antes da chamada.

O veículo pode preparar uma pergunta longa. Ela é usada pela Diretoria no controle de moderador e pelo jornalista que fará a fala.

## Estados da coletiva

| Estado | Significado |
|---|---|
| Fechada | Não há coletiva aberta |
| Aberta | Direção pode receber perguntas |
| Na pauta | Pergunta preparada e aguardando |
| Pronta | Pergunta revisada pela Diretoria |
| Chamando | Delegação indicada para responder |
| Respondendo | Delegação está falando |
| Concluída | Resposta oral terminou |
| Retirada | Pergunta removida pela Diretoria |

Nenhuma delegação é considerada “respondida” automaticamente pelo app. Somente a Diretoria da Press ou uma pessoa autorizada conclui a resposta.

## Fluxo

### 1. Abrir

A Diretoria da Press:

1. abre a coletiva;
2. define o título;
3. escolhe ou confirma o comitê;
4. permite que a press envie perguntas;
5. mostra o estado ao vivo no telão.

A coletiva continua um momento presencial. Abrir no app não cria a sala nem substitui o microfone.

### 2. Preparar a pergunta

Cada press:

1. escolhe até quatro delegações do próprio comitê;
2. prepara uma pergunta diferente para cada delegação;
3. escreve o texto completo no app;
4. envia para a pauta.

A pergunta não aparece para a delegação escolhida.

Limites:

- máximo de quatro delegações por veículo;
- uma pergunta por veículo para cada delegação;
- delegação pertence ao mesmo comitê;
- delegação não suspensa;
- texto com limite acordado pela organização.

### 3. Revisar e ordenar

A Diretoria da Press vê todas as perguntas e pode:

- confirmar;
- alterar a ordem;
- mover para o fim;
- retirar;
- registrar um motivo curto;
- encerrar o recebimento de novas perguntas.

A organização pode permitir que a Diretoria veja todas as perguntas, mesmo sem revelar o texto ao público.

### 4. Chamar

Quando a Diretoria chama uma pergunta:

1. o status muda para `Chamando`;
2. a delegação recebe apenas o aviso “Sua delegação foi chamada”;
3. o nome da delegação aparece no telão;
4. o nome do veículo e a pergunta são mostrados ao público;
5. o microfone é entregue pela direção da sala;
6. a jornalista faz a pergunta oralmente;
7. a Diretoria inicia o estado `Respondendo`;
8. opcionalmente, o cronômetro começa.

Antes da chamada, o app não revela o texto da delegação.

O jornalista pode ver o próprio texto no momento da chamada. A delegação pode ver o veículo e o estado, mas não o texto antecipadamente.

### 5. Responder oralmente

A delegação responde falando, sem digitar uma resposta.

A interface da delegação apenas mostra:

- que sua delegação foi chamada;
- qual veículo fez a pergunta;
- título da coletiva;
- cronômetro público, se a organização usar;
- botão para confirmar que recebeu a chamada, opcional.

Não mostrar campo de texto ou editor durante a resposta.

### 6. Concluir

Quando a direção encerra a resposta:

- a Diretoria marca `Concluída`;
- o cronômetro para;
- o próximo item pode ser chamado;
- a press recebe uma área para registrar uma nota curta após a fala.

Se a fala não ocorrer:

- marcar como não respondida;
- registrar motivo opcional;
- não presumir que houve resposta.

## Interfaces

### Diretoria da Press

Mostrar um painel compacto:

- título da coletiva;
- estado atual;
- próxima delegação;
- próxima pergunta;
- botão `Chamar próxima`;
- botão `Iniciar resposta`;
- cronômetro;
- botão `Concluir resposta`;
- botão `Retirar`;
- botão `Encerrar coletiva`.

Todas as ações críticas usam confirmação curta. Nenhuma delas depende de digitar uma resposta.

### Jornalista / Press

Mostrar:

- quantas perguntas foram enviadas;
- quantas delegações podem ser escolhidas;
- estado de cada pergunta;
- edição antes da chamada;
- texto completo no momento da chamada;
- área pós-coletiva para nota ou citação curta.

A press não deve navegar para outra tela para enviar uma pergunta. Usar modal ou painel contextual.

### Delegação

No celular:

- cartão destacado “Sua delegação foi chamada”;
- nome do veículo;
- título da coletiva;
- indicador `Aguarde o microfone`;
- cronômetro, se autorizado;
- nenhuma pergunta escrita antecipada.

No momento da pergunta oral, a delegação vê apenas a própria situação atual.

Depois da fala:

- nenhuma ação obrigatória no app;
- opcionalmente, a delegação pode registrar uma nota privada sobre o que foi dito.

### Telão público

Mostrar:

- título da coletiva;
- veículo;
- delegação chamada;
- estado `Chamando` ou `Respondendo`;
- cronômetro, se usado;
- pergunta somente no momento autorizado pela Diretoria.

Não mostrar:

- perguntas não chamadas;
- motivos internos;
- respostas ou notas privadas;
- nome do jornalista antes do momento público;
- ações da Diretoria.

## Como o app ajuda sem substituir a dinâmica

O app pode:

- impedir que perguntas sejam perdidas em papel ou mensagens;
- garantir que a delegação não receba a pergunta por texto antecipadamente;
- mostrar qual delegação foi chamada;
- organizar quantas perguntas cada veículo fez;
- sincronizar o telão;
- começar e parar um cronômetro;
- registrar quando a chamada ocorreu;
- distinguir resposta concluída de ausência;
- entregar à press uma pauta oficial para redigir depois.

O app não pode substituir:

- leitura da pergunta;
- entrega do microfone;
- julgamento da resposta;
- transcrição automática;
- preparação da delegação;
- moderação presencial.

## Produção posterior da matéria

Depois da coletiva:

- a press recebe a lista de perguntas e delegações;
- cada item permite uma nota curta da fala;
- citações podem ser digitadas manualmente pela equipe que estava presente;
- o app cria um rascunho de matéria;
- o texto não é apresentado como transcrição automática;
- a revisão da Diretoria continua seguindo `press_revisao`, quando configurada.

Não fazer associação automática entre gravação e texto sem uma etapa explícita de revisão.

## Banco e estados

Manter `coletiva` e `coletiva_pergunta`.

Campos úteis:

| Campo | Uso |
|---|---|
| `ordem` | ordem da pauta |
| `status` | estado atual |
| `chamada_em` | momento da chamada |
| `resposta_iniciada_em` | início da fala |
| `resposta_concluida_em` | fim da fala |
| `presente` | confirmação opcional da delegação |
| `retirada_motivo` | motivo registrado pela Diretoria |
| `nota_press` | contexto da press após a fala |

Não manter texto da resposta como campo obrigatório. A resposta é oral.

Funções RPC necessárias:

- `abrir_coletiva`;
- `encerrar_coletiva`;
- `perguntar_na_coletiva`;
- `chamar_na_coletiva`;
- `iniciar_resposta_coletiva`;
- `concluir_resposta_coletiva`;
- `retirar_pergunta_da_coletiva`;
- `criar_materia_da_coletiva`.

Todas devem conferir papel, evento, comitê e estado.

## Segurança

### Revelação da pergunta

- delegação não recebe pergunta antes do estado `Chamando`;
- público recebe pergunta somente conforme o estado autorizado;
- jornalista recebe sempre a própria pergunta;
- Diretoria recebe todas as perguntas e ações;
- outra delegação não recebe a pergunta dirigida a uma delegação diferente.

### RLS

- press só insere no próprio veículo;
- press só altera a própria pergunta antes da chamada;
- delegação só recebe chamadas dirigidas a ela;
- Diretoria só chama e conclui;
- usuário de outro evento não vê dados;
- notas pós-coletiva são privadas conforme papel.

### Auditoria

Registrar:

- abertura;
- envio da pergunta;
- retirada;
- chamada;
- início da resposta;
- conclusão;
- encerramento;
- criação da matéria.

## Tempo real

Assinar:

- `coletiva`;
- `coletiva_pergunta`.

Atualizar invalidando `app:coletiva`.

Não permitir que o cliente calcule sozinho o estado oficial da fila. O banco fornece o estado e o horário.

## Testes de banco

- press de outro veículo não insere;
- quinto item ultrapassando limite é recusado;
- delegação de outro comitê não pode ser escolhida;
- delegação não vê pergunta antes da chamada;
- outra delegação não vê chamada;
- usuário comum não chama;
- usuário comum não inicia ou conclui resposta;
- retirada após chamada é impedida ou registrada;
- fechamento impede novas chamadas;
- notas da press não são públicas indevidamente;
- usuário de outro evento não consulta.

## Testes ponta a ponta

1. Diretoria abre a coletiva.
2. Press prepara perguntas para até quatro delegações.
3. Quinta tentativa é recusada.
4. Diretoria chama uma delegação.
5. Delegação recebe apenas o aviso.
6. Texto não aparece na delegação antes da chamada.
7. Telão mostra delegação e pergunta no momento adequado.
8. Diretoria inicia e conclui a resposta oral.
9. Próxima chamada acontece.
10. Coletiva é encerrada.
11. Press cria o rascunho de matéria com notas digitadas manualmente.

Casos adicionais:

- reconexão;
- delegação desconectada;
- chamada com outra aba aberta;
- troca de papel;
- múltiplos veículos;
- celular da delegação;
- telão em 1920 × 1080;
- diretoria no notebook;
- leitor de tela.

## Sequência de implementação

1. ajustar o modelo para estados sem resposta escrita;
2. corrigir funções de entrada e chamada;
3. implementar limite de perguntas;
4. impedir revelação antecipada no banco e na interface;
5. criar painel compacto da Diretoria;
6. criar cartão de chamada da delegação;
7. adicionar cronômetro opcional;
8. criar telão público;
9. adicionar notas pós-coletiva;
10. criar rascunho de matéria;
11. testar em dois navegadores;
12. ensaiar manualmente o momento real.

## Definição de pronto

- o app organiza a fila sem tentar responder pela delegação;
- a pergunta permanece escondida até a chamada;
- a delegação responde oralmente;
- a Diretoria controla chamada, cronômetro e conclusão;
- o telão mostra somente o que é público;
- a press pode registrar contexto depois;
- a pauta pode virar matéria;
- nenhuma pessoa vê pergunta ou chamada indevida;
- a situação foi ensaiada em celular, notebook e projetor.
