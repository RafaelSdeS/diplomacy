# Passo 62 · O fluxo do comitê: o que importa à vista, travas e a ordem clara

**Parte de:** uso de 26/11/2026, com o CSNU-T online populado por inteiro ("ainda está confuso e não muito intuitivo; as coisas que as pessoas mais usam não estão em destaque; fica difícil achar a ordem do que está acontecendo; com a crise, metade da tela fica vazia na Agora")
**Depende de:** 51, 56, 57, 59, 61
**Esforço:** G, em lotes
**Quando:** antes do piloto (passo 12). Ordem: lotes 1, 2 e 3 (feitos), depois o [passo 63](63-um-projeto-por-topico.md), depois os lotes 5 e 6, que usam o fluxo novo.
**Objetivo:** ajudar quem está no comitê a fazer a próxima coisa certa, sem procurar.

## O que a investigação achou (26/11/2026, dados reais, 1366 × 768)

- **A crise engole as telas.** O alerta mostra o briefing inteiro (até 3.000 caracteres), e cada cartão tem cerca de 1.500 px. Na Agora do delegado, a sessão ao vivo começa a 1.755 px do topo. No painel de quem preside, o briefing toma a coluna do meio e empurra "Com a palavra" para fora da tela.
- **Metade da tela vazia.** A Agora tem duas colunas fixas; com um cartão só (a crise, ou a equipe de crise), a outra metade fica vazia.
- **A ordem é difícil de ler.** A trilha da sessão usa ícones sem nome ("✓ ✓ Projeto ⚒") e repete a frase do "Agora".
- **O que mais se usa não se destaca.** Na sessão, "Fazer um ponto ou moção" divide a linha com cinco botões do mesmo peso. No projeto, "Retirar a assinatura" tem o tamanho de "Enviar à mesa".
- **Quase nenhuma dica.** Só 6 dos cerca de 740 botões e links com cara de botão explicam o que fazem ao passar o mouse; os desativados não dizem por quê.
- **Travas que faltavam:**
  - ~~enviar à mesa com a rodada aberta e propostas sem resposta~~ (o envio e a rodada saem com o passo 63);
  - o único redator sair do bloco, que fica sem quem edite ou envie (resolvido no lote 1: a redação passa a outro membro);
  - encerrar a sessão com uma votação aberta, que fecha sem resultado (é de propósito, o projeto volta a esperar a mesa; o lote 1 pôs o aviso);
  - ~~o working paper sai sem mínimo de assinaturas~~ (é assim nas regras oficiais).
- **Projeto rejeitado.** O banco devolve o comitê ao debate, mas a trilha segue em "Projeto", contando o rejeitado.

## Decisões do usuário (26/11/2026)

1. ~~O working paper é do bloco; quem é de fora não interfere.~~ Substituída pela decisão 5.
2. ~~Na rodada de revisão, qualquer delegação do comitê propõe alterações.~~ Substituída pela decisão 5: não há mais rodada.
3. As assinaturas seguem as regras oficiais. O working paper não exige signatários ("It does not requires signatories"), mas quem concorda pode assinar; o projeto exige 5 (`assinaturas_projeto_min`).
4. **Um projeto de resolução por tópico:** os redatores dos blocos propõem as mudanças, e quem aceita ou rejeita é quem preside a sessão, depois do debate. Virou o [passo 63](63-um-projeto-por-topico.md), que substitui o lote 7 e as travas do projeto por bloco.
5. **Um único working paper por grande item da agenda, de toda a sala,** e a mesa transforma os working papers em projeto (passo 63).
6. **Um bloco por vez por delegação,** com mais de um redator possível, como hoje.

## Lotes

1. **As regras do bloco. Feito em 26/11/2026** (`705a1f7`: migração `20270101090000_fluxo_do_comite.sql`, pgTAP `62-fluxo`):
   - cada delegação fica num bloco por vez no comitê; entrar em outro, ou criar um, tira do atual (índice único; quem estava em dois ficou no mais recente);
   - o bloco nunca fica sem redator: se a única redatora sai, a redação passa a quem está no bloco há mais tempo. Isso substituiu a trava "passe a redação antes de sair", que impediria a mudança de bloco;
   - o aviso ao encerrar a sessão com uma votação aberta.

   Saíram antes do commit, por causa do passo 63: a rodada e "Encerrar a rodada", o rascunho aberto ao comitê na rodada e as travas do envio à mesa.
2. **Crise compacta. Feito em 26/11/2026** (`AlertaCrise`). Uma faixa com o título, o prazo e "Ler o briefing" numa linha, e embaixo quem foi atingido e o começo do briefing (duas linhas cada); o briefing inteiro abre num modal. A crise encerrada vira uma linha. No painel, a faixa fica acima das colunas e tem só a linha de cima (`compacta`), para "Com a palavra" caber na tela.
3. **Agora sem buracos. Feito em 26/11/2026** (`.cartoes--agora`). Os cartões seguem a ordem de importância (a crise, a sessão, o que precisa de você, o papel e o resto do evento); um cartão sozinho na linha ocupa a largura toda, e dois dividem a linha. Só na Agora: nas outras telas, `.cartoes` continua como era.
4. ~~Projeto rejeitado volta aos working papers.~~ Foi para o passo 63 (item 7 do caminho).
5. **Uma trilha só, com nomes** (depois do passo 63): Agenda → Working papers → Projeto → Fase de ação → Resolução, com a etapa atual, uma frase do que fazer e o botão principal do papel. A mesma na Agora, na Sessão e em Documentos. A trilha ignora o projeto rejeitado, que fica no histórico.
6. **Destaque por papel e dicas** (depois do passo 63, para valer nas telas novas). Duas ou três ações principais por papel à vista e o resto em "Mais opções". Cada ação diz o que faz ao passar o mouse e no foco do teclado; a desativada diz por quê, também no celular.
7. ~~Emendas só do bloco.~~ Substituído pelo [passo 63](63-um-projeto-por-topico.md).

## Testes

- [x] pgTAP (`62-fluxo`): entrar em outro bloco, ou criar um, tira do atual; a redação passa a quem está no bloco há mais tempo; o banco recusa uma delegação em dois blocos.
- [x] Ponta a ponta (`35-crise-com-prazo`), a 1366 × 768 com uma crise de briefing longo: a Agora do delegado mostra a sessão na primeira tela e nenhuma metade vazia; o briefing abre inteiro no modal; o painel mostra "Com a palavra".
- [ ] Unidade: a trilha tem as cinco etapas com nome e ignora o projeto rejeitado.
- [ ] Ponta a ponta: cada ação principal diz o que faz ao passar o mouse, e o botão desativado diz o motivo.
