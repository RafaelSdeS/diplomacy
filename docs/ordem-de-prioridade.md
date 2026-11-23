# Ordem de prioridade dos próximos planos

**Atualizado:** 23 de novembro de 2026

Este documento consolida os planos discutidos e define uma ordem para o trabalho futuro. Cada plano virou um passo do [plano de implementação](implementacao/README.md) (passos 44 a 51), com esforço e dependências.

## Critério

Os itens são classificados por:

1. segurança e integridade dos dados;
2. valor para o piloto real;
3. quantidade de novos componentes;
4. dependências técnicas;
5. risco de atraso ou confusão no evento.

Recomendação geral: não começar todos os itens ao mesmo tempo. Trabalhar por etapas pequenas, com testes e uso manual em cada etapa.

## Ordem recomendada

A sequência de execução tem o **piloto no meio**: primeiro o que protege os dados e dá ao delegado o que ele usa o tempo todo (passos 44, 45 parte A e 46); depois a sessão de teste do passo 12; só então o resto, já com o que o piloto mostrou. A coletiva se divide em duas partes (ver a seção 2): o texto protegido vai antes do piloto, o fluxo oral completo depois.

| Ordem | Passo | Plano | Esforço | Por que nesta posição | Escopo mínimo |
|---:|---|---|:-:|---|---|
| 1 | [44](implementacao/44-seguranca-dos-dados.md) | Segurança da sessão e dos dados | M | Impede vazamento e acesso indevido em aparelhos compartilhados, e o piloto já os usa | Cache offline por usuário, limpeza de sessão, testes de RLS e revogação de participação |
| 2 | [45](implementacao/45-coletiva-oral.md) **parte A** | Texto da pergunta da coletiva protegido | P | Hoje o texto da pergunta é legível por todo o evento | Tabela `coletiva_pergunta_texto`, regra de leitura e migração em três passos |
| 3 | [46](implementacao/46-agora-e-sessao-unificadas.md) | Agora operacional e sessão unificada | M | Reduz a maior dificuldade de uso durante o debate, que é o que o piloto mede | Nota rápida e próxima fala sempre visíveis; pendência que leva direto à ação |
| — | [12](implementacao/12-teste-do-piloto.md) | **Sessão de teste do piloto** ([piloto.md](piloto.md)) | — | Valida o que existe antes de construir mais | Roteiro, questionário e plano B em papel |
| 4 | [45](implementacao/45-coletiva-oral.md) **parte B** | Coletiva de imprensa como fluxo oral | M | Corrige uma área hoje sem utilidade real, já com o que o piloto disse sobre a imprensa | Estados, chamada, cartão da delegação, telão da coletiva, cronômetro e conclusão |
| 5 | [47](implementacao/47-modais-saida-e-icones.md) | Modais, saída segura e ícones | M | Reduz mudanças de página e melhora a aparência oficial; a demonstração depende dele | Saída com confirmação, `Confirmar` nas ações irreversíveis, ícones do cabeçalho |
| 6 | [48](implementacao/48-demonstracao-online.md) | Demonstração online com acesso rápido por papel | M | Depende da segurança, da coletiva e dos modais; mostra o app inteiro por papel | Projeto separado, um comitê completo, `/demo` por papel e reinício |
| 7 | [49](implementacao/49-edicao-por-clausula.md) | Edição colaborativa por cláusula | G | Resolve o problema central de documentos sem discussões infinitas, **se o piloto confirmar** | Proposta estruturada, rodada com prazo, comparação e fusão básica |
| 8 | [50](implementacao/50-preparacao-da-fala.md) | Preparação de discursos e notas | M | Permite acompanhar outras delegações enquanto prepara a próxima fala, **se o piloto confirmar** | Captura rápida por tipo, painel curto da delegação e rascunho da fala |
| 9 | [51](implementacao/51-melhorias-gerais-de-interface.md) | Melhorias gerais | G | Endereça problemas menores depois das bases acima | Voltar, estados vazios, placeholders, densidade e consistência |

Esforço **P**, **M** ou **G** como nos passos 01 a 43. Os itens 7 e 8 só começam depois da validação com o piloto (abaixo).

## O piloto vem no meio

A sessão do piloto ([piloto.md](piloto.md), passo 12) não está registrada como feita: os critérios de aceite do passo 12 seguem abertos. Cinco passos M ou G (45 parte B, 47, 48, 49 e 50) seriam construídos sem nenhum dado de uso. Por isso a sessão de teste fica entre o passo 46 e a coletiva completa.

