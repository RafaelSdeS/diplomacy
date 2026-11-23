# Passo 45 · Coletiva de imprensa como fluxo oral

**Parte de:** planos posteriores ([plano da coletiva](../coletiva-de-imprensa.md))
**Depende de:** 17 e 44
**Esforço:** M (parte A: P; parte B: M)
**Quando:** a **parte A** (separar o texto) entra logo depois do passo 44, **antes do piloto** (passo 12). A **parte B** (fluxo oral) entra **depois do piloto**, ajustada ao que a sessão mostrar. Ordem em [ordem-de-prioridade.md](../ordem-de-prioridade.md).
**Objetivo:** a coletiva organiza a ordem e a informação pública de um momento que é falado: a jornalista pergunta em voz alta e a delegação responde em voz alta. A pergunta não chega à delegação antes de ser dita.

## O que construir

**Ponto de partida (o que existe hoje):** `coletiva` (por evento, com `aberta`) e `coletiva_pergunta` com `pergunta` em texto, **legível por todo o evento** (`comunicacao.sql:376-396`), `unique (coletiva, veiculo, delegacao)` e o limite de 4 por veículo dentro de `perguntar_na_coletiva`. **Não há estado, ordem nem horários.** Por isso o passo tem duas partes:

**Parte A, a separação do texto (pequena, pode entrar antes do resto e antes do piloto):**

- **Texto da pergunta em tabela própria** (`coletiva_pergunta_texto`), porque a RLS não esconde coluna: leitura só da press autora, da Diretoria da Press e, para o evento, quando a pergunta está em `respondendo` ou `concluida`. Migração reversível em três passos (copiar, trocar telas e função, remover a coluna). Detalhes em [coletiva-de-imprensa.md](../coletiva-de-imprensa.md#onde-fica-o-texto-da-pergunta).
- Enquanto não existirem os estados, a regra provisória é: o texto só é legível pela press autora e pela Diretoria da Press; a tela da delegação mostra só o aviso.
- A leitura do texto vai na mesma `lerAoVivo` (passo 40) etiquetada com `coletiva_pergunta`, porque `coletiva_pergunta_texto` não tem o gatilho `transmitir`.

**Parte B, o fluxo oral (migração nova, além da separação):**

- **Colunas novas em `coletiva_pergunta`:** `status`, `ordem`, `chamada_em`, `resposta_iniciada_em`, `resposta_concluida_em`, `presente` e `retirada_motivo`; `nota_press` em tabela de leitura restrita. **RPCs novas:** `chamar_na_coletiva`, `iniciar_resposta_coletiva`, `concluir_resposta_coletiva`, `retirar_pergunta_da_coletiva` e `criar_materia_da_coletiva`; `perguntar_na_coletiva` passa a gravar o texto na tabela nova.
- Estados `Na pauta`, `Pronta`, `Chamando`, `Respondendo`, `Concluída`, `Retirada`, sem resposta escrita.
- Limite de quatro perguntas por veículo, no banco. **Decisão a registrar:** pergunta `Retirada` deixa de contar no limite e a delegação pode receber outra do mesmo veículo (hoje o `unique` impediria; trocar por um índice único só sobre as perguntas não retiradas).
- Painel compacto da Diretoria: chamar próxima, iniciar, concluir, retirar e encerrar, com confirmação curta.
- Cartão de chamada no celular da delegação (veículo, título e "aguarde o microfone"), sem a pergunta.
- **Telão da coletiva:** como a coletiva é do evento e o telão atual é por comitê (`/telao/<sigla>`), a coletiva ganha a rota `/telao/coletiva` (do evento), aberta numa conta que seja participante do evento (mesa, press ou secretaria). Mostra delegação e veículo em `Chamando`; a pergunta só em `Respondendo`. O telão de cada comitê continua como está.
- Cronômetro opcional; nota curta da press depois da fala, em tabela de leitura restrita.
- Rascunho de matéria a partir da pauta e das notas digitadas.
- O que já existe e muda: a tela `/press/coletiva` e `tests/17-comunicacao.spec.ts` (parte da coletiva) passam a usar os estados novos.

## Fora desta etapa

Gravação, transcrição, resposta escrita, reconhecimento de voz, matéria automática e chat entre jornalista e delegação.

## Testes

- [ ] pgTAP: `select *` em `coletiva_pergunta` não devolve texto; a delegação só lê o texto a partir de `Respondendo`; leitura cruzada (outra delegação, outro veículo, outro evento) volta vazia; quinta pergunta recusada; pergunta retirada não conta no limite; usuário comum não chama nem conclui; a migração preserva os textos já enviados.
- [ ] Ponta a ponta com dois navegadores: Diretoria abre, press envia, Diretoria chama, o celular da delegação mostra só o aviso, o telão da coletiva mostra a pergunta quando começa `Respondendo`, conclusão e encerramento. **Todos os testes da coletiva ficam num único arquivo serial:** `abrir_coletiva` fecha qualquer outra coletiva aberta do evento (`comunicacao.sql:407`), então dois arquivos em paralelo se atrapalham e o `isolado('NN')` por comitê não resolve.
- [ ] axe no celular da delegação, no painel da Diretoria e no telão (1920 × 1080).
- [ ] Manual: ensaio do momento real com celular, notebook e projetor.
