// Mede o tamanho do app depois do build (gzip) e falha acima do limite.
// ponytail: soma tudo o que está em build/, o que é um limite superior da primeira
// abertura. Quando o total passar do limite, medir só o que a primeira tela carrega.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMITE_KB = 300;
const PASTA = 'build';
const TIPOS = new Set(['.html', '.js', '.css', '.woff2', '.svg']);

let total = 0;
for (const nome of readdirSync(PASTA, { recursive: true, encoding: 'utf8' })) {
	const caminho = join(PASTA, nome);
	if (statSync(caminho).isFile() && TIPOS.has(extname(caminho))) {
		total += gzipSync(readFileSync(caminho)).length;
	}
}

const kb = total / 1024;
console.log(`Tamanho do app (gzip): ${kb.toFixed(1)} KB de ${LIMITE_KB} KB`);
if (kb > LIMITE_KB) {
	console.error('Passou do limite de tamanho da primeira abertura.');
	process.exit(1);
}