- **Antes do piloto:** 44, 45 parte A e 46. São o que o roteiro exercita (sessão, notas, aparelho compartilhado) e o que não pode vazar.
- **Depois do piloto:** 45 parte B, 47 e 48 têm requisitos claros e entram em seguida, ajustados ao que a sessão mostrar. A coletiva completa e a demonstração não fazem parte do roteiro do piloto.
- **Só com dor confirmada:** **os passos 49 e 50 só começam depois que o questionário do piloto responder às perguntas deles** (a rodada de propostas deu conta? o que faltou ao preparar a fala?). Se o piloto não mostrar dor, os dois ficam para depois do evento. O que o passo 46 já entrega (nota e próxima fala visíveis) pode bastar.
- O passo 51 entra aos poucos, o ano todo.

Se o piloto mostrar toques errados em ações sem confirmação (encerrar votação, retirar ponto), o item 2 do passo 47 (`Confirmar` nas ações irreversíveis) pode ser puxado para antes das demais partes do 47.

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

1. confirmar saída (hoje o botão *Sair* sai direto);
2. usar `Confirmar` em todas as ações irreversíveis (hoje só agenda e presidência);
3. usar modal para DPO, carta e busca curta;
4. ícones no cabeçalho: só a lupa e o sino sem texto; Perfil e Sair mantêm a palavra (no celular, em “Mais”). Usar o Lucide já instalado, ícone a ícone;
5. ampliar “Ir para…” (veículos, matérias, agrupamento por papel);
6. padronizar densidade, hierarquia e estados;
7. revisar todas as páginas de links secundários.

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

Entrar nesta etapa depois das bases anteriores:

- trilha de voltar;
- objetos clicáveis;
- números clicáveis;
- placeholders;
- estados vazios;
- feedback offline;
- densidade por papel;
- consistência de estados;
- indicadores de reconexão;
- ajustes menores de aparência.

Não iniciar itens que dependem de um segundo evento, habilidades especiais ou edição livre simultânea.

## Dependências

```text
ANTES DO PILOTO
Segurança (44)
  └─ RLS, cache, logout e Storage validados
       ├─ Coletiva parte A: texto da pergunta protegido (45)
       └─ Agora operacional e sessão unificada (46)

PILOTO (passo 12) ── mostra o que ajustar e o que vale construir

DEPOIS DO PILOTO
Coletiva parte B: fluxo oral (45)
  └─ depende da parte A e da segurança

Modais, saída e ícones (47)
  └─ depende de 43 e 44

Demonstração (48)
  └─ depende de segurança (44), coletiva (45) e modais (47)

Editor por cláusula (49) e preparação de discursos (50)
  └─ só se o questionário do piloto confirmar a dor
  └─ 49 depende de sessão, documentos e RLS; 50, da sessão unificada (46) e do caderno

Melhorias gerais (51)
  └─ entram continuamente depois dos componentes principais
```

## Sequência recomendada de trabalho

### Lote A — antes do piloto (passos 44, 45 parte A e 46)

1. corrigir cache;
2. limpar sessão;
3. corrigir RLS e Storage;
4. testar perfis e aparelho compartilhado;
5. separar o texto da pergunta da coletiva;
6. Agora por pendências;
7. nota rápida e próxima fala sempre visíveis na sessão.

### Piloto (passo 12)

Roteiro de [piloto.md](piloto.md), com a troca de conta no mesmo aparelho. A coletiva completa e a demonstração ainda não existem e ficam de fora.

### Lote B — depois do piloto (passos 45 parte B e 47)

1. coletiva oral completa;
2. modais principais, saída com confirmação e ícones.

### Lote C — demonstração (passo 48)

1. ambiente separado;
2. um comitê completo;
3. contas por papel;
4. roteiro manual.

### Lote D — produtividade (depois do piloto)

1. editor por cláusula;
2. preparação da fala;
3. busca e documentação.

Só entra o que o piloto confirmar.

### Lote E — acabamento

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

- **antes da sessão do piloto:** lote A (passos 44, 45 parte A e 46);
- **depois da sessão do piloto:** lotes B e C (passos 45 parte B, 47 e 48), ajustados ao que a sessão mostrar, e em seguida o lote D (passos 49 e 50), só com o que o questionário confirmar;
- **lote E (passo 51):** em lotes pequenos, o ano todo, e congelado antes do ensaio de outubro.

Para cada passo o esforço (P, M ou G) está na tabela; a duração em semanas depende de quanto tempo por semana a pessoa do projeto tem, e isso o documento não sabe.
