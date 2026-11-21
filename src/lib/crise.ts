// Funções da crise (as puras, testadas em crise.test.ts).
import { bilingue, idioma, t } from './i18n.svelte.ts';
import { supabase } from './supabase.ts';
import { lerAoVivo } from './tempo-real.ts';

export type StatusNota = 'pendente' | 'em_analise' | 'aprovada' | 'rejeitada' | 'pede_ajuste';

export const STATUS_NOTA: Record<StatusNota, string> = bilingue({
	pendente: 'Na fila',
	em_analise: 'Em análise',
	aprovada: 'Aprovada',
	rejeitada: 'Rejeitada',
	pede_ajuste: 'Pede ajuste'
});

export const SELO_NOTA: Record<StatusNota, string> = {
	pendente: 'selo--info',
	em_analise: 'selo--alerta',
	aprovada: 'selo--ok',
	rejeitada: 'selo--erro',
	pede_ajuste: 'selo--alerta'
};

/** Notas esperando há mais que isto aparecem em alerta para a equipe de crise. */
// ponytail: um limite fixo; vira regra do comitê se a organização quiser ajustar.
export const ESPERA_MAXIMA_MIN = 10;

const PRONTAS = [
	'Recebido. A crise está analisando a sua ação.',
	'Aprovada. Os efeitos aparecem na próxima atualização de crise.',
	'Rejeitada: a ação não é plausível para a sua delegação neste momento.',
	'Precisamos de mais detalhes: quem executa, onde, quando e com quais recursos?'
];

export const esperando = (status: string) => status === 'pendente' || status === 'em_analise';

/** Minutos desde `desde` (arredondados para baixo, nunca negativos). */
export const minutosDesde = (desde: string, agoraMs: number) =>
	Math.max(0, Math.floor((agoraMs - Date.parse(desde)) / 60_000));

/** Respostas prontas da equipe de crise, no idioma da interface. */
export const respostasProntas = () => PRONTAS.map((r) => t(r));

export const formatarEspera = (min: number) =>
	idioma.atual === 'en'
		? min < 1
			? 'now'
			: min < 60
				? `${min} min ago`
				: `${Math.floor(min / 60)} h ${min % 60} min ago`
		: min < 1
			? 'agora'
			: min < 60
				? `há ${min} min`
				: `há ${Math.floor(min / 60)} h ${min % 60} min`;

type NotaNaFila = { status: string; criado_em: string };

/** A fila da equipe: as que esperam primeiro (da mais antiga), depois as respondidas (da mais nova). */
export function ordenarFila<T extends NotaNaFila>(notas: T[]): T[] {
	const espera = notas.filter((n) => esperando(n.status)).sort((a, b) => a.criado_em.localeCompare(b.criado_em));
	const feitas = notas.filter((n) => !esperando(n.status)).sort((a, b) => b.criado_em.localeCompare(a.criado_em));
	return [...espera, ...feitas];
}

/** Contador do topo: quantas esperam e há quanto tempo espera a mais antiga. */
export function resumoDaFila(notas: NotaNaFila[], agoraMs: number) {
	const espera = notas.filter((n) => n.status === 'pendente');
	const maisAntiga = espera.reduce<string | null>((m, n) => (!m || n.criado_em < m ? n.criado_em : m), null);
	const min = maisAntiga ? minutosDesde(maisAntiga, agoraMs) : 0;
	return { pendentes: espera.length, esperaMin: min, alerta: min >= ESPERA_MAXIMA_MIN };
}

// Passo 35: crise com prazo.

export type Efeito = { delegacao_id: string; texto: string; ate: string | null; delegacao: { nome: string } | null };
export type Incidente = {
	id: string;
	titulo: string;
	texto: string;
	prazo: string;
	desfecho: string | null;
	desfecho_texto: string | null;
	encerrado_em: string | null;
	efeitos: Efeito[];
};

/** O desfecho fica na tela por este tempo depois do fim. */
export const DESFECHO_MS = 60_000;

/** As crises do comitê em andamento, e as que acabaram há menos de um minuto (o desfecho). */
export async function carregarIncidentes(comiteId: string, agoraMs = Date.now()): Promise<Incidente[]> {
	const { data, error } = await lerAoVivo(`incidentes:${comiteId}`, ['incidente_comite', 'incidente_efeito'], () =>
		supabase
			.from('incidente_comite')
			.select(
				'incidente:incidente_crise(id, titulo, texto, prazo, desfecho, desfecho_texto, encerrado_em, efeitos:incidente_efeito(delegacao_id, texto, ate, delegacao(nome)))'
			)
			.eq('comite_id', comiteId)
	);
	if (error) throw error;
	return (data ?? [])
		.map((c) => c.incidente as Incidente | null)
		.filter((i): i is Incidente => !!i && (!i.encerrado_em || agoraMs - Date.parse(i.encerrado_em) < DESFECHO_MS))
		.sort((a, b) => Date.parse(a.prazo) - Date.parse(b.prazo));
}

/** Segundos até o prazo (0 quando passou). */
export const segundosAtePrazo = (prazo: string, agoraMs: number) => Math.max(0, Math.ceil((Date.parse(prazo) - agoraMs) / 1000));

/** O motivo de a delegação estar sem voz agora, ou null. */
export function semVoz(incidentes: Incidente[], delegacao: string | null | undefined, agoraMs: number) {
	if (!delegacao) return null;
	for (const i of incidentes) {
		if (i.encerrado_em) continue;
		const e = i.efeitos.find((x) => x.delegacao_id === delegacao && (!x.ate || Date.parse(x.ate) > agoraMs));
		if (e) return e.texto;
	}
	return null;
}
