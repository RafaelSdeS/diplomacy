import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EN, EN_PADROES } from './i18n-en.ts';
import { idioma, t, traduzirMensagem } from './i18n.svelte.ts';

// Todo texto marcado no código (t('...') e os valores de bilingue({...})) tem tradução
// para o inglês, e toda mensagem de erro do banco também.

function arquivos(pasta: string): string[] {
	return readdirSync(pasta, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? arquivos(join(pasta, e.name)) : /\.(svelte|ts)$/.test(e.name) && !e.name.endsWith('.test.ts') ? [join(pasta, e.name)] : []
	);
}

const literal = (s: string) => s.replace(/\\'/g, "'");

describe('traduções', () => {
	it('todo texto marcado no código tem tradução para o inglês', () => {
		const chaves = new Set<string>();
		for (const arquivo of arquivos('src')) {
			const codigo = readFileSync(arquivo, 'utf8');
			for (const m of codigo.matchAll(/\bt\(\s*'((?:[^'\\\n]|\\.)*)'/g)) chaves.add(literal(m[1]));
			for (const bloco of codigo.matchAll(/bilingue\(\{([\s\S]*?)\}/g))
				for (const m of bloco[1].matchAll(/:\s*'((?:[^'\\\n]|\\.)*)'/g)) if (m[1]) chaves.add(literal(m[1]));
		}
		expect([...chaves].filter((c) => !(c in EN))).toEqual([]);
	});

	it('toda mensagem de erro do banco tem tradução', () => {
		const faltam: string[] = [];
		for (const nome of readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql'))) {
			const arquivo = join('supabase/migrations', nome);
			for (const m of readFileSync(arquivo, 'utf8').matchAll(/raise exception '((?:[^']|'')*)'/g)) {
				const msg = m[1].replace(/''/g, "'");
				const exemplo = msg.replace(/%/g, '3');
				if (!(msg in EN) && !EN_PADROES.some(([p]) => p.test(exemplo))) faltam.push(msg);
			}
		}
		expect([...new Set(faltam)]).toEqual([]);
	});

	it('troca os parâmetros e traduz as mensagens do banco com números', () => {
		idioma.atual = 'en';
		expect(t('{n} de {total} votaram', { n: 3, total: 5 })).toBe('3 of 5 voted');
		expect(traduzirMensagem('Sua delegação já tem 2 notas esperando resposta. Aguarde uma resposta para enviar outra.')).toBe(
			'Your delegation already has 2 notes awaiting a reply. Wait for a reply before sending another.'
		);
		idioma.atual = 'pt';
		expect(t('{n} de {total} votaram', { n: 3, total: 5 })).toBe('3 de 5 votaram');
	});
});
