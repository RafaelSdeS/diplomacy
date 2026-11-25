# Ordem de prioridade dos próximos planos

**Atualizado:** 24 de novembro de 2026

Este documento consolida os planos discutidos e define uma ordem para o trabalho futuro. Cada plano virou um passo do [plano de implementação](implementacao/README.md) (passos 44 a 51; os passos 52 a 58 vieram de pedidos depois de usar o app), com esforço e dependências.

## Critério

Os itens são classificados por:

1. segurança e integridade dos dados;
2. valor para o piloto real;
3. quantidade de novos componentes;
4. dependências técnicas;
5. risco de atraso ou confusão no evento.

Recomendação geral: não começar todos os itens ao mesmo tempo. Trabalhar por etapas pequenas, com testes e uso manual em cada etapa.

## Ordem recomendada

A sequência de execução tem o **piloto depois da interface**. Os passos 44, 45 parte A, 46 e 47 estão feitos. Em 24/11/2026 a sessão de teste foi adiada: a interface ainda está carregada, com ações simples que levam a outra página, pedem rolagem ou passam por menus genéricos, e testar assim mediria esse excesso, não o app. Primeiro vieram o passo 47 ampliado; depois de usá-lo, em 24/11/2026, a interface ainda pareceu pouco intuitiva (formulários sempre abertos sem dizer para que servem, botões que parecem links, caderno longe), e os testes, lentos. Por isso vêm agora o passo 52 (testes rápidos) e os lotes 0, 1 e 2 do passo 51 (ações em botões e modais, presidência e Agora); depois a sessão de teste do passo 12; só então o resto, já com o que o piloto mostrou. Ainda em 24/11/2026, depois dos lotes 1 e 2, o uso na conta da secretaria (que também é mesa) mostrou defeitos e pedidos novos: a conta não via o comitê, modais fora do centro, telão sem saída, lista de oradores solta, a ordem agenda → working papers → resolução pouco clara, agenda, documentos e bilhetes pouco intuitivos, e a falta de documentos da mesa. Viraram os passos 54 a 58 e o lote 3 do 51; os que o roteiro do piloto usa (54 a 56 e a parte A do 57) vêm antes dele. A coletiva segue dividida em duas partes (ver a seção 2): o texto protegido já está feito, o fluxo oral completo vem depois do piloto.

