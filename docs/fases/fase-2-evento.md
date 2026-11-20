# Fase 2 · Evento completo

**Quando:** julho de 2027 até a edição de 2027 (cerca de um ano depois da edição de 2026)
**Objetivo:** levar o app à escala real do UFRGSMUN: 6 comitês, cerca de 150 delegações e a press.
**Teste para passar de fase:** a edição seguinte também quer usar o app.

## Escala e infraestrutura (jul a set/2027)

- [ ] Supabase Pro só no mês do evento: o plano gratuito aceita 200 conexões simultâneas, e o evento passa disso.
- [ ] Trocar Postgres Changes por Broadcast a partir do banco, em canais privados por comitê.
- [ ] Login pelo QR do crachá (Edge Function), link e código por e-mail (SMTP gratuito) e código emitido pela secretaria.
- [ ] Offline completo: cache do app no aparelho (PWA), caixa de saída e retomada ao reconectar.
- [ ] Notificação push como bônus (no iPhone, só com o app na tela inicial).
- [ ] Português e inglês, com Paraglide.

## Funcionalidades (jul a set/2027)

- [ ] Votação completa: regra do CSNU, unanimidade do Conselho Europeu, votação nominal e divisão da questão.
- [ ] Emendas formais com 3 assinaturas; projeto de resolução com 1/5 de signatários.
- [ ] Delegações observadoras e suspensas.
- [ ] Modo com tecnologia restrita (como a OEA de 2026): só a mesa opera o app.
- [ ] Bilhetes entre delegações, com botão de denúncia.
- [ ] Press: entrevistas, coletiva, edição do dia em PDF e imagem pronta para as redes.
- [ ] Placa digital e painel de votação no telão.
- [ ] Secretaria: importação das inscrições do Google Forms, crachás, check-in e certificados com QR de verificação.
- [ ] Moção de não-confiança.

## LGPD

- [ ] Aviso de privacidade na inscrição.
- [ ] Ver, corrigir e pedir a exclusão dos próprios dados pelo app.
- [ ] Exclusão automática dos dados pessoais no prazo combinado.
- [ ] Registro de quem ocultou, respondeu ou alterou o quê.

## Ensaio (out/2027)

- [ ] Importar as inscrições reais e gerar os crachás.
- [ ] Teste de carga com cerca de 300 clientes simulados.
- [ ] Testar Wi-Fi e projetor nas salas de verdade.
- [ ] Ensaiar com mesas, crise e press; entregar um guia de uma página.
- [ ] Combinar o plano B em papel e quando usá-lo.

## Durante e depois da edição

- [ ] Usar o app no evento, com o plano B à mão.
- [ ] Entregar à organização o arquivo da edição: agenda, resoluções, edições da press, premiados e regras usadas.
- [ ] Rodar a pesquisa de satisfação.
- [ ] Apagar os dados pessoais no prazo combinado.
- [ ] Voltar o Supabase para o plano gratuito.

## Referências no plano

Seções 12 (regras), 16 (arquitetura, LGPD e acessibilidade), 17 (calendário) e 18 (riscos).
