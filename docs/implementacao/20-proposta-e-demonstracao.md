# Passo 20 · Proposta de valor e dados de demonstração

**Parte de:** melhorias depois da revisão ([documento](../melhorias-pos-revisao.pdf), itens 1 e 2)
**Depende de:** —
**Esforço:** M
**Objetivo:** escrever por que cada papel usaria o app e criar um evento de demonstração com os 6 comitês do UFRGSMUN, para testar à mão todos os passos seguintes.

## Hoje

- Não há frase de valor por papel.
- Só há comitês de teste (CSNU-T, TREINO, OEA-T, CE-T, UNOCT-T), com contas genéricas, e os testes automáticos dependem deles. A lista do CSNU-T não é a composição real do Conselho.
- Na nuvem, o piloto tem CSNU-T e TREINO (`supabase/demonstracao.sql`, `supabase/treino.sql`).

## Parte A · Proposta de valor

- [ ] Criar `docs/proposta-de-valor.md` com a tabela do documento de melhorias (item 1): papel, por que usaria, o que precisa estar excelente.
- [ ] Acrescentar uma seção "Roteiro do mock and rules": a ordem em que o app é mostrado aos delegados no primeiro dia (entrar, placa, ponto ou moção, voto, bilhete, documento).
- [ ] Ligar o arquivo no `README.md` da raiz.
- [ ] Manual: validar as frases com a organização do UFRGSMUN.

## Parte B · Dados de demonstração

### Decisões

- **Listas plausíveis**, montadas aqui (você confirmou). Os tópicos são ilustrativos. Trocar quando houver as listas oficiais.
- **Evento separado**, "UFRGSMUN Demonstração", com as siglas reais. O evento de teste e os comitês "-T" ficam intactos.
- **Pessoas fictícias**, sem foto (a tela mostra as iniciais). O repositório é público.
- Em cada comitê, **2 delegações têm 2 delegados**.

### Arquivos

- `scripts/admin.ts`: tirar de `scripts/seed.ts` o `credenciais()`, a trava de "só local" e o `verificar()`, e usar nos dois scripts.
- `scripts/demonstracao/dados.ts`: comitês, delegações (nome, nome oficial, código da bandeira, situação), tópicos, veículos e cronograma. Só dados, sem lógica.
- `scripts/demonstracao.ts`: o script. Roda só no local, a menos que `DEMO_PERMITIR_REMOTO=1`, igual ao seed. Pode rodar de novo sem duplicar.
- `package.json`: `"demo": "node scripts/demonstracao.ts"`.
- Remover `supabase/demonstracao.sql`: o script cobre o mesmo com `DEMO_PERMITIR_REMOTO=1`. `supabase/treino.sql` fica.

### Comitês e delegações

| Sigla | Comitê | Idioma | Regras especiais | Crise | Press |
|---|---|---|---|---|---|
| CSNU | Conselho de Segurança | pt | `votacao_substantiva: csnu`, P5 | sim | The New York Times |
| ARF | Fórum Regional da ASEAN | pt | — | não | Asia News Network |
| OEA | Organização dos Estados Americanos (1962) | pt | tecnologia restrita; Cuba suspensa | não | Clarín |
| CEUE | Conselho Europeu | pt | `votacao_substantiva: unanimidade` | sim | El País |
| ACEG-UA | Assembleia de Chefes de Estado e de Governo da União Africana | pt | — | não | Al-Ahram |
| UNOCT | United Nations Office of Counter-Terrorism | en | — | sim | Al Jazeera |

**CSNU (15)**, a composição de 2026: China (cn), Estados Unidos (us), França (fr), Reino Unido (gb), Rússia (ru), Bahrein (bh), Colômbia (co), Dinamarca (dk), Grécia (gr), Letônia (lv), Libéria (lr), Paquistão (pk), Panamá (pa), República Democrática do Congo (cd), Somália (so).

**ARF (24):** Brunei (bn), Camboja (kh), Filipinas (ph), Indonésia (id), Laos (la), Malásia (my), Mianmar (mm), Singapura (sg), Tailândia (th), Vietnã (vn), Austrália (au), Bangladesh (bd), Canadá (ca), China (cn), Coreia do Norte (kp), Coreia do Sul (kr), Estados Unidos (us), Índia (in), Japão (jp), Nova Zelândia (nz), Paquistão (pk), Rússia (ru), Timor-Leste (tl), União Europeia (eu).

**OEA, 1962 (26):** os 21 membros: Argentina (ar), Bolívia (bo), Brasil (br), Chile (cl), Colômbia (co), Costa Rica (cr), Cuba (cu, **suspensa**), Equador (ec), El Salvador (sv), Estados Unidos (us), Guatemala (gt), Haiti (ht), Honduras (hn), México (mx), Nicarágua (ni), Panamá (pa), Paraguai (py), Peru (pe), República Dominicana (do), Uruguai (uy), Venezuela (ve). E 5 **observadoras**: Canadá (ca), Espanha (es), Jamaica (jm), Trinidad e Tobago (tt), União Soviética (o `flag-icons` não tem a bandeira da URSS: SVG próprio em `static/bandeiras/su.svg`, ou sem bandeira; conferir se `ui/Bandeira.svelte` aceita caminho).

