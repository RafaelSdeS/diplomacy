# Passo 17 · Comunicação completa

**Parte de:** evento
**Depende de:** 11 e 15
**Objetivo:** completar as mensagens entre delegações e as ferramentas da press previstas no Guia de Regras.

## Mensagens

- [ ] **Bilhetes entre delegações**, em personagem, usando a caixa de saída do passo 15.
- [ ] A regra da mesa vale por comitê: pode ou não ler os bilhetes, e pode bloqueá-los. A regra aparece para todos no comitê.
- [ ] Botão de denúncia; ações da mesa ficam em `registro`.
- [ ] **Canal interno** de cada comitê entre a mesa e a equipe de crise.
- [ ] **Delegado e mesa:** dúvidas e pedidos privados.
- [ ] Nada de grupo geral nem conversa fora do personagem.

## Press

- [ ] **Entrevista:** o jornalista pede pelo app, e o delegado aceita e escolhe um horário.
- [ ] **Coletiva conjunta:** a mesa da press abre a coletiva; cada jornalista escolhe 3 ou 4 entrevistados do seu comitê, com uma pergunta para cada; depois vira matéria.
- [ ] **Edição do dia:** modelo de impressão com a edição breve de cada jornal no fim do dia e a edição especial do último dia.
- [ ] **Imagem para as redes:** gerada no aparelho (canvas para PNG) nos formatos de post e story, com o nome do veículo, o selo "Simulação · UFRGSMUN" e as hashtags do evento na legenda.
  - No celular, compartilhamento pelo botão nativo (Web Share com arquivo).
  - No notebook, download da imagem.
- [ ] **Recortes:** as matérias que citam uma delegação aparecem no perfil dela.

## Testes

Arquivos: `supabase/tests/17-mensagens.test.sql`, `src/lib/press/imagem.test.ts` e `tests/17-comunicacao.spec.ts`.

- [ ] pgTAP: um bilhete só aparece para as duas delegações; com a leitura desligada a mesa não lê, e com ela ligada lê.
- [ ] pgTAP: com bilhetes bloqueados no comitê, ninguém envia.
- [ ] pgTAP: o canal da mesa com a crise não aparece para delegados.
- [ ] Vitest: a imagem para story sai com 1080 × 1920 e a de post com 1080 × 1080, sempre com o selo de simulação.
- [ ] Ponta a ponta: um bilhete escrito offline chega uma vez só.
- [ ] Ponta a ponta: um pedido de entrevista aceito aparece para os dois lados.
- [ ] Ponta a ponta: a edição do dia reúne as matérias publicadas no dia.
- [ ] Manual: compartilhar a imagem no Instagram pelo botão nativo, num Android e num iPhone.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [ ] As delegações trocam bilhetes, e as regras da mesa são respeitadas.
- [ ] A press faz entrevistas, coletiva, edição do dia e imagens para as redes pelo app.
