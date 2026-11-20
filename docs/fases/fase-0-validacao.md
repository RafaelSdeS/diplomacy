# Fase 0 · Validação

**Quando:** dezembro de 2026 a fevereiro de 2027
**Objetivo:** confirmar o plano com a organização do UFRGSMUN e deixar a base técnica pronta para o piloto.
**Teste para passar de fase:** a secretaria do UFRGSMUN aceita o piloto.

## 1. Conversa com a organização

- [ ] Apresentar o plano (`docs/plano-do-app.pdf`) ao secretariado e a alguém da equipe de crise.
- [ ] Confirmar a data da edição de 2027, que vira o prazo da fase 2.
- [ ] Combinar os pontos de LGPD e de operação:
  - [ ] O app é oficial do evento?
  - [ ] A organização é a controladora dos dados? Qual o papel do app?
  - [ ] Qual o prazo para apagar os dados pessoais depois do evento?
  - [ ] A mesa pode ler os bilhetes entre delegações?
  - [ ] Quem paga o plano Pro do Supabase no mês do evento (cerca de US$ 25)?
- [ ] Tirar a dúvida da arte da press: o New York Times aparece ligado à AGNU, mas o comitê listado é o CSNU.
- [ ] Combinar onde e com quem será o teste do piloto (fase 1).

## 2. Regras e modelos

- [ ] Transformar o Guia de Regras em configuração:
  - [ ] padrão do evento: quórum, maiorias, formas de debate, moções, pontos e votação;
  - [ ] ajustes do CSNU (9 votos sem veto), do Conselho Europeu (unanimidade), da OEA (tecnologia restrita, observadores, suspensão) e da Imprensa.
- [ ] Montar o modelo único de documentos a partir dos documentos do UNOCT 2026, em português e inglês:
  - [ ] DPO;
  - [ ] proposta de agenda;
  - [ ] working paper e projeto de resolução;
  - [ ] resolução de crise;
  - [ ] carta diplomática.
- [ ] Traduzir para o português a lista de verbos do guia de vocabulário.
- [ ] Avaliar o código do MUNify: licença e o que dá para aproveitar.

## 3. Base técnica

- [ ] Criar o projeto SvelteKit em modo SPA (`adapter-static`), com layout responsivo desde o início.
- [ ] Criar o projeto gratuito no Supabase, na região São Paulo.
- [ ] Criar o projeto gratuito no Cloudflare Pages e publicar uma página vazia.
- [ ] Escrever as migrações do banco do piloto, versionadas no repositório (Supabase CLI).
- [ ] Escrever as regras de acesso por linha (RLS) de cada função.
- [ ] Escrever o primeiro teste automático: uma delegação não consegue ler a nota de crise de outra.
- [ ] Criar o script de dados fictícios (um evento, um comitê de teste, delegações e equipe).

## Fica de fora

- Qualquer dado pessoal real.
- Funcionalidades do app: começam na fase 1.

## Referências no plano

Seções 1 (o tamanho do piloto e os documentos de hoje), 12 (regras), 16 (arquitetura) e 20 (próximos passos).
