# Passo 40 · Menos dados no celular

**Depende de:** 39
**Esforço:** M
**Objetivo:** gastar menos internet móvel, porque muita gente usa dados no evento.

## Antes e depois

Medidos no Supabase local, num celular de delegado com 20 trocas de orador (`tests/15-offline.spec.ts`). Contam as respostas da API e as mensagens do tempo real. A estimativa supõe uma mudança a cada 20 s numa sessão de 2 h.

| | Antes | Depois |
|---|---|---|
| Tela da sessão, por atualização | 9 leituras, 10,2 KB | 2 leituras, 3,6 KB |
| Tela da sessão, sessão de 2 h | ~3,6 MB | ~1,3 MB |
| "Agora", por atualização | 18 leituras, 15,0 KB | 3 leituras, 4,1 KB |
| "Agora", sessão de 2 h | ~5,3 MB | ~1,4 MB |
| Primeira visita: o que o service worker baixa (gzip) | ~1,1 MB (com 271 bandeiras e as fontes .woff) | ~380 KB |
| Versão nova do app | todos os ~390 arquivos de novo | só os arquivos que mudaram |

## Como ficou

**Tempo real: relê só o que mudou.**
- O aviso do banco já trazia o nome da tabela. Agora `AoVivo` junta as tabelas que mudaram em 300 ms (antes eram 100 ms, para juntar rajadas de votos) e chama `recarregarAoVivo(dependencia, tabelas)`.
- Cada consulta de tela ao vivo passa por `lerAoVivo(chave, tabelas, ler)` (`src/lib/tempo-real.ts`). Numa recarga do tempo real, a consulta só vai à rede se uma das tabelas dela mudou; senão, devolve a última leitura.
- Abrir a tela, recarregar à mão e reconectar releem tudo. Uma leitura com erro não fica guardada, e sair da conta apaga tudo (`esquecerLeituras`).
- Onde se aplica:
  - `carregarSessao` (estado, lista, delegações, regras, permissão de presidir, sala fechada, representações);
  - as votações encerradas da sessão;
  - incidentes de crise;
  - chamada, painel da presidência e telão;
  - "Agora";
  - as duas telas de crise;
  - avisos do layout.
- `TABELAS_SESSAO` ganhou `proximo_orador`, `assinatura_mocao`, `passe`, `representacao`, `emenda` e `emenda_assinatura`. Antes, essas mudanças só apareciam de carona na recarga de outra tabela; agora cada uma tem o próprio aviso.
- O "Agora" atualiza ao vivo a sessão e os avisos. Bilhetes, DPOs, matérias e entrevistas atualizam ao abrir a tela, porque esses avisos chegam por outros canais.
- Limite conhecido: um `invalidate` feito à mão bem no meio de uma recarga ao vivo pode reaproveitar uma leitura antiga. Ela se corrige no aviso seguinte do banco.

**Service worker** (`src/service-worker/index.ts`):
- Na instalação entram o JavaScript, o CSS, as fontes woff2 e os arquivos de `static/`.
- As bandeiras e as fontes .woff entram no cache quando aparecem. O navegador com service worker usa a woff2.
- Os arquivos com hash ficam no cache `imutaveis`, que passa de uma versão para a outra:
  - na instalação, entra só o que falta;
  - na ativação, sai o que a versão atual não usa.

**Imagens:**
- `linksAssinados(bucket, caminhos)` (`src/lib/imagem.ts`) guarda o link assinado de cada imagem até 5 min antes de vencer. O mesmo link deixa o navegador reaproveitar a imagem já baixada.
- Usado na press, na página da delegação e no perfil. Trocar a própria foto gera um link novo.
- Limite: a foto nova de outra pessoa pode levar até 1 h para aparecer.
- O feed da press carrega as imagens só quando chegam perto da tela (`loading="lazy"`).

**Cabeçalhos:**
- `static/_headers` faz `/_app/immutable/*` sair com `Cache-Control: public, max-age=31536000, immutable`.
- O service worker não guarda o `_headers`.

## Ficou de fora

- **Dicionário inglês só para quem usa inglês:** economizaria ~17 KB, uma vez só, porque depois fica no aparelho. Mexe em toda tela com texto do comitê em inglês.
- **Dividir o supabase-js:** economizaria ~25–30 KB, também uma vez só, e exigiria refazer a ligação do login com o cliente.
- **Largura e altura nas imagens da press:** o banco não guarda as dimensões.

## Testes

- [x] `tests/15-offline.spec.ts`:
  - a instalação não guarda bandeiras nem `.woff`;
  - uma troca de orador faz no máximo 3 leituras na sessão e 5 no "Agora" (medido: 2 e 3; a folga cobre os avisos de outros testes em paralelo);
  - menos de 20 KB por atualização.
- [x] `src/lib/tempo-real.test.ts`: a recarga ao vivo relê só a tabela que mudou; reconectar e navegar releem tudo; erro não fica guardado; sair da conta apaga.
- [x] A suíte inteira continua passando.
- [ ] Depois do deploy, `curl -I` num arquivo de `/_app/immutable/` mostra o `immutable` e a compressão.
- [ ] Manual: no DevTools, com "Slow 4G", a primeira visita fica abaixo de ~400 KB transferidos.