| Ordem | Passo | Plano | Esforço | Por que nesta posição | Escopo mínimo |
|---:|---|---|:-:|---|---|
| 1 | [44](implementacao/44-seguranca-dos-dados.md) | Segurança da sessão e dos dados (**feito**) | M | Impede vazamento e acesso indevido em aparelhos compartilhados, e o piloto já os usa | Cache offline por usuário, limpeza de sessão, testes de RLS e revogação de participação |
| 2 | [45](implementacao/45-coletiva-oral.md) **parte A** | Texto da pergunta da coletiva protegido (**feito**) | P | Hoje o texto da pergunta é legível por todo o evento | Tabela `coletiva_pergunta_texto`, regra de leitura e migração em três passos |
| 3 | [46](implementacao/46-agora-e-sessao-unificadas.md) | Agora operacional e sessão unificada (**feito**) | M | Reduz a maior dificuldade de uso durante o debate, que é o que o piloto mede | Nota rápida e próxima fala sempre visíveis; pendência que leva direto à ação |
| 4 | [47](implementacao/47-modais-saida-e-icones.md) | Modais, menus de escolha, saída segura e ícones (**pronto**) | G | Ataca o que mais atrapalha hoje: ações que trocam de página, menus genéricos e interface carregada; a demonstração depende dele | Modal base; fichas de votação, ponto, moção e nota; modais de ação curta; menus de escolha; saída com confirmação; `Confirmar` nas ações irreversíveis; ícones do cabeçalho |
| 5 | [52](implementacao/52-testes-do-dia-a-dia.md) | Testes rápidos no dia a dia (**pronto**) | P–M | Cada lote do 51 roda os testes várias vezes; hoje cada rodada refaz a build e a suíte inteira | Rodar só os testes da tela mexida, sem build à toa; sem espera fixa; capturas de uma tela só; instável vira defeito |
| 6 | [51](implementacao/51-melhorias-gerais-de-interface.md) **lotes 0, 1 e 2** | Ações em botões e modais; presidência e Agora sem rolagem (**pronto**) | M | É o que ainda torna o app pouco intuitivo, nas telas que o roteiro do piloto mais usa | Formulário aberto vira botão e modal; botão com fundo e ícone; abas no modelo da aba Comitê; Perfil e Sair só ícone; caderno de qualquer lugar; regra de rolagem a 1366 × 768 |
| 7 | [45](implementacao/45-coletiva-oral.md) **parte B** | Coletiva de imprensa como fluxo oral (**pronto**) | M | Feita antes do piloto, que não a usa | Estados, chamada, cartão da delegação, telão da coletiva, cronômetro e conclusão |
| 8 | [54](implementacao/54-correcoes-do-uso-de-24-11.md) | Correções do uso de 24/11 | P–M | Defeitos à vista que o piloto encontraria: quem é secretaria e mesa não vê o comitê, modais no canto, telão sem saída, lista de oradores solta | Menu e Agora com todos os papéis; classe `modal-ficha`; "Sair do telão"; cartão "A palavra"; página "Sobre" com créditos e LGPD |
| 9 | [55](implementacao/55-paises-clicaveis.md) | Todo país abre a sua ficha | P–M | Pequeno, e muda todas as telas; o 56 e o 57 usam as bandeiras clicáveis | `NomeDelegacao` em todo lugar; ficha sempre com as minhas anotações e as compartilhadas comigo; caderno da mesa |
| 10 | [56](implementacao/56-ordem-do-topico.md) | A ordem do tópico, a aba Agenda e a aba Documentos | M | O roteiro do piloto passa por agenda, working paper e projeto, e hoje a ordem não aparece | Trilha agenda → working papers → projeto → resolução; agenda com editor de itens e propostas lado a lado; Documentos pela ordem, sem rolar |
| 11 | [57](implementacao/57-escrita-de-documentos.md) **parte A** | Escrever documentos sem atrito | G | Os 20 minutos de working paper e projeto do piloto dependem dele | Documento formatado editado no lugar; inserir no meio e reordenar; assinaturas no topo; posição num toque; comentários com autor, na cláusula |
| — | [12](implementacao/12-teste-do-piloto.md) | **Sessão de teste do piloto** ([piloto.md](piloto.md)) | — | Valida o app já com a interface limpa, antes de construir mais | Roteiro, questionário e plano B em papel |
| 12 | [58](implementacao/58-documentos-da-mesa.md) | Documentos da mesa para o comitê | M | Pedido novo; o piloto manda o guia por fora, e pode subir se a mesa do piloto pedir | Texto e PDF publicados ao vivo, versão conferida ao salvar, "o que mudou", telão |
| 13 | [53](implementacao/53-dpo-como-arquivo.md) | DPO como arquivo público | M | O DPO é preparado antes do evento e é público; hoje o app o escreve num editor e esconde por regra | PDF por tópico, aberto ao comitê, sem aprovação; prévia; editor e impressão saem |
| 14 | [48](implementacao/48-demonstracao-online.md) | Demonstração online com acesso rápido por papel | M | Depende da segurança, da coletiva e dos modais; mostra o app inteiro por papel | Projeto separado, um comitê completo, `/demo` por papel e reinício |
| 15 | [49](implementacao/49-edicao-por-clausula.md) e [57](implementacao/57-escrita-de-documentos.md) **parte B** | Edição colaborativa por cláusula | G | Resolve o problema central de documentos sem discussões infinitas, **se o piloto confirmar**; a parte A do 57 já o diminui | Proposta estruturada, rodada com prazo, comparação e fusão básica |
| 16 | [50](implementacao/50-preparacao-da-fala.md) | Preparação de discursos e notas | M | Permite acompanhar outras delegações enquanto prepara a próxima fala, **se o piloto confirmar** | Captura rápida por tipo, painel curto da delegação e rascunho da fala |
| 17 | [51](implementacao/51-melhorias-gerais-de-interface.md) **demais lotes** | Melhorias gerais | G | Acabamento das demais telas, aos poucos | Primeiro o lote 3 (bilhetes como conversa, em duas colunas); depois crise, blocos (com a troca de redator) e secretaria; estados vazios, densidade e preferências |

Esforço **P**, **M** ou **G** como nos passos 01 a 43. Os itens 15 e 16 só começam depois da validação com o piloto (abaixo).

## O piloto depois da interface

