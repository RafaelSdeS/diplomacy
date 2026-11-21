# Passo 18 · Idiomas

**Parte de:** evento
**Depende de:** 12
**Objetivo:** os comitês em português e em inglês, porque há comitês nas duas línguas (o UNOCT de 2026 foi em inglês).

## Como ficou

- **Escopo:** tudo o que um comitê usa sai em inglês: as telas da delegação, da mesa, da crise e da press, o telão, o perfil e os documentos impressos (DPO, cartas, projetos e edições da press). As telas da secretaria, os crachás, os certificados, o arquivo da edição e o aviso de privacidade ficam só em português, porque a organização é brasileira.
- **Sem Paraglide:** um dicionário próprio, sem dependência nova. O texto em português é a chave: `t('Enviar carta')` devolve o texto em inglês de `src/lib/i18n-en.ts` quando o idioma é inglês. Os mapas de rótulos usam `bilingue({...})`. As mensagens de erro do banco, que chegam em português, passam por `traduzirMensagem`, que também casa padrões com números (`EN_PADROES`).
- **Idioma da pessoa:** `pessoa.idioma` (nulo = o do comitê). Sem escolha, vale o idioma do primeiro comitê da pessoa; senão, português. A troca fica em "Idioma do app", no perfil.
- **Documentos impressos:** saem no idioma do comitê, seja qual for o da tela: os verbos sugeridos, a linha do comitê, "Signatories", o tipo do documento no título, a data da carta e o atributo `lang` da folha.
- **Datas e horas:** `Intl` com `locale()` (`en-GB` ou `pt-BR`) e o fuso do evento.
- **Regras:** o texto das regras (passo 05) tem a versão em inglês em `regras.ts`.

## O que construir

- [x] Mensagens nos dois idiomas (dicionário próprio no lugar do Paraglide, veja acima).
- [x] Idioma da interface: o padrão é o idioma do comitê da pessoa, e cada um pode trocar no perfil.
- [x] Os modelos de impressão (passo 10) e os verbos sugeridos (passo 09) em português e inglês, conforme o idioma do comitê.
- [x] Datas, horas e números formatados com `Intl`.
- [x] Os textos das regras (passo 05) nos dois idiomas.

## Testes

Arquivos: `scripts/textos-fixos.ts`, `src/lib/i18n.test.ts` e `tests/18-idiomas.spec.ts`. O seed tem um comitê em inglês (UNOCT-T) com uma delegada e a mesa.

- [x] CI: uma checagem (`npm run textos`) encontra textos fixos fora de `t()` nas telas de comitê.
- [x] CI: todo texto passado a `t()` e todo erro do banco têm a versão em inglês.
- [x] Ponta a ponta: as telas do comitê em inglês, da delegação e da mesa, não mostram texto em português. No lugar de repetir em inglês os testes dos passos anteriores, o teste visita cada tela do comitê e procura sinais de português.
- [x] Ponta a ponta: um projeto de resolução impresso num comitê em inglês sai com a linha do comitê e os verbos em inglês, também para quem usa o app em português.
- [x] Ponta a ponta: datas e horas aparecem no formato de cada idioma.

## Pronto quando

- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
- [x] Um comitê em inglês funciona inteiro em inglês, inclusive os documentos impressos.
- [x] Nenhum texto fixo sobrou nas telas de comitê.
