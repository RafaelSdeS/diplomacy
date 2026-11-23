# Resposta a incidente

Roteiro para um vazamento ou acesso indevido a dados do app (passo 44, a partir do [plano de segurança](seguranca-online.md#plano-de-incidente)). Vale para a produção e para o projeto de demonstração. Não existe garantia absoluta contra vazamentos: o objetivo é limitar o impacto e agir rápido.

## Responsáveis

| Papel | Quem | O que faz |
|---|---|---|
| Responsável técnico | quem mantém o app (hoje, o dono do repositório e dos projetos Supabase e Cloudflare) | executa os passos técnicos abaixo e escreve o relatório |
| Responsável pela comunicação | a pessoa da secretaria do UFRGSMUN indicada pela organização, antes do evento | fala com a organização e com os titulares |

A organização do evento é a controladora dos dados (LGPD). O nome e o contato das duas pessoas ficam com a organização, fora deste repositório público.

## Os 14 passos

1. **Responsável técnico assume.** Anota a hora em que soube, quem avisou e o que foi visto.
2. **Responsável pela comunicação é avisado** na mesma hora, mesmo sem detalhes.
3. **Revogar as sessões.** Para uma conta: remover o acesso em *Secretaria → Participantes* (encerra as sessões e as notificações). Para todas: no SQL do painel, `delete from auth.sessions;` (todo mundo precisa entrar de novo; o login em uso vence em até 1 hora, e a RLS continua valendo).
4. **Remover as contas afetadas** (as que vazaram ou foram usadas indevidamente): *Authentication → Users → Delete user*.
5. **Desativar a API temporariamente**, se o vazamento continua: *Project Settings → General → Pause project*, ou desligar o acesso público em *Data API*. O app fica fora do ar; avisar a mesa para usar o plano B em papel ([piloto.md](piloto.md#plano-b-em-papel)).
6. **Pausar os uploads:** no SQL do painel, `update storage.buckets set file_size_limit = 1 where id in ('fotos', 'press');` (nenhum arquivo cabe em 1 byte; voltar depois a 204800 nas fotos e 1048576 na press).
7. **Isolar o projeto:** não fazer deploy nem migração durante a investigação; se o vazamento veio de uma chave (`service_role`, senha do banco), girar essa chave.
8. **Preservar os registros necessários:** exportar `registro` (auditoria do app) e os logs da API e do Auth do painel do Supabase do período, antes que expirem. Nada disso vai para o repositório.
9. **Identificar os dados afetados:** quais tabelas, quais eventos, comitês e pessoas, desde quando. As regras de acesso por linha (RLS) e os testes `supabase/tests/` ajudam a ver o que cada papel conseguia ler.
10. **Avaliar o impacto segundo a LGPD:** tipo de dado (nome, e-mail, foto, nota de crise), quantidade de titulares, risco. A organização decide se comunica a ANPD (prazo de 3 dias úteis, Resolução CD/ANPD nº 15/2024).
11. **Comunicar** a organização e, quando a organização decidir, os titulares: o que aconteceu, quais dados, o que foi feito e o que a pessoa pode fazer.
12. **Corrigir e testar:** a correção vem com um teste que falha sem ela (pgTAP para regra de acesso, Playwright para o app) e passa no CI.
13. **Restauração controlada:** reativar a API, os uploads e as contas aos poucos, conferindo os registros.
14. **Relatório pós-incidente** em até uma semana: linha do tempo, causa, dados afetados, o que mudou para não repetir. Guardado com a organização; uma versão sem dados pessoais pode virar documento em `docs/`.
