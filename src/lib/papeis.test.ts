import { describe, expect, it } from 'vitest';
import { papelPrincipal } from './papeis.ts';

describe('papelPrincipal', () => {
	it('escolhe o papel mais amplo da pessoa', () => {
		expect(papelPrincipal([{ papel: 'delegado' }])).toBe('delegado');
		expect(papelPrincipal([{ papel: 'delegado' }, { papel: 'mesa' }])).toBe('mesa');
		expect(papelPrincipal([{ papel: 'press' }, { papel: 'crise' }])).toBe('crise');
		expect(papelPrincipal([{ papel: 'mesa' }, { papel: 'secretaria' }])).toBe('secretaria');
		expect(papelPrincipal([])).toBeNull();
	});
});
