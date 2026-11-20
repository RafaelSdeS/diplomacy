# Sessão de teste do piloto

Roteiro para testar o app com um grupo pequeno (passo 12), no formato do **mock** do primeiro dia do UFRGSMUN: uma simulação de treino com um cenário fictício, que é também o momento de ensinar o app a todo mundo. Duração: de 1h30 a 2h.

## Antes do dia

1. **Comitê de treino na nuvem.** Rode uma vez (pode repetir sem duplicar nada):

   ```sh
   npx supabase db query --remote --file supabase/treino.sql
   ```

   Ele cria o comitê TREINO no evento UFRGSMUN 2027, com seis delegações (Argentina, Bolívia, Brasil, Chile, Paraguai e Uruguai), a crise ligada, o veículo da press e dois tópicos fictícios:
   - A crise do Rio Aurora: seca, barragens e fronteiras;
   - Refugiados climáticos na fronteira norte.

2. **Contas.** Uma por pessoa, fictícias e entregues na hora:
   - Crie cada conta no painel do Supabase: **Authentication → Users → Add user**, com **Auto Confirm User**. Use variações do seu e-mail, como `voce+brasil@gmail.com`, e uma senha simples por pessoa.
   - Entre como secretaria e convide cada conta em **Participantes**, com o papel, o comitê TREINO e, para delegados, a delegação.

   | Papel | Quantas |
   |---|---|
   | Delegado | uma por delegação (até 6) |
   | Mesa | 1 ou 2 |
   | Crise | 1 |
   | Press | 1 |
   | Diretoria da Press | a sua conta da secretaria (no piloto, a secretaria faz esse papel) |

   Escreva cada e-mail e senha num papelzinho, para entregar na hora.

3. **Telão.** Um notebook ligado ao projetor, com a conta da mesa aberta em `/telao/TREINO` em tela cheia. Teste o projetor antes: a tela tem que caber em 1920 × 1080 sem rolar.

4. **Plano B em papel** (veja abaixo), impresso e na mesa.

5. **Cenário.** Mande o guia de estudos fictício (uma página: o rio, as barragens, quem depende da água) para as delegações um dia antes.

## Roteiro (1h30 a 2h)

| Tempo | Momento | O que testar no app |
|---|---|---|
| 10 min | Entrada | Login no celular de cada um; cada delegação vê o próprio comitê na Agora |
| 10 min | Chamada | A mesa abre a sessão e faz a chamada em **Sessão → Chamada e rodízio**; o quórum aparece |
| 20 min | Plenária de abertura | Briefing; discursos de abertura pela lista de oradores; moção do tópico no topo votada no celular; a agenda informal com as propostas lado a lado |
| 20 min | Debate formal-informal | O rodízio sorteia a delegação que preside; placas levantadas no celular; cronômetro no telão; pontos e moções |
| 10 min | Crise | A equipe de crise publica uma atualização (plantão no telão); as delegações mandam notas; a crise responde |
| 20 min | Working paper e projeto | Um bloco escreve um working paper (o redator aceita propostas); a mesa aprova; o projeto junta as cláusulas, ganha 5 assinaturas e vai à mesa |
| 10 min | Votação | A mesa assume a presidência, aprova o projeto e abre a votação no painel (**Projetos de resolução**); as delegações votam no celular; o telão mostra o resultado |
| o tempo todo | Press | A press publica do celular; uma nota urgente vira plantão no telão; a delegação citada vê na Agora |
| 10 min | Fim | Questionário (abaixo) |

## Plano B em papel

O combinado: **se o app parar para mais da metade da sala por mais de 2 minutos**, a mesa anuncia o plano B e segue no papel até o fim da etapa. Quem decide é a mesa.

- Placas de papel com o nome de cada delegação.
- Lista de oradores e cronômetro no caderno e no celular da mesa (cronômetro do próprio celular).
- Notas de crise em papel, recolhidas por um mensageiro.
- Votação por placa, com contagem pela mesa.
- O working paper segue no papel; a mesa passa para o app depois, se ele voltar.

Anote o horário, o que parou e em quantos aparelhos: isso entra no relatório.

## Depois da sessão

### Métricas

As consultas ficam em `supabase/consultas/` (veja o README de lá):

- tempo de resposta da crise e notas sem resposta no fim da sessão;
- tempo do envio do projeto até a votação;
- matérias publicadas por veículo.

### Questionário (5 minutos, por função)

Para todos:
1. De 1 a 5, o app ajudou ou atrapalhou a sessão?
2. Em algum momento você não soube o que fazer na tela? Qual?
3. O app travou ou ficou sem atualizar no seu aparelho? Quando?
4. Qual aparelho e navegador você usou?

Delegado:
5. Levantar a placa, votar e mandar nota de crise pelo celular foi mais fácil ou mais difícil do que no papel?
6. Você leu as matérias da press no app?

Mesa:
5. O painel da presidência deu conta do ritmo da sessão? O que faltou?
6. **Você usaria o app no evento?** Por quê?

Crise:
5. A fila de notas deu conta? Alguma nota se perdeu ou chegou duplicada?
6. **Você usaria o app no evento?** Por quê?

Press:
5. Publicar do celular foi rápido o bastante para cobrir a sessão?
6. O aviso de palavrão atrapalhou ou ajudou?

## Critérios de aceite do piloto

- Uma sessão inteira sem papel, do debate da agenda à resolução votada.
- Nenhuma nota de crise perdida.
- Tudo funciona num celular de 360 px, num notebook de 1366 × 768 e no projetor.
- Custo zero.
- A mesa e a equipe de crise dizem que usariam o app no evento.
