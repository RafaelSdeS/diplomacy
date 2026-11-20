import { expect, test } from '@playwright/test';
import { contaDaDelegacao, contaDoTreino } from '../scripts/delegacoes.ts';
import { clienteComo, CONTAS } from './ajuda.ts';

// Passo 13: os canais privados do Broadcast. A queda e a volta da rede no meio de uma
// sessão estão em 12-piloto.spec.ts; os fluxos ao vivo dos passos 04 a 12 já passam
// pelos canais.

type Cliente = Awaited<ReturnType<typeof clienteComo>>;

test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'não depende da tela: roda num projeto só');
});

/** Tenta entrar num canal privado e diz como terminou. */
function entrarNoCanal(cliente: Cliente, topico: string) {
	return new Promise<string>((resolver) => {
		const canal = cliente.channel(topico, { config: { private: true } });
		canal.subscribe((status) => {
			if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
				resolver(status);
				void cliente.removeChannel(canal);
			}
		});
	});
}

async function comClientes<T>(contas: string[], uso: (clientes: Cliente[]) => Promise<T>) {
	const clientes = await Promise.all(contas.map(clienteComo));
	try {
		return await uso(clientes);
	} finally {
		for (const c of clientes) c.realtime.disconnect();
	}
}

test('um delegado de outro comitê não entra no canal do comitê', async () => {
	await comClientes([CONTAS.delegado, contaDoTreino('Brasil')], async ([eua, treino]) => {
		const csnu = (await eua.from('comite').select('id').eq('sigla', 'CSNU-T').single()).data!.id;
		expect(await entrarNoCanal(eua, `comite:${csnu}`)).toBe('SUBSCRIBED');
		expect(await entrarNoCanal(treino, `comite:${csnu}`)).toBe('CHANNEL_ERROR');
	});
});

test('só a equipe de crise entra no canal da crise, e só a delegação no canal dela', async () => {
	await comClientes([CONTAS.crise, CONTAS.delegado, contaDaDelegacao('Brasil')], async ([crise, eua, brasil]) => {
		const csnu = (await eua.from('comite').select('id').eq('sigla', 'CSNU-T').single()).data!.id;
		const delegacaoEua = (await eua.from('delegacao').select('id').eq('comite_id', csnu).eq('nome', 'EUA').single()).data!.id;

		expect(await entrarNoCanal(crise, `crise:${csnu}`)).toBe('SUBSCRIBED');
		expect(await entrarNoCanal(eua, `crise:${csnu}`)).toBe('CHANNEL_ERROR');
		expect(await entrarNoCanal(eua, `delegacao:${delegacaoEua}`)).toBe('SUBSCRIBED');
		expect(await entrarNoCanal(brasil, `delegacao:${delegacaoEua}`)).toBe('CHANNEL_ERROR');
	});
});

test('a nota de crise chega à crise e à delegação, sem passar pelo canal do comitê', async () => {
	await comClientes([CONTAS.crise, CONTAS.delegado, contaDaDelegacao('Brasil')], async ([crise, eua, brasil]) => {
		const csnu = (await eua.from('comite').select('id').eq('sigla', 'CSNU-T').single()).data!.id;
		const delegacaoEua = (await eua.from('delegacao').select('id').eq('comite_id', csnu).eq('nome', 'EUA').single()).data!.id;

		// Cada um ouve o próprio canal e anota as tabelas avisadas.
		const ouvidos: Record<string, string[]> = { crise: [], eua: [], comite: [] };
		const ouvir = (cliente: Cliente, topico: string, chave: string) =>
			new Promise<void>((pronto) => {
				cliente
					.channel(topico, { config: { private: true } })
					.on('broadcast', { event: 'mudou' }, ({ payload }) => ouvidos[chave].push(payload.tabela))
					.subscribe((status) => status === 'SUBSCRIBED' && pronto());
			});
		await Promise.all([
			ouvir(crise, `crise:${csnu}`, 'crise'),
			ouvir(eua, `delegacao:${delegacaoEua}`, 'eua'),
			ouvir(brasil, `comite:${csnu}`, 'comite')
		]);

		const { error } = await eua.rpc('enviar_nota', {
			p_id: crypto.randomUUID(),
			p_comite: csnu,
			p_tipo: 'nota',
			p_titulo: 'Canal privado',
			p_texto: 'Só a crise e a própria delegação ficam sabendo.'
		});
		expect(error).toBeNull();

		await expect.poll(() => ouvidos.crise, { timeout: 10_000 }).toContain('nota_crise');
		await expect.poll(() => ouvidos.eua, { timeout: 10_000 }).toContain('nota_crise');
		expect(ouvidos.comite).not.toContain('nota_crise');
	});
});
