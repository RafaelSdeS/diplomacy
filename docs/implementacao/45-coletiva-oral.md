# Passo 45 · Coletiva de imprensa como fluxo oral

**Parte de:** planos posteriores ([plano da coletiva](../coletiva-de-imprensa.md))
**Depende de:** 17 e 44
**Esforço:** M
**Objetivo:** a coletiva organiza a ordem e a informação pública de um momento que é falado: a jornalista pergunta em voz alta e a delegação responde em voz alta. A pergunta não chega à delegação antes de ser dita.

## O que construir

- **Texto da pergunta em tabela própria** (`coletiva_pergunta_texto`), porque a RLS não esconde coluna: leitura só da press autora, da Diretoria da Press e, para o evento, quando a pergunta está em `respondendo` ou `concluida`. Migração reversível em três passos (copiar, trocar telas e função, remover a coluna). Detalhes em [coletiva-de-imprensa.md](../coletiva-de-imprensa.md#onde-fica-o-texto-da-pergunta).
- Estados `Na pauta`, `Pronta`, `Chamando`, `Respondendo`, `Concluída`, `Retirada`, sem resposta escrita.
- Limite de quatro perguntas por veículo, no banco.
- Painel compacto da Diretoria: chamar próxima, iniciar, concluir, retirar e encerrar, com confirmação curta.
- Cartão de chamada no celular da delegação (veículo, título e "aguarde o microfone"), sem a pergunta.
- Telão: delegação e veículo em `Chamando`; a pergunta só em `Respondendo`.
- Cronômetro opcional; nota curta da press depois da fala, em tabela de leitura restrita.
- Rascunho de matéria a partir da pauta e das notas digitadas.

## Fora desta etapa

Gravação, transcrição, resposta escrita, reconhecimento de voz, matéria automática e chat entre jornalista e delegação.

## Testes

- [ ] pgTAP: `select *` em `coletiva_pergunta` não devolve texto; a delegação só lê o texto a partir de `Respondendo`; leitura cruzada (outra delegação, outro veículo, outro evento) volta vazia; quinta pergunta recusada; usuário comum não chama nem conclui.
- [ ] Ponta a ponta com dois navegadores: Diretoria abre, press envia, Diretoria chama, o celular da delegação mostra só o aviso, o telão mostra a pergunta quando começa `Respondendo`, conclusão e encerramento.
- [ ] axe no celular da delegação, no painel da Diretoria e no telão (1920 × 1080).
- [ ] Manual: ensaio do momento real com celular, notebook e projetor.
