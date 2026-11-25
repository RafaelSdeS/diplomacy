import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';

// Passo 54: a versão na página "Sobre" é o commit do build (o Cloudflare Pages dá o dele).
const versao = (() => {
	try {
		return process.env.CF_PAGES_COMMIT_SHA ?? execSync('git rev-parse HEAD').toString();
	} catch {
		return 'dev';
	}
})();

export default defineConfig({
	define: { __VERSAO__: JSON.stringify(versao.trim().slice(0, 7)) },
	// Testes de unidade: só funções puras de src/lib e dos scripts (as telas ficam com o Playwright).
	test: {
		include: ['src/**/*.test.ts', 'scripts/**/*.test.ts']
	},
	build: {
		// As 271 bandeiras viram arquivos próprios, baixados só quando aparecem;
		// embutidas, iriam todas juntas no JavaScript.
		assetsInlineLimit: (arquivo) => (arquivo.includes('flag-icons') ? false : undefined)
	},
	plugins: [
		sveltekit({
			compilerOptions: {
				// Modo runes no projeto todo, menos nas bibliotecas. Pode sair no Svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// SPA: toda rota cai no index.html. Sem 404.html na raiz, o Cloudflare Pages
			// trata o site como SPA. Não há páginas pré-renderizadas, então não há conflito.
			adapter: adapter({ fallback: 'index.html' }),
			// Passo 44: caminhos absolutos (/_app/...), como no index.html publicado. O
			// service worker serve a mesma página guardada em qualquer rota sem rede; com
			// caminhos relativos (o padrão do preview), a página de "/" aberta numa rota
			// funda pedia /comite/X/_app/... e ficava em branco.
			paths: { relative: false }
		})
	]
});
