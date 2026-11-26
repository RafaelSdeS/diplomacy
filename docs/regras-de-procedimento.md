# Regras de procedimento que o app segue

Base: as **Rules of Procedure do UNOCT (UFRGSMUN 2026)**, que valem para todos os comitês. Os detalhes que elas não trazem vêm do Guia de Regras do UFRGSMUN 2026, baseado no Modelo Brasileiro. Se as duas fontes discordam, vale a do UNOCT. As regras especiais de alguns comitês (CSNU, Conselho Europeu, OEA) ficam por cima das gerais.

Os valores que podem mudar de uma edição ou de um comitê para outro ficam em `regras_do_guia()`, no padrão do evento e nos ajustes do comitê (passo 05). O resto é fluxo, implementado nos passos 06, 07, 09 e 16.

## Geral

- **Idioma** oficial do comitê; **linguagem diplomática** o tempo todo; **plágio** proibido.
- **Não há premiação** no UFRGSMUN.
- Programação de 4 dias, com 8 sessões. O primeiro dia tem credenciamento, uma **simulação de treino (mock) com as regras** e a cerimônia de abertura. O terceiro dia termina com a coletiva de imprensa. As redes são `@ufrgsmun` (institucional) e `@press.ufrgsmun` (press).

## Presidência da sessão

- Cada sessão tem uma presidência formada por uma **delegação não observadora**. Ela escolhe quem fala entre as delegações que pedem a palavra e controla o tempo de fala, quando há um.
- A lista da presidência é **sorteada com todas as delegações** (menos as observadoras) durante a primeira sessão. O resultado é divulgado antes da plenária de abertura. As que não presidirem formam a lista de espera.
- Uma delegação preside **no máximo duas sessões**.
- **O bureau preside:**
  1. a plenária de abertura (a delegação da vez só assume quando todos os procedimentos da plenária terminam);
  2. a fase de ação (projeto de resolução; as emendas saíram no passo 63);
  3. casos excepcionais.
- **Delegação da vez ausente** (25/11/2026): assume a próxima sorteada que estiver presente; a ausente não perde a vez.
- **Uma presidência por vez** (confirmado em 25/11/2026): quem deixa de presidir perde na hora as ações de presidente. A presidência só passa no fim da sessão (a sessão seguinte começa com a próxima da lista) ou com a não-confiança aprovada. A presidência continua sendo uma delegação: vota e discursa.
- **Moção de não-confiança:** pedido escrito informal ao bureau, com assinaturas de **1/5 das delegações previstas**, e aprovação por **maioria simples**. Se aprovada, assume a próxima delegação da lista de espera.

## Plenária de abertura

Começa automaticamente na primeira sessão, em dois momentos, sempre moderados pelo bureau:

1. **Briefing e diálogo interativo:** relato sobre cada tópico, perguntas e sugestão de uma **agenda informal**.
2. **Discursos de abertura:** um discurso por delegação sobre os dois tópicos. **Todas as delegações entram automaticamente na lista de oradores.**

Termina com a **moção de introdução do tópico no topo da agenda**.

## Sessão

- **Chamada** no início de cada sessão, em ordem alfabética.
- **Quórum para abrir a sessão:** 1/3 das delegações previstas. **Quórum para votações substantivas:** maioria simples das delegações previstas.
- **Maioria simples:** o número inteiro imediatamente acima da metade das delegações presentes na sessão. Empate reprova.
- **Dois terços:** dois terços do quórum da sessão (as presentes), arredondados para cima.
- **Maioria qualificada:** só nas regras especiais.
- **Discursos:** ninguém fala sem a permissão da presidência ou do bureau. O tempo de fala é definido antes.
- **Não há direito de resposta.**

## Formas de debate

| Forma | Quando | Como |
|---|---|---|
| Formal-formal | Só na plenária de abertura | Lista de oradores |
| Formal-informal | Fluxo normal do debate | A presidência escolhe quem tem a palavra entre as placas levantadas |
| Informal-informal | Por moção | Sem interferência do bureau; aprovado por maioria simples; no máximo 45 minutos somados em cada sessão |

## Pontos e moções

Podem ser levantados entre discursos ou durante o próprio discurso.

| Ponto | Uso |
|---|---|
| Ponto de ordem | Quando o bureau não segue as regras. Não interrompe o discurso de outra delegação. |
| Ponto de privilégio pessoal | Assuntos fora do conteúdo: não ouvir ou não ser ouvido, desconforto, integridade ou dignidade atingida num discurso. |
| Ponto de dúvida (inquiry) | Esclarecer o fluxo, o procedimento ou perguntar sobre o tópico. |

