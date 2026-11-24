import { describe, expect, it } from 'vitest';
import { testesDaMudanca } from './testes-da-mudanca.ts';

const fontes = {
	'src/lib/ui/FichaPonto.svelte': "import Modal from './Modal.svelte';",
	'src/lib/ui/Modal.svelte': '',
	'src/lib/votacao.ts': '',
	'src/routes/comite/[sigla]/sessao/presidencia/+page.svelte': "import FichaPonto from '#lib/ui/FichaPonto.svelte';",
	'src/routes/comite/[sigla]/sessao/+page.svelte': "import { x } from '#lib/votacao.ts';",
	'src/routes/+layout.svelte': "import Modal from '#lib/ui/Modal.svelte';"
};
const testes = {
	'tests/06-sessao.spec.ts': "const PRESIDENCIA = `/comite/${C.sigla}/sessao/presidencia`;",
	'tests/29-mocoes.spec.ts': 'await page.goto(`/comite/${C.sigla}/sessao`);',
	'tests/08-crise.spec.ts': "page.goto('/comite/CSNU-T/crise')"
};

describe('testes da mudança', () => {
	it('a tela leva aos testes que citam a rota dela', () => {
		expect(testesDaMudanca(['src/routes/comite/[sigla]/sessao/presidencia/+page.svelte'], fontes, testes)).toEqual(['tests/06-sessao.spec.ts']);
	});

	it('um componente leva às telas que o importam e, delas, aos testes', () => {
		expect(testesDaMudanca(['src/lib/ui/FichaPonto.svelte'], fontes, testes)).toEqual(['tests/06-sessao.spec.ts']);
		expect(testesDaMudanca(['src/lib/votacao.ts'], fontes, testes)).toEqual(['tests/06-sessao.spec.ts', 'tests/29-mocoes.spec.ts']);
	});

	it('o que o layout usa, o CSS, o banco e os auxiliares dos testes pedem a suíte inteira', () => {
		expect(testesDaMudanca(['src/lib/ui/Modal.svelte'], fontes, testes)).toBe('todos');
		expect(testesDaMudanca(['src/app.css'], fontes, testes)).toBe('todos');
		expect(testesDaMudanca(['supabase/migrations/x.sql'], fontes, testes)).toBe('todos');
		expect(testesDaMudanca(['tests/ajuda.ts'], fontes, testes)).toBe('todos');
	});

	it('um arquivo de teste alterado roda a si mesmo; documentação não roda nada', () => {
		expect(testesDaMudanca(['tests/08-crise.spec.ts', 'docs/x.md'], fontes, testes)).toEqual(['tests/08-crise.spec.ts']);
	});
});
