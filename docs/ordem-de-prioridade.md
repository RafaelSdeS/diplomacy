# Ordem de prioridade dos próximos planos

**Atualizado:** 22 de novembro de 2026

Este documento consolida os planos discutidos nas sessões de hoje e define uma ordem para o trabalho futuro.

## Critério

Os itens são classificados por:

1. segurança e integridade dos dados;
2. valor para o piloto real;
3. quantidade de novos componentes;
4. dependências técnicas;
5. risco de atraso ou confusão no evento.

Recomendação geral: não começar todos os itens ao mesmo tempo. Trabalhar por etapas pequenas, com testes e uso manual em cada etapa.

## Ordem recomendada

| Prioridade | Plano | Por que agora | Escopo mínimo |
|---:|---|---|---|
| 1 | Segurança da sessão e dos dados | Impede vazamento e acesso indevido em aparelhos compartilhados | Remover cache autenticado, testar RLS, revogar participação e limpar sessão |
| 2 | Coletiva de imprensa como fluxo oral | Corrige uma área hoje sem utilidade real | Pauta, chamada, delegação sem pergunta antecipada, cronômetro, telão e conclusão |
| 3 | Agora operacional e sessão unificada | Reduz a maior dificuldade de uso durante o debate | Pendências por papel, estado ao vivo, rascunho curto e ações principais |
| 4 | Modais, painel lateral e ícones | Reduz mudanças de página e melhora a aparência oficial | Ficha de delegação, confirmação, busca, perfil, sair e ações rápidas |
| 5 | Demonstração online com acesso rápido por papel | Permite validar toda a experiência sem montar dados manualmente | Um comitê completo, contas fictícias, documentos, bureau e press |
| 6 | Edição colaborativa por cláusula | Resolve o problema central de documentos sem discussões infinitas | Proposta por cláusula, revisão, rodada curta e fusão básica |
| 7 | Preparação de discursos e notas | Permite acompanhar outras delegações enquanto prepara a próxima fala | Nota rápida ligada ao orador e ao tópico, caderno curto e fontes recentes |
| 8 | Melhorias gerais já identificadas | Endereça problemas menores depois das bases acima | Voltar, estados vazios, placeholders, pesquisa, densidade e consistência |

## 1. Segurança da sessão e dos dados

Documento: [Plano de segurança online](seguranca-online.md)

É a primeira prioridade porque o app já pode lidar com dados privados e pode ser usado em aparelhos compartilhados.

### Deve ser corrigido primeiro

- cache do service worker não pode misturar contas;
- logout deve limpar dados autenticados;
- RLS precisa continuar protegendo cada objeto;
- revogação de participação deve revogar acesso no banco e na interface;
- Storage deve usar permissões por participante;
- demonstração deve ficar em projeto separado;
- nenhuma chave de serviço pode entrar no app ou no build.

### Ordem dentro deste plano

1. remover cache das APIs autenticadas;
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

Documento: [Plano detalhado da coletiva de imprensa](coletiva-de-imprensa.md)

A coletiva é uma dinâmica oral:

- o jornalista prepara uma pergunta longa;
- a delegação não conhece a pergunta antes de ser chamada;
- a pergunta é feita em voz alta;
- a delegação responde em voz alta;
- o app organiza a chamada, a ordem e a informação pública;
- a resposta não é digitada no app.

### Primeira entrega

- abrir e fechar uma coletiva;
- enviar até quatro perguntas por veículo;
- ocultar a pergunta da delegação até a chamada;
- chamar uma delegação;
- mostrar a delegação e o veículo no telão;
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

### Por que esta é prioridade dois

Ela corrige uma área explicitamente sem utilidade e não exige um editor complexo. A primeira entrega pode reutilizar tabela, tempo real e a interface existente.

## 3. Agora operacional e sessão unificada

Documentos relacionados:

- [Passo 32 · Agora por papel](implementacao/32-agora-por-papel.md)
- [Passo 43 · sessão unificada](implementacao/43-facil-de-achar-e-voltar.md)
- [Plano de interface](interface-e-demonstracao.md)

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

Documento: [Plano de interface oficial e demonstração](interface-e-demonstracao.md)

### Ordem

1. confirmar saída;
2. padronizar confirmação irreversível;
3. transformar ficha de delegação em painel lateral;
4. usar modal para DPO, carta e busca curta;
5. converter perfil e sair em ícones com rótulo acessível;
6. criar “Ir para…” como central contextual;
7. padronizar densidade, hierarquia e estados;
8. revisar todas as páginas de links secundários.

Modais são adequados para consulta curta e ação contextual. Páginas completas continuam para:

- condução da sessão;
- edição prolongada;
- painel da mesa;
- documentos completos;
- telão;
- perfil completo;
- exportação LGPD.

## 5. Demonstração online

Documento: [Plano de interface oficial e demonstração](interface-e-demonstracao.md)

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

Documento: [Plano de edição colaborativa](plano-editor-documentos.pdf)

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

Documento: [Plano de preparação de discursos](plano-preparacao-discursos.pdf)

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

Documentos relacionados:

- [Melhorias gerais em texto](melhorias.txt)
- [Melhorias gerais em PDF](melhorias-interface.pdf)
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
Segurança
  └─ RLS, cache, logout e Storage validados

Coletiva oral
  └─ pode começar em paralelo depois da segurança básica

Agora operacional
  └─ depende da segurança e dos dados de sessão existentes

Modais e ícones
  └─ podem entrar em paralelo com a sessão e a coletiva

Demonstração
  └─ depende dos fluxos mínimos de sessão, documentos e coletiva

Editor por cláusula
  └─ depende de sessão, documentos e RLS atuais

Preparação de discursos
  └─ depende da sessão unificada e do caderno curto

Melhorias gerais
  └─ entram continuamente depois dos componentes principais
```

## Sequência recomendada de trabalho

### Lote A — segurança básica

1. corrigir cache;
2. limpar sessão;
3. corrigir RLS e Storage;
4. testar perfis e aparelho compartilhado.

### Lote B — dois fluxos piloto

1. coletiva oral completa;
2. Agora por pendências;
3. painel curto da sessão;
4. modais principais.

### Lote C — demonstração

1. ambiente separado;
2. um comitê completo;
3. contas por papel;
4. roteiro manual.

### Lote D — produtividade

1. editor por cláusula;
2. preparação da fala;
3. busca e documentação.

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