| Moção | Maioria | Procedimento | Quando | Efeito |
|---|---|---|---|---|
| Introdução do tópico no topo da agenda | Simples | Lista especial (2 a favor, 2 contra) | Fim da plenária de abertura | Escolhe o tópico debatido primeiro; rejeitada, entra o outro |
| Adiamento do debate | Dois terços | Lista especial (2 a favor, 2 contra) | Com a palavra aberta | Passa ao outro tópico |
| Adiamento da sessão | Simples | Sem debate | Quando o bureau diz que está em ordem | Encerra a sessão |
| Informal-informal | Simples | Pedido ao bureau | Debate | Até 45 minutos sem o bureau |
| Não-confiança | Simples | Pedido escrito com 1/5 de assinaturas das previstas | Sessão fechada, quando a presidência não cumpre o papel | Assume a próxima da lista de espera |
| Divisão da questão | Simples | Lista especial (2 a favor, 2 contra) | Só na votação de um projeto | Vota as operativas separadamente |
| Votação nominal | Nenhuma | Aprovada automaticamente quando reconhecida | Só na votação de um projeto | O bureau chama cada delegação em ordem alfabética |

## Documentos

Regras oficiais (UNOCT Rules of Procedure), com o caminho decidido pela organização em 26/11/2026 ([passo 63](implementacao/63-um-projeto-por-topico.md)). O que o app faz diferente das regras oficiais está marcado.

- **Working paper:** documento informal para ajudar o trabalho (notícias, resoluções anteriores, cláusulas de rascunho, mídia...). Sem formato fixo, não é votado e **não exige signatários**; quem concorda pode assinar. Observadoras podem apresentar. No app:
  - **um por grande item da agenda, de toda a sala** (não de um bloco), criado quando a agenda do tópico é adotada;
  - o redator de cada bloco (ou a delegação sem bloco, que é a própria redatora) propõe incluir, alterar, mover ou retirar cláusulas; toda delegação marca apoio, ressalva ou contra; **quem preside a sessão aceita ou rejeita** depois do debate (o sinal de consenso, ninguém contra e apoio de metade, é só o termômetro);
  - *diferente das regras oficiais:* não passa pela aprovação do bureau "para ser mencionado", porque já é da sala.
- **Projeto de resolução:**
  - precisa da aprovação do bureau e de **no mínimo 5 signatários** (as observadoras não assinam);
  - é aprovado por **maioria simples**;
  - **uma resolução por tópico**: aprovada a resolução, o debate do tópico acaba e o comitê passa ao próximo;
  - no app, **um projeto por tópico**: a mesa ouve a sala e transforma os working papers dele (primeiro os preâmbulos, depois as operativas, na ordem dos itens), e as assinaturas dos working papers passam junto.
- **Passo a passo do projeto:**
  1. A mesa transforma os working papers do tópico em projeto. Ele nasce fechado: só correções de forma, pela mesa.
  2. Com 5 assinaturas, a mesa o leva à fase de ação.
  3. Um signatário lê o projeto; só cabem correções de gramática ou técnicas, nunca de conteúdo.
  4. **Consenso primeiro:** o bureau pergunta se alguma delegação se opõe. Sem oposição, o projeto é aprovado. *Diferente das regras oficiais:* os signatários não escolhem antes entre consenso e votação.
  5. **Com objeção:** vai a voto. *Diferente das regras oficiais:* sem emendas (as mudanças de conteúdo foram todas propostas nos working papers). Rejeitado, os working papers do tópico reabrem para propostas.
- **Resolução de crise:** escrita por um bloco, que a envia à mesa com 5 signatários e a escolha entre consenso e votação.
- **Votação do projeto:** a sala fica fechada (ninguém entra nem sai), e só duas moções estão em ordem: divisão da questão e votação nominal. A preferência é sempre o consenso.

## Do Guia de Regras (detalhes que o UNOCT não traz)

- Aviso de tempo quando faltam 10 segundos.
- Questões procedimentais: só a favor ou contra, e observadoras votam. Questões substantivas: com abstenção. Na chamada, a delegação está presente ou ausente: no UFRGSMUN, "presente" e "presente e votando" são a mesma coisa. Suspensas não votam.
- Votação nominal: cada delegação pode passar a vez uma vez; quem passou não se abstém depois.
- Divisão da questão aprovada: 5 minutos de informal-informal para receber as propostas, votadas da mais à menos substancial; se todas as operativas caírem, o projeto é rejeitado.
- Regras especiais: CSNU (9 votos a favor e nenhum voto contra de membro permanente; a parte numa disputa se abstém), Conselho Europeu (unanimidade das previstas) e OEA (tecnologia restrita, observadoras e uma delegação suspensa).

## Dúvidas para a organização

- "Sessão fechada", na não-confiança, quer dizer o quê?
- Delegações suspensas contam como previstas no quórum? Por enquanto, não contam.
- ~~Quem sugere a agenda informal?~~ Respondido em 25/11/2026: o bureau chega com a agenda de cada tópico pré-organizada, liberada só no dia do evento; a primeira sessão de cada tópico a debate, e alterá-la funciona como alterar um working paper (ordem de debate, incluir, retirar; passo 60).
