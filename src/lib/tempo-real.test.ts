import { describe, expect, it, vi } from 'vitest';

// O invalidate do SvelteKit vira "rodar o load de novo", aqui uma função do teste.
const navegacao = vi.hoisted(() => ({ load: async () => {} }));
vi.mock('$app/navigation', () => ({ invalidate: () => navegacao.load() }));

import { esquecerLeituras, lerAoVivo, recarregarAoVivo } from './tempo-real.ts';

describe('lerAoVivo (passo 40)', () => {
	it('numa recarga ao vivo relê só o que usa a tabela que mudou; o resto relê tudo', async () => {
		const lidas = { estado: 0, regras: 0 };
		navegacao.load = async () => {
			await Promise.all([
				lerAoVivo('t1:estado', ['estado_sessao', 'presenca'], async () => ++lidas.estado),
				lerAoVivo('t1:regras', ['comite'], async () => ++lidas.regras)
			]);
		};
		await navegacao.load(); // a tela abre: lê tudo
		expect(lidas).toEqual({ estado: 1, regras: 1 });

		await recarregarAoVivo('app:teste', ['presenca']);
		expect(lidas).toEqual({ estado: 2, regras: 1 });

		await recarregarAoVivo('app:teste', null); // ao reconectar
		expect(lidas).toEqual({ estado: 3, regras: 2 });

		await navegacao.load(); // navegar ou recarregar à mão
		expect(lidas).toEqual({ estado: 4, regras: 3 });
	});

	it('uma leitura que falhou não fica guardada', async () => {
		let vezes = 0;
		const ler = () => lerAoVivo('t2', ['comite'], async () => (++vezes === 1 ? { error: 'sem rede' } : { error: null }));
		navegacao.load = async () => void (await ler());
		await ler();
		await recarregarAoVivo('app:teste', ['outra']);
		expect(vezes).toBe(2);
	});

	it('ao sair da conta, nada lido fica para a próxima pessoa', async () => {
		let vezes = 0;
		navegacao.load = async () => void (await lerAoVivo('t3', ['comite'], async () => ++vezes));
		await navegacao.load();
		esquecerLeituras();
		await recarregarAoVivo('app:teste', ['outra']);
		expect(vezes).toBe(2);
	});
});
