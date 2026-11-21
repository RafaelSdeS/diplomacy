// Passo 18: procura textos fixos (sem t()) nas telas que um comitê usa. As telas da
// secretaria, a página de estilo e as impressões internas ficam só em português.
//   node scripts/textos-fixos.ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const FORA = [
	'src/routes/secretaria/',
	'src/routes/estilo/',
	'src/routes/privacidade/',
	'src/routes/imprimir/crachas/',
	'src/routes/imprimir/certificados/',
	'src/routes/imprimir/arquivo/',
	'src/routes/verificar/'
];
// Não se traduzem: a marca, os nomes dos idiomas e teclas.
const LIVRES = new Set(['UFRGSMUN', 'Português', 'English', 'Enter', 'Espaço', 'America/Sao_Paulo']);

function svelte(pasta: string): string[] {
	return readdirSync(pasta, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? svelte(join(pasta, e.name)) : e.name.endsWith('.svelte') ? [join(pasta, e.name)] : []
	);
}

/** Separa o template em texto (fora de {...}) e expressões (dentro), mantendo as linhas. */
function separar(template: string) {
	let texto = '';
	const expressoes: { codigo: string; linha: number }[] = [];
	let nivel = 0;
	let atual = '';
	let linha = 1;
	let inicio = 1;
	for (const c of template) {
		if (c === '\n') linha++;
		if (c === '{') {
			if (nivel++ === 0) {
				atual = '';
				inicio = linha;
				continue;
			}
		} else if (c === '}' && nivel > 0) {
			if (--nivel === 0) {
				expressoes.push({ codigo: atual, linha: inicio });
				texto += ' ';
				continue;
			}
		}
		if (nivel > 0) {
			atual += c;
			if (c === '\n') texto += '\n';
		} else texto += c;
	}
	return { texto, expressoes };
}

const problemas: string[] = [];
for (const arquivo of [...svelte('src/routes'), ...svelte('src/lib/ui')]) {
	if (FORA.some((f) => arquivo.startsWith(f))) continue;
	const codigo = readFileSync(arquivo, 'utf8');
	const template = codigo.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, (m) => '\n'.repeat(m.split('\n').length - 1));
	const { texto, expressoes } = separar(template);
	// Texto solto: o que sobra fora das tags e das expressões.
	texto
		.replace(/<[^>]*>/g, (m) => m.replace(/[^\n]/g, ' '))
		.split('\n')
		.forEach((l, i) => {
			const palavras = l.split(/[\s·:()→—–\-.,;?!ª…"'/]+/).filter((p) => /[A-Za-zÀ-ú]{2,}/.test(p) && !LIVRES.has(p));
			if (palavras.length) problemas.push(`${arquivo}:${i + 1}: ${palavras.join(' ')}`);
		});
	// Strings dentro das expressões, fora de t(): começam com maiúscula e têm minúsculas.
	for (const { codigo: expr, linha } of expressoes)
		for (const m of expr.matchAll(/(?<![\w(]|t\(\s*)'([A-ZÀ-Ú][^'\n]*[a-zà-ú][^'\n]*)'/g))
			if (!LIVRES.has(m[1])) problemas.push(`${arquivo}:${linha}: '${m[1]}'`);
}
if (problemas.length) {
	console.error(`Textos fixos fora de t() nas telas de comitê (${problemas.length}):\n${problemas.join('\n')}`);
	process.exit(1);
}
console.log('Nenhum texto fixo nas telas de comitê.');