**CEUE (27):** Alemanha (de), Áustria (at), Bélgica (be), Bulgária (bg), Chipre (cy), Croácia (hr), Dinamarca (dk), Eslováquia (sk), Eslovênia (si), Espanha (es), Estônia (ee), Finlândia (fi), França (fr), Grécia (gr), Hungria (hu), Irlanda (ie), Itália (it), Letônia (lv), Lituânia (lt), Luxemburgo (lu), Malta (mt), Países Baixos (nl), Polônia (pl), Portugal (pt), República Tcheca (cz), Romênia (ro), Suécia (se).

**ACEG-UA (27):** África do Sul (za), Angola (ao), Argélia (dz), Burkina Faso (bf, **suspensa**), Camarões (cm), Chade (td), Costa do Marfim (ci), Egito (eg), Etiópia (et), Gana (gh), Mali (ml, **suspensa**), Marrocos (ma), Moçambique (mz), Níger (ne, **suspensa**), Nigéria (ng), Quênia (ke), República Democrática do Congo (cd), Ruanda (rw), Senegal (sn), Somália (so), Sudão (sd), Sudão do Sul (ss), Tanzânia (tz), Tunísia (tn), Uganda (ug), Zâmbia (zm), Zimbábue (zw).

**UNOCT (28)**, nomes em inglês: Afghanistan (af), Algeria (dz), Brazil (br), Burkina Faso (bf), Canada (ca), China (cn), Colombia (co), Egypt (eg), France (fr), Germany (de), India (in), Indonesia (id), Iran (ir), Iraq (iq), Israel (il), Japan (jp), Mali (ml), Morocco (ma), Niger (ne), Nigeria (ng), Pakistan (pk), Qatar (qa), Russian Federation (ru), Saudi Arabia (sa), Somalia (so), Türkiye (tr), United Kingdom (gb), United States (us).

Total: 147 delegações.

### Tópicos ilustrativos

- CSNU: 1. A situação no Sahel · 2. Segurança marítima no Mar Vermelho
- ARF: 1. Disputas no Mar do Sul da China · 2. Cibersegurança e infraestrutura crítica
- OEA: 1. A instalação de mísseis em Cuba (outubro de 1962) · 2. A Aliança para o Progresso
- CEUE: 1. Defesa comum europeia · 2. O Pacto de Migração e Asilo
- ACEG-UA: 1. Mudanças inconstitucionais de governo · 2. A Zona de Livre Comércio Continental Africana
- UNOCT: 1. Terrorism in the Sahel and private military companies · 2. Countering online radicalisation

### Pessoas e conteúdo

- **Contas** `demo.<sigla>.<n>@exemplo.test`, com a senha do seed. Nomes vêm da combinação fixa de duas listas curtas (nomes e sobrenomes comuns), sempre a mesma a cada execução. Minibiografia curta.
- **Por comitê:** 3 de mesa, 1 de press, 2 de crise (nos comitês com crise). No evento: 1 secretaria e 1 diretoria da press.
- **Cronograma de 4 dias:** credenciamento, abertura, "mock and rules" no dia 1, sessões de manhã e de tarde, coletiva, encerramento.
- **Conteúdo para as telas não ficarem vazias**, em cada comitê:
  - 3 DPOs (um aprovado, um enviado, um rascunho);
  - 2 cartas, uma delas pública;
  - 2 notícias publicadas, com citação de delegação;
  - 1 bloco com working paper e um projeto em rodada de revisão;
  - a sessão 1 encerrada, com a plenária concluída e uma votação.
- Esse conteúdo é criado **entrando com as contas** (como `clienteComo()` em `tests/ajuda.ts`), porque as funções do banco conferem quem chama. Usar o service role só para convites e contas.

## Testes

Arquivos: `scripts/demonstracao/dados.test.ts`; passo novo no CI.

- [ ] Vitest: as contagens por comitê são 15, 24, 26, 27, 27 e 28 (147); não há nome repetido dentro de um comitê; todo código de bandeira existe no `flag-icons` ou em `static/bandeiras/`.
- [ ] CI: `npm run demo` roda depois do seed, no banco do CI, sem erro. Se passar de 60 s, vai para um `workflow_dispatch`.
- [ ] Os testes de ponta a ponta continuam usando o evento de teste e passam iguais.
- [ ] Manual: entrar com uma conta de delegado de cada comitê e conferir que nenhuma tela fica vazia.

## Pronto quando

- [ ] `docs/proposta-de-valor.md` existe e foi validado com a organização.
- [ ] `npm run demo` monta o evento de demonstração do zero, local e (com a variável) num projeto de teste.
- [ ] Os testes acima passam no CI, junto com os de todos os passos anteriores.