A sessão do piloto ([piloto.md](piloto.md), passo 12) não está registrada como feita: os critérios de aceite do passo 12 seguem abertos. Ela ficava logo depois do passo 46, mas em 24/11/2026 foi adiada: a interface ainda está carregada, e uma sessão de teste agora mediria o excesso de páginas, rolagem e menus, que já se sabe que precisa mudar.

- **Feito:** 44, 45 parte A, 46 e 47, o que o roteiro exercita (sessão, notas, aparelho compartilhado), o que não pode vazar e a base dos modais.
- **Antes do piloto:** 52 (testes rápidos) e os lotes 0, 1 e 2 do 51 (feitos); depois, 54 (correções do uso de 24/11), 55 (países clicáveis), 56 (ordem do tópico, Agenda e Documentos) e a parte A do 57 (escrita de documentos), as telas que o roteiro mais usa.
- **Depois do piloto:** 58 (documentos da mesa), 53 (DPO como arquivo) e 48 têm requisitos claros (a 45 parte B já foi feita) e entram em seguida, ajustados ao que a sessão mostrar. A coletiva completa e a demonstração não fazem parte do roteiro do piloto.
- **Só com dor confirmada:** **os passos 49 e 50 só começam depois que o questionário do piloto responder às perguntas deles** (a rodada de propostas deu conta? o que faltou ao preparar a fala?). Se o piloto não mostrar dor, os dois ficam para depois do evento. O que o passo 46 já entrega (nota e próxima fala visíveis) pode bastar.
- Os demais lotes do 51 entram aos poucos, o ano todo.

As seções abaixo descrevem cada plano; a sequência de execução é a da tabela acima.

## 1. Segurança da sessão e dos dados

Documento: [Plano de segurança online](seguranca-online.md) · Passo: [44](implementacao/44-seguranca-dos-dados.md)

É a primeira prioridade porque o app já pode lidar com dados privados e pode ser usado em aparelhos compartilhados.

### Deve ser corrigido primeiro

- o cache do service worker não pode misturar contas: um cache por usuário, com validade de 12 horas, e a leitura offline do passo 15 continua;
- logout deve limpar dados autenticados;
- RLS precisa continuar protegendo cada objeto;
- revogação de participação deve revogar acesso no banco e na interface;
- Storage deve usar permissões por participante;
- demonstração deve ficar em projeto separado;
- nenhuma chave de serviço pode entrar no app ou no build.

### Ordem dentro deste plano

1. particionar o cache das APIs autenticadas por usuário e criar a lista de exclusão (pergunta da coletiva, nota de crise, voto individual);
2. adicionar limpeza de sessão em troca de conta e logout;
3. revisar RLS e políticas de Storage;
4. adicionar testes de usuário errado, comitê errado e evento errado;
5. testar dispositivo compartilhado e cache offline;
6. separar produção e demonstração;
7. documentar resposta a incidente.

### Não iniciar neste momento

- sistema complexo de detecção;
- logs analíticos avançados;
- auditoria externa;
- personalização de segurança por usuário.

## 2. Coletiva de imprensa — implementação limitada ao momento real

Documento: [Plano detalhado da coletiva de imprensa](coletiva-de-imprensa.md) · Passo: [45](implementacao/45-coletiva-oral.md)

A coletiva é uma dinâmica oral:

- o jornalista prepara uma pergunta longa;
- a delegação não conhece a pergunta antes de a jornalista fazê-la em voz alta;
- a pergunta é feita em voz alta;
- a delegação responde em voz alta;
- o app organiza a chamada, a ordem e a informação pública;
- a resposta não é digitada no app.

### Duas partes

- **Parte A (antes do piloto, esforço P):** o texto da pergunta sai de `coletiva_pergunta`, hoje legível por todo o evento, e vai para `coletiva_pergunta_texto`, legível só pela press autora e pela Diretoria da Press até existirem os estados.
- **Parte B (depois do piloto):** estados, chamada, cartão da delegação, telão da coletiva (`/telao/coletiva`), cronômetro e conclusão, como na lista abaixo.

### Primeira entrega

- abrir e fechar uma coletiva;
- enviar até quatro perguntas por veículo;
- guardar o texto em tabela própria (a RLS filtra linhas, não colunas), legível pela delegação só a partir de `Respondendo` (parte A, com a regra de estados completa na parte B);
- chamar uma delegação;
- mostrar a delegação e o veículo no telão e a pergunta só em `Respondendo`;
- iniciar e concluir a resposta oral;
- cronômetro opcional;
- encerrar a coletiva;
- registrar chamadas e conclusões;
- permitir nota curta da press depois da fala.

