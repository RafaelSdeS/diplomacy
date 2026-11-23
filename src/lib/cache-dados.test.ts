import { describe, expect, it } from 'vitest';
import { nomeDoCache, semRede, sensivel, sobreviveAAtualizacao, subDoPedido, VALIDADE_MS, vencida } from './cache-dados.ts';

const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (carga: object) => `Bearer ${b64url({ alg: 'HS256' })}.${b64url(carga)}.assinatura`;

describe('cache de dados por usuário', () => {
	it('dá nome ao cache pelo sub do JWT, só de quem está logado', () => {
		expect(subDoPedido(jwt({ sub: 'abc-1', role: 'authenticated' }))).toBe('abc-1');
		expect(nomeDoCache('abc-1')).toBe('dados-abc-1');
		expect(subDoPedido(jwt({ role: 'anon' }))).toBeNull();
		expect(subDoPedido(jwt({ sub: 'x', role: 'service_role' }))).toBeNull();
		expect(subDoPedido(null)).toBeNull();
		expect(subDoPedido('Bearer lixo')).toBeNull();
		expect(subDoPedido('Bearer a.###.c')).toBeNull();
	});

	it('nunca guarda pergunta da coletiva e nota de crise, nem por embed', () => {
		const api = 'https://x.supabase.co/rest/v1/';
		expect(sensivel(`${api}nota_crise?select=*`)).toBe(true);
		expect(sensivel(`${api}coletiva_pergunta_texto?pergunta_id=eq.1`)).toBe(true);
		expect(sensivel(`${api}coletiva?select=*,coletiva_pergunta_texto(texto)`)).toBe(true);
		expect(sensivel(`${api}coletiva?select=id,${encodeURIComponent('coletiva_pergunta_texto(texto)')}`)).toBe(true);
		// A sessão traz os votos embutidos e precisa abrir sem rede.
		expect(sensivel(`${api}estado_sessao?select=sessao(votacoes:votacao(votos:voto(escolha)))`)).toBe(false);
		expect(sensivel(`${api}votacao?select=*`)).toBe(false);
		expect(sensivel(`${api}coletiva_pergunta?select=*`)).toBe(false);
		expect(sensivel(`${api}atualizacao_crise?select=*`)).toBe(false);
		expect(sensivel(`${api}cronograma_item?x=%E0%A4%A`)).toBe(false);
	});

	it('distingue falta de rede de erro da API', () => {
		expect(semRede({ code: '', message: 'TypeError: Failed to fetch' })).toBe(true);
		expect(semRede({ code: '42501' })).toBe(false);
		expect(semRede(null)).toBe(false);
	});

	it('serve sem rede por até 12 horas', () => {
		const agora = 1_000_000_000_000;
		expect(vencida(String(agora - VALIDADE_MS), agora)).toBe(false);
		expect(vencida(String(agora - VALIDADE_MS - 1), agora)).toBe(true);
		expect(vencida(null, agora)).toBe(true);
		expect(vencida('lixo', agora)).toBe(true);
	});

	it('uma versão nova do service worker mantém o cache de cada conta e tira o global antigo', () => {
		const daVersao = ['app-2', 'imutaveis'];
		expect(sobreviveAAtualizacao('dados-abc', daVersao)).toBe(true);
		expect(sobreviveAAtualizacao('app-2', daVersao)).toBe(true);
		expect(sobreviveAAtualizacao('dados', daVersao)).toBe(false);
		expect(sobreviveAAtualizacao('app-1', daVersao)).toBe(false);
	});
});
