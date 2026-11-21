import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
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
			adapter: adapter({ fallback: 'index.html' })
		})
	]
});
