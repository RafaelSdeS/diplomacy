import 'fake-indexeddb/auto';
import { createStore } from 'idb-keyval';
import { describe, expect, it } from 'vitest';
import { criarCaixa, type Falha, type Item } from './caixa-de-saida.ts';

const SEM_REDE = { message: 'TypeError: Failed to fetch', code: '' };
let lojas = 0;
const novaLoja = () => createStore(`teste-${++lojas}`, 'caixa');
const nota = (id: string) => ({ id, rpc: 'enviar_nota', args: { p_id: id }, rotulo: `Nota ${id}` });

describe('caixa de saída', () => {
	it('guarda argumentos que vêm de um $state do Svelte (proxies)', async () => {
		const caixa = criarCaixa(async () => SEM_REDE, novaLoja());
		const citadas = new Proxy<string[]>([], {});
		expect(await caixa.enviar({ ...nota('p'), args: { p_id: 'p', p_citadas: citadas } })).toBe('guardado');
		expect((await caixa.pendentes())[0].args).toEqual({ p_id: 'p', p_citadas: [] });
	});

	it('remove um item que ainda não saiu, e ele não é reenviado', async () => {
		const enviados: string[] = [];
		let rede = false;
		const caixa = criarCaixa(async (item) => (rede ? (enviados.push(item.id), null) : SEM_REDE), novaLoja());
		await caixa.enviar(nota('x'));
		await caixa.enviar(nota('y'));
		await caixa.remover('x');
		rede = true;
		await caixa.reenviar();
		expect(enviados).toEqual(['y']);
		expect(await caixa.pendentes()).toEqual([]);
	});

	it('guarda o que falhou por falta de rede e reenvia quando a rede volta', async () => {
		let rede = false;
		const enviados: string[] = [];
		const caixa = criarCaixa(async (item) => {
			if (!rede) return SEM_REDE;
			enviados.push(item.id);
			return null;
		}, novaLoja());

		expect(await caixa.enviar(nota('a'))).toBe('guardado');
		expect((await caixa.pendentes()).map((i) => i.id)).toEqual(['a']);

		rede = true;
		expect(await caixa.reenviar()).toEqual(['enviado']);
		expect(enviados).toEqual(['a']);
		expect(await caixa.pendentes()).toEqual([]);
	});

	it('só tira da caixa depois de confirmado; um erro do banco é definitivo', async () => {
		const caixa = criarCaixa(async () => ({ code: 'P0001', message: 'Limite de notas.' }), novaLoja());
		expect(await caixa.enviar(nota('b'))).toEqual({ erro: { code: 'P0001', message: 'Limite de notas.' } });
		expect(await caixa.pendentes()).toEqual([]);
	});

	it('dois reenvios do mesmo item ao mesmo tempo fazem um envio só', async () => {
		let rede = false;
		let envios = 0;
		let liberar = () => {};
		const caixa = criarCaixa(async (): Promise<Falha> => {
			if (!rede) return SEM_REDE;
			envios++;
			await new Promise<void>((pronto) => (liberar = pronto));
			return null;
		}, novaLoja());
		await caixa.enviar(nota('c'));

		rede = true;
		const primeiro = caixa.reenviar();
		const segundo = caixa.reenviar();
		await new Promise((pronto) => setTimeout(pronto, 10));
		liberar();
		expect(await Promise.all([primeiro, segundo])).toEqual([['enviado'], ['enviado']]);
		expect(envios).toBe(1);
	});

	it('reenvia do mais antigo para o mais novo', async () => {
		let rede = false;
		const ordem: string[] = [];
		const caixa = criarCaixa(async (item: Item) => {
			if (!rede) return SEM_REDE;
			ordem.push(item.id);
			return null;
		}, novaLoja());
		for (const id of ['z', 'm', 'a']) {
			await caixa.enviar(nota(id));
			await new Promise((pronto) => setTimeout(pronto, 2));
		}
		rede = true;
		await caixa.reenviar();
		expect(ordem).toEqual(['z', 'm', 'a']);
	});
});
