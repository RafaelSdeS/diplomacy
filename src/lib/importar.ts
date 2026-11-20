// Importação das inscrições: o CSV exportado do Google Forms vira convites.

import type { Papel } from './supabase.ts';

/** Lê um CSV (vírgula ou ponto e vírgula, com aspas), ignorando linhas vazias. */
export function lerCsv(texto: string): string[][] {
	const limpo = texto.replace(/^﻿/, '');
	const primeira = limpo.split(/\r?\n/, 1)[0] ?? '';
	const separador = (primeira.match(/;/g)?.length ?? 0) > (primeira.match(/,/g)?.length ?? 0) ? ';' : ',';
	const linhas: string[][] = [];
	let linha: string[] = [];
	let campo = '';
	let aspas = false;
	for (let i = 0; i < limpo.length; i++) {
		const c = limpo[i];
		if (aspas) {
			if (c === '"' && limpo[i + 1] === '"') {
				campo += '"';
				i++;
			} else if (c === '"') aspas = false;
			else campo += c;
		} else if (c === '"') aspas = true;
		else if (c === separador) {
			linha.push(campo);
			campo = '';
		} else if (c === '\n' || c === '\r') {
			if (c === '\r' && limpo[i + 1] === '\n') i++;
			linha.push(campo);
			linhas.push(linha);
			linha = [];
			campo = '';
		} else campo += c;
	}
	if (campo || linha.length) linhas.push([...linha, campo]);
	return linhas.filter((l) => l.some((v) => v.trim()));
}

export const CAMPOS = ['nome', 'email', 'papel', 'comite', 'delegacao'] as const;
export type Campo = (typeof CAMPOS)[number];
export type Mapa = Record<Campo, number>; // índice da coluna, ou -1

const semAcentos = (s: string) =>
	s
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.trim();

const PISTAS: Record<Campo, RegExp> = {
	email: /e-?mail/,
	nome: /nome/,
	papel: /papel|funcao/,
	comite: /comite/,
	delegacao: /delegacao|pais|representa/
};

/** Adivinha as colunas pelo cabeçalho; a secretaria confere e corrige na tela. */
export function adivinharColunas(cabecalho: string[]): Mapa {
	const mapa = Object.fromEntries(CAMPOS.map((c) => [c, -1])) as Mapa;
	const usadas = new Set<number>();
	for (const campo of ['email', 'comite', 'delegacao', 'papel', 'nome'] as const) {
		const i = cabecalho.findIndex((h, j) => !usadas.has(j) && PISTAS[campo].test(semAcentos(h)));
		if (i >= 0) {
			mapa[campo] = i;
			usadas.add(i);
		}
	}
	return mapa;
}

const PAPEL_POR_TEXTO: [RegExp, Papel][] = [
	[/^deleg/, 'delegado'],
	[/^mesa|diretor/, 'mesa'],
	[/^crise/, 'crise'],
	[/^press|imprensa|jornal/, 'press'],
	[/^secretari/, 'secretaria']
];

export type Contexto = {
	evento: string;
	comites: { id: string; sigla: string; nome: string }[];
	delegacoes: { id: string; nome: string; comite_id: string }[];
	/** Chaves "email|papel|comite" dos convites que já existem. */
	existentes: Set<string>;
};

export type Convite = {
	email: string;
	nome: string | null;
	papel: Papel;
	evento_id: string;
	comite_id: string | null;
	delegacao_id: string | null;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Monta os convites das linhas (sem o cabeçalho) e aponta os problemas de cada linha. */
export function montarConvites(linhas: string[][], mapa: Mapa, ctx: Contexto) {
	const convites: Convite[] = [];
	const problemas: { linha: number; mensagem: string }[] = [];
	const vistos = new Set<string>();
	const valor = (l: string[], campo: Campo) => (mapa[campo] >= 0 ? (l[mapa[campo]] ?? '').trim() : '');

	linhas.forEach((l, i) => {
		const numero = i + 2; // a linha 1 é o cabeçalho
		const email = valor(l, 'email').toLowerCase();
		if (!EMAIL.test(email)) return problemas.push({ linha: numero, mensagem: `e-mail inválido: "${email}"` });

		const textoPapel = semAcentos(valor(l, 'papel'));
		const papel = textoPapel ? PAPEL_POR_TEXTO.find(([re]) => re.test(textoPapel))?.[1] : 'delegado';
		if (!papel) return problemas.push({ linha: numero, mensagem: `papel desconhecido: "${valor(l, 'papel')}"` });

		let comite: Contexto['comites'][number] | undefined;
		if (papel !== 'secretaria') {
			const texto = semAcentos(valor(l, 'comite'));
			comite = ctx.comites.find((c) => semAcentos(c.sigla) === texto || semAcentos(c.nome) === texto);
			if (!comite) return problemas.push({ linha: numero, mensagem: `comitê desconhecido: "${valor(l, 'comite')}"` });
		}

		let delegacao: Contexto['delegacoes'][number] | undefined;
		if (papel === 'delegado') {
			const texto = semAcentos(valor(l, 'delegacao'));
			delegacao = ctx.delegacoes.find((d) => d.comite_id === comite!.id && semAcentos(d.nome) === texto);
			if (!delegacao) {
				return problemas.push({ linha: numero, mensagem: `delegação desconhecida em ${comite!.sigla}: "${valor(l, 'delegacao')}"` });
			}
		}

		const chave = `${email}|${papel}|${comite?.id ?? ''}`;
		if (vistos.has(chave)) return problemas.push({ linha: numero, mensagem: `repetida no arquivo: ${email}` });
		vistos.add(chave);
		if (ctx.existentes.has(chave)) return problemas.push({ linha: numero, mensagem: `já convidado: ${email}` });

		convites.push({
			email,
			nome: valor(l, 'nome') || null,
			papel,
			evento_id: ctx.evento,
			comite_id: comite?.id ?? null,
			delegacao_id: delegacao?.id ?? null
		});
	});
	return { convites, problemas };
}
