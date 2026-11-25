import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Passo 55: o país sempre abre a ficha. Bandeira e nome sem ação só no NomeDelegacao, no
// telão e na impressão (projetados ou em papel), e nos lugares em que já estão dentro de uma ação.
const FORA = ['src/lib/ui/NomeDelegacao.svelte', 'src/routes/telao/', 'src/routes/imprimir/'];
const DENTRO_DE_ACAO: Record<string, string> = {
	'src/lib/ui/ListaVotos.svelte': 'sem sigla, só fora do comitê',
	'src/lib/ui/GradeVotos.svelte': 'sem sigla, só no telão',
	'src/routes/comite/[sigla]/sessao/chamada/+page.svelte': 'dentro do botão que marca a presença',
	'src/routes/crise/[sigla]/+page.svelte': 'dentro do botão que abre a nota',
	'src/routes/perfil/+page.svelte': 'a credencial da própria pessoa'
};

const svelte = (pasta: string): string[] =>
	readdirSync(pasta, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? svelte(join(pasta, e.name)) : e.name.endsWith('.svelte') ? [join(pasta, e.name)] : []
	);

describe('bandeira e nome', () => {
	it('fora do NomeDelegacao, do telão e da impressão, sempre têm ação', () => {
		const soltos = svelte('src')
			.filter((f) => !FORA.some((x) => f.startsWith(x)) && !(f in DENTRO_DE_ACAO))
			.filter((f) => /<(span|strong|p|div|li)\b[^>]*\bcom-bandeira\b/.test(readFileSync(f, 'utf8')));
		expect(soltos).toEqual([]);
	});
});