### Fora da primeira entrega

- gravação automática;
- transcrição;
- resposta escrita;
- geração automática de matéria a partir de texto falado;
- reconhecimento de voz;
- parecer automático da resposta;
- chat entre jornalista e delegação.

### Por que está dividida

A parte A fecha um vazamento que existe hoje e é pequena, então vai logo depois da segurança. A parte B corrige uma área explicitamente sem utilidade e não exige um editor complexo, mas é um fluxo inteiro que o roteiro do piloto não exercita: melhor construí-lo depois de ver como a imprensa usa o app. A primeira entrega pode reutilizar tabela, tempo real e a interface existente.

## 3. Agora operacional e sessão unificada

Documentos relacionados:

- [Passo 32 · Agora por papel](implementacao/32-agora-por-papel.md)
- [Passo 43 · fácil de achar e de voltar](implementacao/43-facil-de-achar-e-voltar.md)
- [Passo 46 · Agora e sessão unificadas](implementacao/46-agora-e-sessao-unificadas.md) (o que falta)
- [Melhorias de interface](melhorias-interface.pdf), fonte única das regras de interface

**Já entregue nos passos 32 e 43:** Agora por papel, “Precisa de você” e a sessão do delegado em duas colunas. **Falta (passo 46):** tirar a nota rápida (hoje dentro de um `<details>` na sessão) e o rascunho da próxima fala para uma área sempre visível.

### Primeira entrega

- perguntar ao app “o que preciso fazer agora?”;
- delegado vê sessão ao vivo e uma lista curta de pendências;
- mesa vê chamada, pedidos e documentos pendentes;
- press vê coletiva e entrevistas relevantes;
- crise vê notas pendentes;
- sessão mantém orador, relógios, tópico e votação ativa;
- rascunho curto fica ligado ao tópico e ao orador;
- uma ação principal por momento.

### Limites

- não criar favoritos nesta etapa;
- não criar personalização avançada;
- não criar editor completo de discurso;
- não mostrar todas as ferramentas ao mesmo tempo;
- não criar rastreamento por teclas;
- não expandir o modelo além do rascunho associado ao contexto.

## 4. Modais, painéis e aparência oficial

Documento: [Plano de interface oficial e demonstração](interface-e-demonstracao.md) · Passo: [47](implementacao/47-modais-saida-e-icones.md)

### Ordem

Já entregue no passo 43: ficha da delegação em painel lateral, “Ir para…” (Ctrl+K) e o componente `Confirmar`.

1. modal base, que todos os outros usam (hoje `Confirmar`, `FichaDelegacao` e `IrPara` têm cada um o seu `<dialog>`);
2. confirmar saída (hoje o botão *Sair* sai direto);
3. usar `Confirmar` em todas as ações irreversíveis (hoje só agenda e presidência);
4. fichas de votação, ponto, moção e nota, no painel lateral da ficha da delegação;
5. modal para prévia de DPO, carta, working paper, projeto e notícia;
6. modais de ação curta: entrevista, destinatários de carta, delegações citadas, nova carta e novo bilhete;
7. menus de escolha: `<select>` curto com o visual do app só em CSS; listas longas ou com bandeira no componente `Escolha`, com busca; nada que mude a sessão em `<select>`;
8. ícones no cabeçalho: só a lupa e o sino sem texto; Perfil e Sair mantêm a palavra (no celular, em “Mais”). Usar o Lucide já instalado, ícone a ícone;
9. ampliar “Ir para…” (veículos, matérias, agrupamento por papel);
10. desfazer no lugar de confirmar quando a ação é reversível.

Rolagem, densidade, estados e a revisão das páginas de links secundários ficam no passo 51.

Modais são adequados para consulta curta e ação contextual. Páginas completas continuam para:

- condução da sessão;
- edição prolongada;
- painel da mesa;
- documentos completos;
- telão;
- perfil completo;
- exportação LGPD.

## 5. Demonstração online

Documento: [Plano de interface oficial e demonstração](interface-e-demonstracao.md) · Passo: [48](implementacao/48-demonstracao-online.md)

O ambiente deve existir em projeto separado e usar somente dados fictícios.

