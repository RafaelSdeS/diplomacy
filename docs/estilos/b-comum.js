// Estilo B · Chancelaria oficial: fontes, cores (claro e escuro), Tailwind e a barra de telas.
// ponytail: arquivo compartilhado só pelos protótipos em docs/estilos/; não é código do app.
document.head.insertAdjacentHTML('beforeend', `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,600;1,400&family=Noto+Sans:wght@400;500;600&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/css/flag-icons.min.css">
<style>
  /* Claro: marinho do DS gov.br; vermelho, mostarda e cinzas do DSFR. */
  :root {
    --faixa:#071D41; --marinho:#071D41; --marinho2:#0C326F; --sobre-marinho:#FFFFFF;
    --papel:#FFFFFF; --fundo:#F6F6F6; --destaque:#EEF1F7;
    --tinta:#161616; --cinza:#3A3A3A; --mudo:#666666; --linha:#DDDDDD;
    --ouro:#C3992A; --ouro-texto:#695240; --ouro-fundo:#FBF5E6;
    --vermelho:#E1000F; --vermelho-texto:#C9191E; --vermelho-fundo:#FEF4F4;
    --ok:#18753C; --ok-fundo:#E8F4EC;
  }
  /* Escuro: proposta (não extraída de nenhum site). */
  html.dark {
    color-scheme: dark;
    --faixa:#050C1A; --marinho:#A9C1E6; --marinho2:#C9D8F0; --sobre-marinho:#071D41;
    --papel:#121A29; --fundo:#0B111C; --destaque:#1A2740;
    --tinta:#E8ECF2; --cinza:#C3CAD6; --mudo:#98A2B3; --linha:#2A3448;
    --ouro:#C3992A; --ouro-texto:#DDBB62; --ouro-fundo:#2B2412;
    --vermelho:#FF5C5C; --vermelho-texto:#FF8A80; --vermelho-fundo:#3A1517;
    --ok:#6CCB8F; --ok-fundo:#13301F;
  }
  body { background: var(--fundo); color: var(--tinta); }
  .aviso { color: var(--vermelho) !important; } .aviso-barra { background: var(--vermelho) !important; }
  @media print { .sem-impressao { display: none !important; } body { background: #fff; } }
</style>`);

const TOKENS = ['faixa', 'marinho', 'marinho2', 'sobre-marinho', 'papel', 'fundo', 'destaque', 'tinta', 'cinza', 'mudo', 'linha',
  'ouro', 'ouro-texto', 'ouro-fundo', 'vermelho', 'vermelho-texto', 'vermelho-fundo', 'ok', 'ok-fundo'];
tailwind.config = { darkMode: 'class', theme: { extend: {
  colors: Object.fromEntries(TOKENS.map((t) => [t, `var(--${t})`])),
  fontFamily: { sans: ['"Noto Sans"', 'Arial', 'sans-serif'], serif: ['Spectral', 'Georgia', 'serif'] },
} } };

let temaSalvo = null;
try { temaSalvo = localStorage.getItem('tema-b'); } catch {}
document.documentElement.classList.toggle('dark', temaSalvo ? temaSalvo === 'escuro' : matchMedia('(prefers-color-scheme: dark)').matches);

const TELAS = [['b-sessao.html', 'Sessão'], ['b-agora.html', 'Agora (celular)'], ['b-presidencia.html', 'Presidência'],
  ['b-documento.html', 'Projeto de resolução'], ['b-crise.html', 'Crise'], ['b-press.html', 'Press'],
  ['b-telao.html', 'Telão'], ['b-dpo.html', 'DPO impresso']];

addEventListener('DOMContentLoaded', () => {
  const atual = location.pathname.split('/').pop();
  document.body.insertAdjacentHTML('afterbegin', `
  <nav class="sem-impressao bg-papel border-b border-linha text-sm" aria-label="Telas do estilo B">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center gap-x-5 gap-y-1">
      <a href="estilo-chancelaria-oficial.html" class="text-xs uppercase tracking-[0.15em] text-mudo hover:text-marinho">Estilo B</a>
      ${TELAS.map(([href, nome]) => href === atual
        ? `<a href="${href}" aria-current="page" class="font-semibold text-marinho underline decoration-ouro decoration-2 underline-offset-4">${nome}</a>`
        : `<a href="${href}" class="text-marinho2 hover:underline">${nome}</a>`).join('')}
      <button id="tema" class="ml-auto border border-linha px-2.5 py-1 text-xs text-cinza hover:border-marinho"></button>
    </div>
  </nav>`);
  const bt = document.getElementById('tema');
  const rotulo = () => { bt.textContent = document.documentElement.classList.contains('dark') ? 'Tema claro' : 'Tema escuro'; };
  bt.onclick = () => {
    const escuro = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('tema-b', escuro ? 'escuro' : 'claro'); } catch {}
    rotulo();
  };
  rotulo();
});

// Dados fictícios: membros do CSNU em 2026.
const PAISES = [['cn', 'China', 'P5', 'votante'], ['us', 'Estados Unidos', 'P5', 'votante'], ['ru', 'Federação Russa', 'P5', 'presente'],
  ['fr', 'França', 'P5', 'falando'], ['gb', 'Reino Unido', 'P5', 'votante'], ['bh', 'Bahrein', '', 'presente'], ['co', 'Colômbia', '', 'presente'],
  ['dk', 'Dinamarca', '', 'votante'], ['gr', 'Grécia', '', 'presente'], ['lv', 'Letônia', '', 'presente'], ['lr', 'Libéria', '', 'ausente'],
  ['pa', 'Panamá', '', 'presidencia'], ['pk', 'Paquistão', '', 'votante'], ['cd', 'RD Congo', '', 'presente'], ['so', 'Somália', '', 'presente']];
const NOME = Object.fromEntries(PAISES.map(([iso, nome]) => [iso, nome]));
const bandeira = (iso, extra = '') => `<span class="fi fi-${iso} ring-1 ring-black/10 shrink-0 ${extra}"></span>`;

// ponytail: cronômetro de demonstração, sem sincronia com servidor.
function cronometro({ total = 90, resta = 72, rodando = false } = {}) {
  const el = document.getElementById('tempo'), barra = document.getElementById('barra');
  const bt = document.getElementById('alternar'), zerar = document.getElementById('zerar');
  let id = null;
  const mostra = () => {
    el.textContent = `${String(Math.floor(resta / 60)).padStart(2, '0')}:${String(resta % 60).padStart(2, '0')}`;
    if (barra) barra.style.width = `${(resta / total) * 100}%`;
    el.classList.toggle('aviso', resta <= 10); barra?.classList.toggle('aviso-barra', resta <= 10);
  };
  const alterna = () => {
    if (id) { clearInterval(id); id = null; } else id = setInterval(() => { resta = Math.max(0, resta - 1); mostra(); if (!resta) alterna(); }, 1000);
    if (bt) bt.textContent = id ? 'Pausar' : 'Retomar';
  };
  if (bt) bt.onclick = alterna;
  if (zerar) zerar.onclick = () => { resta = total; mostra(); };
  mostra();
  if (rodando) alterna();
}
