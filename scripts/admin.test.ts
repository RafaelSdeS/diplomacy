import { describe, expect, it } from 'vitest';
import { recusaDoAlvo } from './admin.ts';

describe('scripts administrativos (passo 44)', () => {
	const remoto = 'https://abcdefgh.supabase.co';
	it('aceitam o Supabase local', () => {
		expect(recusaDoAlvo('http://127.0.0.1:54321', 'DEMO_PERMITIR_REMOTO', {})).toBeNull();
	});
	it('recusam um projeto remoto só com a flag, ou com o ref de outro projeto', () => {
		expect(recusaDoAlvo(remoto, 'DEMO_PERMITIR_REMOTO', {})).toMatch(/Recusado/);
		expect(recusaDoAlvo(remoto, 'DEMO_PERMITIR_REMOTO', { DEMO_PERMITIR_REMOTO: '1' })).toMatch(/DEMO_PROJETO_REF/);
		expect(recusaDoAlvo(remoto, 'DEMO_PERMITIR_REMOTO', { DEMO_PERMITIR_REMOTO: '1', DEMO_PROJETO_REF: 'producao' })).toMatch(/Recusado/);
	});
	it('aceitam o projeto liberado pelo ref', () => {
		expect(recusaDoAlvo(remoto, 'DEMO_PERMITIR_REMOTO', { DEMO_PERMITIR_REMOTO: '1', DEMO_PROJETO_REF: 'abcdefgh' })).toBeNull();
		expect(recusaDoAlvo(remoto, 'CARGA_PERMITIR_REMOTO', { CARGA_PERMITIR_REMOTO: '1', CARGA_PROJETO_REF: 'abcdefgh' })).toBeNull();
	});
});