### Escopo mínimo

- pelo menos um comitê completo;
- delegados;
- três contas de bureau;
- conta de press;
- Diretoria da Press;
- secretaria;
- documentos;
- uma coletiva em curso;
- uma pergunta não revelada;
- uma delegação chamada;
- telão;
- reinício do cenário protegido.

### Ordem

1. criar projeto separado;
2. criar contas fictícias;
3. criar cenário CSNU-T;
4. criar tela de escolha por papel;
5. validar o fluxo completo;
6. permitir reinício;
7. publicar a demonstração somente depois de controles de segurança.

Não misturar dados da demonstração com os dados reais do evento.

## 6. Edição colaborativa por cláusula

Documento: [Plano de edição colaborativa](plano-editor-documentos.pdf) · Passo: [49](implementacao/49-edicao-por-clausula.md)

**Depende da validação com o piloto.**

Fonte: [Plano HTML](plano-editor-documentos.html)

### Entrega recomendada

- documento estruturado em cláusulas;
- uma proposta por vez;
- comentários ligados à cláusula;
- prazo curto;
- votação ou aprovação pelos responsáveis;
- histórico de alterações;
- fusão básica de working papers;
- nenhuma edição livre simultânea confusa.

### Estrutura do piloto

Trabalhar apenas:

- working paper;
- projeto de resolução;
- proposta;
- comentário;
- acordo;
- rejeição;
- fusão.

Não iniciar:

- edição livre concorrente;
- merging complexo;
- presença avançada por cursor;
- conflitos em texto livre;
- aprovações configuráveis para todos os tipos.

## 7. Preparação de discursos e notas

Documento: [Plano de preparação de discursos](plano-preparacao-discursos.pdf) · Passo: [50](implementacao/50-preparacao-da-fala.md)

**Depende da validação com o piloto.** O passo 46 já cobre a nota rápida e a próxima fala visíveis.

Fonte: [Plano HTML](plano-preparacao-discursos.html)

### Entrega recomendada

- nota rápida durante o debate;
- associação automática com comitê, sessão, tópico e orador;
- rascunho curto da próxima fala;
- histórico recente de delegações;
- documentos relevantes da delegação;
- ensaio apenas local e simples.

O recurso deve ficar dentro da área unificada da sessão, não como outra página ampla.

## 8. Melhorias gerais

Passo: [51](implementacao/51-melhorias-gerais-de-interface.md)

Documentos relacionados:

- [Melhorias gerais em PDF](melhorias-interface.pdf): **fonte única** das regras de interface
- [Melhorias gerais em texto](melhorias.txt): texto de partida, só histórico
- [Melhorias depois da revisão](melhorias-pos-revisao.pdf)

Entra logo depois dos passos 47 e 52, em lotes por tela. O lote 0 (ações em botões e modais, cabeçalho só com ícones, caderno de qualquer lugar) e os lotes 1 (presidência) e 2 (Agora) vêm antes do piloto, com a regra de rolagem: num notebook de 1366 × 768, a tarefa principal de cada papel cabe sem rolar. Os demais lotes entram aos poucos:

- trilha de voltar;
- números clicáveis;
- placeholders;
- estados vazios;
- feedback offline;
- densidade por papel;
- consistência de estados;
- indicadores de reconexão;
- preferências: favoritos, tamanho do texto e densidade no Perfil;
- ajustes menores de aparência.

Não iniciar itens que dependem de um segundo evento, habilidades especiais ou edição livre simultânea.

## Dependências

```text
FEITO
Segurança (44)
  └─ RLS, cache, logout e Storage validados
       ├─ Coletiva parte A: texto da pergunta protegido (45)
       ├─ Agora operacional e sessão unificada (46)
       └─ Modais, menus de escolha, saída e ícones (47)

ANTES DO PILOTO
Testes rápidos no dia a dia (52)                      (feito)
  └─ Ações em botões e modais (51, lote 0)           (feito)
       └─ Presidência e Agora sem rolagem (51, lotes 1 e 2)   (feito)
            └─ Correções do uso de 24/11 (54)
                 └─ Países clicáveis (55)
                      └─ Ordem do tópico, Agenda e Documentos (56)
                           └─ Escrita de documentos, parte A (57)

PILOTO (passo 12) ── mostra o que ajustar e o que vale construir

DEPOIS DO PILOTO
Coletiva parte B: fluxo oral (45)
  └─ depende da parte A e da segurança

Documentos da mesa (58)
  └─ depende do Storage (44), da prévia (47) e do lugar na aba Documentos (56)

DPO como arquivo público (53)
  └─ depende do DPO (10), do Storage (44) e da prévia (47)

Demonstração (48)
  └─ depende de segurança (44), coletiva (45), modais (47) e do DPO como arquivo (53)

Editor por cláusula (49) e preparação de discursos (50)
  └─ só se o questionário do piloto confirmar a dor
  └─ 49 depende de sessão, documentos e RLS; 50, da sessão unificada (46) e do caderno

Demais lotes das melhorias gerais (51)
  └─ entram aos poucos, o ano todo
```

