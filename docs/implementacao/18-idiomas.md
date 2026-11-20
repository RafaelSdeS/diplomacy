# Passo 18 · Idiomas

**Parte de:** evento
**Depende de:** 12
**Objetivo:** o app inteiro em português e em inglês, porque há comitês nas duas línguas (o UNOCT de 2026 foi em inglês).

## O que construir

- [ ] Paraglide (inlang), com as mensagens em `messages/pt.json` e `messages/en.json`.
- [ ] Idioma da interface: o padrão é o idioma do comitê da pessoa, e cada um pode trocar no perfil.
- [ ] Os modelos de impressão (passo 10) e os verbos sugeridos (passo 09) em português e inglês, conforme o idioma do comitê.
- [ ] Datas, horas e números formatados com `Intl`.
- [ ] Os textos das regras (passo 05) nos dois idiomas.

## Testes

Arquivos: `scripts/textos-fixos.ts` e `tests/18-idiomas.spec.ts`.

- [ ] CI: uma checagem encontra textos fixos fora dos arquivos de mensagens.
- [ ] CI: toda chave de mensagem existe nos dois idiomas.
- [ ] Ponta a ponta: os testes de ponta a ponta dos passos anteriores rodam também em inglês.
- [ ] Ponta a ponta: um projeto de resolução impresso num comitê em inglês sai com a linha do comitê e os verbos em inglês.
- [ ] Ponta a ponta: datas e horas aparecem no formato de cada idioma.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [ ] Um comitê em inglês funciona inteiro em inglês, inclusive os documentos impressos.
- [ ] Nenhum texto fixo sobrou nas telas.
