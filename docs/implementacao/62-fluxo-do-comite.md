# Passo 62 · O fluxo do comitê: o que importa à vista, travas e a ordem clara

**Parte de:** uso de 26/11/2026, com o CSNU-T online populado por inteiro ("ainda está confuso e não muito intuitivo; as coisas que as pessoas mais usam não estão em destaque; fica difícil achar a ordem do que está acontecendo; com a crise, metade da tela fica vazia na Agora")
**Depende de:** 51, 56, 57, 59, 61
**Esforço:** G, em lotes
**Quando:** antes do piloto (passo 12)
**Objetivo:** ajudar quem está no comitê a fazer a próxima coisa certa, sem procurar.

## O que a investigação achou (26/11/2026, dados reais, 1366 × 768)

- **A crise engole as telas.** O alerta mostra o briefing inteiro (até 3.000 caracteres), e cada cartão tem cerca de 1.500 px. Na Agora do delegado, a sessão ao vivo começa a 1.755 px do topo. No painel de quem preside, o briefing toma a coluna do meio e empurra "Com a palavra" para fora da tela.
- **Metade da tela vazia.** A Agora tem duas colunas fixas; com um cartão só (a crise, ou a equipe de crise), a outra metade fica vazia.
- **A ordem é difícil de ler.** A trilha da sessão usa ícones sem nome ("✓ ✓ Projeto ⚒") e repete a frase do "Agora".
- **O que mais se usa não se destaca.** Na sessão, "Fazer um ponto ou moção" divide a linha com cinco botões do mesmo peso. No projeto, "Retirar a assinatura" tem o tamanho de "Enviar à mesa".
- **Quase nenhuma dica.** Só 6 dos cerca de 740 botões e links com cara de botão explicam o que fazem ao passar o mouse; os desativados não dizem por quê.
- **Travas que faltam:**
  - enviar à mesa com a rodada aberta e propostas sem resposta, que ficam penduradas para sempre;
  - o único redator sair do bloco, que fica sem quem edite ou envie;
  - encerrar a sessão com uma votação aberta, que fecha sem resultado;
  - ~~o working paper sai sem mínimo de assinaturas~~ (é assim nas regras oficiais).
- **Projeto rejeitado.** O banco devolve o comitê ao debate, mas a trilha segue em "Projeto", contando o rejeitado.

## Decisões do usuário (26/11/2026)

1. **O working paper é do bloco.** Quem é de fora do bloco não interfere nas decisões sobre ele: os membros marcam posição nas cláusulas e os redatores aceitam ou recusam as propostas.
2. **Na rodada de revisão, qualquer delegação do comitê propõe alterações.** Durante a rodada, o rascunho fica aberto ao comitê; fora dela, só o bloco o vê. Quem decide continua sendo o redator.
3. ~~Envio só com o mínimo de assinaturas, também para o working paper.~~ Revisto no mesmo dia: as assinaturas seguem as regras oficiais. O working paper não exige signatários ("It does not requires signatories"); o projeto exige 5 (`assinaturas_projeto_min`).
4. **Um projeto de resolução por tópico** (mais tarde, no mesmo dia): os blocos se disputam e os redatores propõem as mudanças num texto só. Quem aceita ou rejeita as propostas é quem preside a sessão, depois do debate. Virou o [passo 63](63-um-projeto-por-topico.md), que substitui o lote 7 e as travas do projeto por bloco.
5. **Um único working paper por grande item da agenda, de toda a sala** (mais tarde, no mesmo dia), e a mesa transforma os working papers em projeto. Com isso, as decisões 1 e 2 (o working paper do bloco e a rodada de revisão) e quase todo o lote 1 deixam de valer; ver o passo 63.

## Lotes

1. **Travas e as regras do bloco** (banco e telas). **Reduzido em 26/11/2026** pelo passo 63 (migração `20270101090000_fluxo_do_comite.sql`, pgTAP `62-fluxo`), e ficou assim:
   - cada delegação fica num bloco por vez no comitê; entrar em outro, ou criar um, tira do atual (decisão do usuário);
   - o bloco nunca fica sem redator: se a única redatora sai, a redação passa a quem está no bloco há mais tempo. Isso substitui a trava "passe a redação antes de sair", que impediria a mudança de bloco;
   - o aviso ao encerrar a sessão com uma votação aberta.

   O plano original, que saiu (a rodada, o rascunho aberto e as travas do envio):
   - enviar à mesa exige a rodada encerrada e nenhuma proposta sem resposta; o projeto exige também 5 assinaturas, e o working paper nenhuma;
   - o redator encerra a rodada antes do fim ("Encerrar a rodada");
   - durante a rodada, o rascunho fica aberto ao comitê, e qualquer delegação propõe alterações;
   - o único redator só sai do bloco depois de passar a redação;
   - a sessão só encerra sem votação aberta;
   - cada botão bloqueado diz o motivo.
2. **Crise compacta.** Uma faixa com o título, o prazo, quem foi atingido, o começo do briefing e "Ler o briefing" (num modal). A crise encerrada vira uma linha. No painel, a faixa fica acima das colunas, e "Com a palavra" fica sempre à vista.
3. **Agora sem buracos.** Uma coluna por ordem de importância: o que acontece agora, o que precisa de você e o resto do evento. Duas colunas só quando as duas têm conteúdo.
4. **Projeto rejeitado volta aos working papers.** A trilha ignora o rejeitado, que fica no histórico ("Rejeitado em votação"); um projeto novo pode partir dele e dos working papers.
5. **Uma trilha só, com nomes**, com a etapa atual, uma frase do que fazer e o botão principal do papel. A mesma na Agora, na Sessão e em Documentos.
6. **Destaque por papel e dicas.** Duas ou três ações principais por papel à vista e o resto em "Mais opções". Cada ação diz o que faz ao passar o mouse e no foco do teclado; a desativada diz por quê, também no celular.
7. ~~Emendas só do bloco.~~ Substituído pelo [passo 63](63-um-projeto-por-topico.md): com um projeto por tópico, os redatores dos blocos propõem as mudanças, todas as delegações marcam posição, e quem preside a sessão aceita ou rejeita depois do debate.

## Testes

- [ ] pgTAP (`62-fluxo`): entrar em outro bloco, ou criar um, tira do atual; a redação passa a quem está no bloco há mais tempo; o banco recusa uma delegação em dois blocos.
- [ ] Ponta a ponta: o botão bloqueado diz o motivo.
- [ ] Ponta a ponta, a 1366 × 768 com uma crise em curso: a Agora do delegado mostra a sessão na primeira tela; o painel mostra "Com a palavra"; nenhuma metade vazia.
- [ ] Unidade: a trilha ignora o projeto rejeitado.
