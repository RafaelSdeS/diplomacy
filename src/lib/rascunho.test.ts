import { afterEach, describe, expect, it, vi } from 'vitest';
import { guardarRascunho, lerRascunho } from './rascunho.ts';

describe('rascunhos no aparelho', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('guarda, lê e apaga quando o texto fica vazio', () => {
		const loja = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (k: string) => loja.get(k) ?? null,
			setItem: (k: string, v: string) => loja.set(k, v),
			removeItem: (k: string) => loja.delete(k)
		});
		guardarRascunho('bilhete:CE-T', 'Proposta de aliança');
		expect(lerRascunho('bilhete:CE-T')).toBe('Proposta de aliança');
		guardarRascunho('bilhete:CE-T', '  ');
		expect(loja.size).toBe(0);
	});

	it('sem armazenamento, não quebra', () => {
		vi.stubGlobal('localStorage', {
			getItem: () => {
				throw new Error('bloqueado');
			},
			setItem: () => {
				throw new Error('bloqueado');
			}
		});
		expect(lerRascunho('x')).toBe('');
		expect(() => guardarRascunho('x', 'texto')).not.toThrow();
	});
});