## Sequência recomendada de trabalho

### Lote A — feito (passos 44, 45 parte A, 46 e 47)

1. corrigir cache;
2. limpar sessão;
3. corrigir RLS e Storage;
4. testar perfis e aparelho compartilhado;
5. separar o texto da pergunta da coletiva;
6. Agora por pendências;
7. nota rápida e próxima fala sempre visíveis na sessão.

Do passo 47 (feito): modal base; saída com confirmação e `Confirmar`; fichas de votação, ponto e nota; prévias e modais de ação curta; menus de escolha; ícones do cabeçalho, “Ir para…” ampliado e desfazer.

### Lote B — interface, antes do piloto (passo 52 e lotes 0, 1 e 2 do 51)

1. testes rápidos no dia a dia (52);
2. formulários sempre abertos viram botão e modal no centro;
3. botões com fundo e ícone, abas no modelo da aba Comitê;
4. Perfil e Sair só com ícone; caderno de qualquer lugar;
5. presidência e Agora sem rolagem.

### Lote B2 — pedidos de 24/11, antes do piloto (passos 54, 55, 56 e 57 parte A)

1. papéis somados no menu e na Agora; modais no centro; sair do telão; lista de oradores junto de quem fala; página "Sobre" (54);
2. todo país abre a ficha, com as anotações (55);
3. a trilha do tópico, a aba Agenda sem sintaxe e a aba Documentos pela ordem (56);
4. o documento editado no lugar, assinaturas no topo, posição num toque e comentários na cláusula (57, parte A).

### Piloto (passo 12)

Roteiro de [piloto.md](piloto.md), com a troca de conta no mesmo aparelho. A coletiva completa e a demonstração ainda não existem e ficam de fora.

### Lote C — depois do piloto (passos 58, 53 e 48)

1. documentos da mesa para o comitê;
2. DPO como arquivo público;
3. demonstração: ambiente separado, um comitê completo, contas por papel e roteiro manual.

### Lote D — produtividade (depois do piloto)

1. editor por cláusula (49 e a parte B do 57);
2. preparação da fala;
3. busca e documentação.

Só entra o que o piloto confirmar.

### Lote E — acabamento (demais lotes do passo 51)

1. visual oficial;
2. consistência;
3. captura;
4. acessibilidade;
5. testes manuais.

## Critérios gerais

Nenhum plano deve avançar sem:

- requisitos claros;
- migração reversível;
- RLS testada;
- teste de dois papéis diferentes;
- teste em celular;
- teste em notebook;
- teste com reconexão;
- nenhuma chave secreta no browser;
- teste manual do fluxo real;
- documentação atualizada.

## Calendário

O [plano completo](plano-do-app.pdf) (seção 17) prevê validação de dezembro de 2026 a fevereiro de 2027, piloto de março a junho, evento completo de julho a setembro e ensaio em outubro de 2027. A data exata da edição de 2027 segue em aberto, e sem ela não há prazos para fixar.

Proposta de encaixe, a confirmar quando a data sair:

- **antes da sessão do piloto:** lote A e lote B (feitos) e lote B2 (passos 54, 55, 56 e a parte A do 57);
- **depois da sessão do piloto:** lote C (passos 58, 53 e 48), ajustado ao que a sessão mostrar, e em seguida o lote D (passos 49 e 50), só com o que o questionário confirmar;
- **lote E (demais lotes do passo 51):** em lotes pequenos, o ano todo, e congelado antes do ensaio de outubro.

Para cada passo o esforço (P, M ou G) está na tabela; a duração em semanas depende de quanto tempo por semana a pessoa do projeto tem, e isso o documento não sabe.
