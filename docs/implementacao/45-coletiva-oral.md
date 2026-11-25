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

## Estado (23/11/2026)

**Parte A feita:** migração `20261220090000_coletiva_texto.sql` (cria `coletiva_pergunta_texto`, copia os textos, troca `perguntar_na_coletiva` e remove a coluna `pergunta`); a tela `/press/coletiva` lê o texto à parte, sem cache e sem nova tentativa sem rede; quem não pode ler vê "a pergunta só é conhecida quando for feita em voz alta". Testes: `supabase/tests/45-coletiva-texto.test.sql` e a delegação chamada em `tests/17-comunicacao.spec.ts`. A tela atual é a mesma do passo 17 (sem os cartões e o painel novos): ela recarrega a pauta inteira a cada mudança, então a leitura do texto não precisou de `lerAoVivo`.

**Parte B feita (24/11/2026, antes do piloto, a pedido):** migração `20261221090000_coletiva_oral.sql`, aplicada na nuvem.

- **Pauta:** a pergunta ganhou estado (`na_pauta`, `chamando`, `respondendo`, `concluida`, `retirada`), ordem, horários, `presente` e o motivo da retirada. Pergunta retirada não conta no limite de quatro e libera outra para a mesma delegação (índice único parcial).
- **Texto:** abre ao evento a partir de `respondendo`.
- **Nota da press:** depois da fala, em `coletiva_nota` (só a press do veículo e a Diretoria leem).
- **Funções:** `chamar_na_coletiva`, `iniciar_resposta_coletiva`, `concluir_resposta_coletiva`, `adiar_pergunta_coletiva` (para o fim da pauta), `retirar_pergunta_da_coletiva`, `confirmar_chamada_coletiva` (a delegação avisa que está pronta) e `salvar_nota_coletiva`.
- **Diretoria:** o cartão "Conduzir a coletiva" com a pergunta em andamento (texto, prontos, tempo), iniciar, concluir (com confirmação), para o fim da pauta, retirar, chamar a próxima e o link do telão.
- **Delegação:** o cartão "Sua delegação foi chamada" (veículo, aguarde o microfone, "Estamos prontos"), sem a pergunta até começar a responder; a Agora avisa no "Precisa de você".
- **Press:** "Anotar a fala" depois da resposta, e "Escrever a matéria da coletiva", que leva as perguntas e as notas para o rascunho da matéria.
- **Telão:** `/telao/coletiva`, com quem foi chamado, o veículo, a pergunta só em "Respondendo", o tempo e as próximas.

**Ficaram de fora (simplificação):**

- o estado "Pronta" e a reordenação livre: "Para o fim da pauta" cobre a delegação ausente;
- o RPC `criar_materia_da_coletiva`: o rascunho é montado na tela.

**Testes:** `supabase/tests/45-coletiva-oral.test.sql` e `tests/45-coletiva-oral.spec.ts` (serial, com o teste que antes ficava no 17).

## Fora desta etapa

Gravação, transcrição, resposta escrita, reconhecimento de voz, matéria automática e chat entre jornalista e delegação.

## Testes

- [x] pgTAP: `select *` em `coletiva_pergunta` não devolve texto; a delegação só lê o texto a partir de `Respondendo`; leitura cruzada (outra delegação, outro veículo, outro evento) volta vazia; quinta pergunta recusada; pergunta retirada não conta no limite; usuário comum não chama nem conclui; a migração preserva os textos já enviados.
- [x] Ponta a ponta com dois navegadores: Diretoria abre, press envia, Diretoria chama, o celular da delegação mostra só o aviso, o telão da coletiva mostra a pergunta quando começa `Respondendo`, conclusão e encerramento. **Todos os testes da coletiva ficam num único arquivo serial:** `abrir_coletiva` fecha qualquer outra coletiva aberta do evento (`comunicacao.sql:407`), então dois arquivos em paralelo se atrapalham e o `isolado('NN')` por comitê não resolve.
- [ ] axe no celular da delegação, no painel da Diretoria e no telão (1920 × 1080).
- [ ] Manual: ensaio do momento real com celular, notebook e projetor.
