// Mede o que a primeira abertura baixa (gzip) e falha acima do limite: o
// index.html, as entradas do SvelteKit, o layout raiz e a tela /entrar (a
// primeira de quem chega), com tudo o que eles importam de forma estática
// (JS, CSS e a fonte). Bandeiras e as outras telas ficam de fora: só são
// baixadas quando aparecem.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMITE_KB = 300;
const BUILD = 'build';
const NOS = '.svelte-kit/generated/build/client-optimized/nodes';
const manifesto = JSON.parse(readFileSync('.svelte-kit/output/client/.vite/manifest.json', 'utf8'));

/**
 * O nó do SvelteKit de uma rota: o arquivo gerado que importa o +page.svelte dela.
 * @param {string} rota
 */
function noDaRota(rota) {
	const arquivo = readdirSync(NOS).find((no) =>
		readFileSync(join(NOS, no), 'utf8').includes(`src/routes/${rota}/+page.svelte`)
	);
	if (!arquivo) throw new Error(`Rota não encontrada no build: ${rota}`);
	return `${NOS}/${arquivo}`;
}

const inicio = [
	...Object.keys(manifesto).filter((chave) => manifesto[chave].isEntry && !chave.includes('/nodes/')),
	`${NOS}/0.js`, // layout raiz
	noDaRota('entrar')
];

const arquivos = new Set(['index.html']);
const visitados = new Set();
/** @param {string} chave */
function visitar(chave) {
	if (visitados.has(chave)) return;
	visitados.add(chave);
	const item = manifesto[chave];
	arquivos.add(item.file);
	for (const css of item.css ?? []) arquivos.add(css);
	// A fonte vem em .woff2 e .woff; o navegador só baixa o .woff2.
	for (const asset of item.assets ?? []) if (!asset.endsWith('.woff')) arquivos.add(asset);
	for (const importado of item.imports ?? []) visitar(importado);
}
inicio.forEach(visitar);

let total = 0;
for (const arquivo of arquivos) total += gzipSync(readFileSync(join(BUILD, arquivo))).length;

const kb = total / 1024;
console.log(`Primeira abertura (gzip): ${kb.toFixed(1)} KB de ${LIMITE_KB} KB, em ${arquivos.size} arquivos`);
if (kb > LIMITE_KB) {
	console.error('Passou do limite de tamanho da primeira abertura.');
	process.exit(1);
}
