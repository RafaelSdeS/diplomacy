# Passo 17 · Comunicação completa

**Parte de:** evento
**Depende de:** 11 e 15
**Objetivo:** completar as mensagens entre delegações e as ferramentas da press previstas no Guia de Regras.

## Como ficou

- **Mensagens** numa tabela só (`mensagem`), com o id gerado no aparelho e enviadas pela caixa de saída: bilhete (entre duas delegações), canal interno (mesa e crise) e conversa da delegação com a mesa. Tela `/comite/[sigla]/mensagens`, que mostra a cada um as próprias conversas e a regra dos bilhetes do comitê para todos.
- **Regra dos bilhetes:** a mesa liga a leitura (`mesa_le_bilhetes`) e o bloqueio (`bilhetes_bloqueados`, regra nova); a mudança fica em `registro`. Um bilhete denunciado passa a ser lido pela mesa, que pode ocultá-lo (também em `registro`).
- **Tempo real:** o Broadcast ganhou o canal `mesa:<id>`. Os bilhetes vão aos canais das duas delegações e da mesa; o canal interno, aos da mesa e da crise.
- **Diretoria da Press:** papel próprio do evento (`diretoria_press`, sem comitê, como a secretaria): modera as notícias, lê as denúncias e o registro e abre a coletiva, sem os outros poderes da secretaria.
- **Entrevistas:** `/press/entrevistas` para a press; o pedido aparece em Mensagens para a delegação, que aceita com o horário ou recusa.
- **Coletiva:** `/press/coletiva`. A pauta (até 4 perguntas por veículo, uma por delegação do próprio comitê) fica visível ao evento; as respostas acontecem na sala e viram matéria.
- **Edição do dia:** `/imprimir/edicao/[sigla]` (`?dia=` e `?especial=1` para a do último dia).
- **Imagem para as redes:** no feed do veículo, post e story gerados no aparelho, com o selo "Simulação · UFRGSMUN"; no celular, o botão de compartilhar do sistema, e no notebook, o download. A legenda leva as hashtags.
- **Recortes:** no perfil, as matérias que citam a delegação.

## Mensagens

- [x] **Bilhetes entre delegações**, em personagem, usando a caixa de saída do passo 15.
- [x] A regra da mesa vale por comitê: pode ou não ler os bilhetes, e pode bloqueá-los. A regra aparece para todos no comitê.
- [x] Botão de denúncia; ações da mesa ficam em `registro`.
- [x] **Canal interno** de cada comitê entre a mesa e a equipe de crise.
- [x] **Delegado e mesa:** dúvidas e pedidos privados.
- [x] Nada de grupo geral nem conversa fora do personagem.

## Press

- [x] **Diretoria da Press** com papel próprio (hoje usa uma conta da secretaria, que vê mais do que precisa): aprova, oculta, lê denúncias e abre a coletiva.
- [x] **Entrevista:** o jornalista pede pelo app, e o delegado aceita e escolhe um horário.
- [x] **Coletiva conjunta:** a mesa da press abre a coletiva; cada jornalista escolhe 3 ou 4 entrevistados do seu comitê, com uma pergunta para cada; depois vira matéria.
- [x] **Edição do dia:** modelo de impressão com a edição breve de cada jornal no fim do dia e a edição especial do último dia.
- [x] **Imagem para as redes:** gerada no aparelho (canvas para PNG) nos formatos de post e story, com o nome do veículo, o selo "Simulação · UFRGSMUN" e as hashtags do evento na legenda.
  - No celular, compartilhamento pelo botão nativo (Web Share com arquivo).
  - No notebook, download da imagem.
- [x] **Recortes:** as matérias que citam uma delegação aparecem no perfil dela.

## Testes

Arquivos: `supabase/tests/17-comunicacao.test.sql`, `src/lib/imagem-redes.test.ts` e `tests/17-comunicacao.spec.ts`.

- [x] pgTAP: um bilhete só aparece para as duas delegações; com a leitura desligada a mesa não lê, e com ela ligada lê.
- [x] pgTAP: com bilhetes bloqueados no comitê, ninguém envia.
- [x] pgTAP: o canal da mesa com a crise não aparece para delegados.
- [x] Vitest: a imagem para story sai com 1080 × 1920 e a de post com 1080 × 1080, sempre com o selo de simulação.
- [x] Ponta a ponta: um bilhete escrito offline chega uma vez só.
- [x] Ponta a ponta: um pedido de entrevista aceito aparece para os dois lados.
- [x] Ponta a ponta: a edição do dia reúne as matérias publicadas no dia.
- [ ] Manual: compartilhar a imagem no Instagram pelo botão nativo, num Android e num iPhone.

## Pronto quando

- [x] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [x] As delegações trocam bilhetes, e as regras da mesa são respeitadas.
- [x] A press faz entrevistas, coletiva, edição do dia e imagens para as redes pelo app.
