// Regras de procedimento de um comitê, como o banco devolve em `regras(comite)`:
// guia, padrão do evento e ajustes do comitê já juntos (todas as chaves presentes).
import { idioma } from './i18n.svelte.ts';
export type Regras = {
	quorum_fracao: [number, number];
	informal_informal_max_min: number;
	aviso_fala_seg: number;
	limite_notas_pendentes: number;
	votacao_substantiva: 'maioria_simples' | 'csnu' | 'unanimidade';
	membros_permanentes: string[];
	max_sessoes_presidencia: number;
	assinaturas_projeto_min: number;
	assinaturas_emenda: number;
	assinaturas_desconfianca_fracao: [number, number];
	reabrir_clausula_min_delegacoes: number;
	dpos_publicos: boolean;
	mesa_le_bilhetes: boolean;
	bilhetes_bloqueados?: boolean;
	press_revisao: boolean;
};

export type RegraLegivel = { grupo: string; rotulo: string; texto: string };

const lista = new Intl.ListFormat('pt-BR', { type: 'conjunction' });
const fracao = ([a, b]: [number, number]) => `${a}/${b}`;
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function votacao(r: Regras) {
	if (idioma.atual === 'en') {
		if (r.votacao_substantiva === 'unanimidade') return 'unanimity';
		if (r.votacao_substantiva === 'csnu') {
			const membros = [...r.membros_permanentes].sort((a, b) => a.localeCompare(b, 'en'));
			return `9 votes in favour and no vote against from a permanent member${membros.length ? ` (${listaEn.format(membros)})` : ''}`;
		}
		return 'simple majority (the first whole number above half of the session quorum)';
	}
	switch (r.votacao_substantiva) {
		case 'maioria_simples':
			return 'maioria simples (o primeiro número inteiro acima da metade do quórum da sessão)';
		case 'unanimidade':
			return 'unanimidade';
		case 'csnu': {
			const membros = [...r.membros_permanentes].sort((a, b) => a.localeCompare(b, 'pt-BR'));
			const quem = membros.length ? ` (${lista.format(membros)})` : '';
			return `9 votos a favor, sem voto contra de membro permanente${quem}`;
		}
	}
}

const listaEn = new Intl.ListFormat('en', { type: 'conjunction' });
const pluralEn = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** As regras em inglês (comitês em inglês). */
function regrasEmIngles(r: Regras): RegraLegivel[] {
	return [
		{ grupo: 'Session', rotulo: 'Quorum', texto: `${fracao(r.quorum_fracao)} of the expected delegations` },
		{
			grupo: 'Session',
			rotulo: 'Session chair',
			texto: `drawn delegation, at most ${pluralEn(r.max_sessoes_presidencia, 'session', 'sessions')}; the bureau chairs the opening plenary and the action phase`
		},
		{ grupo: 'Session', rotulo: 'Time warning', texto: `${pluralEn(r.aviso_fala_seg, 'second', 'seconds')} before the end of the speech` },
		{ grupo: 'Session', rotulo: 'Unmoderated caucus', texto: `up to ${pluralEn(r.informal_informal_max_min, 'minute', 'minutes')} per session` },
		{ grupo: 'Voting', rotulo: 'Substantive vote', texto: votacao(r) },
		{ grupo: 'Voting', rotulo: 'Procedural vote', texto: 'simple majority, no abstentions' },
		{ grupo: 'Voting', rotulo: 'Voting quorum', texto: 'simple majority of the expected delegations, in substantive votes' },
		{
			grupo: 'Voting',
			rotulo: 'No confidence',
			texto: `request signed by ${fracao(r.assinaturas_desconfianca_fracao)} of the expected delegations and simple majority`
		},
		{
			grupo: 'Documents',
			rotulo: 'Draft resolution',
			texto: `at least ${pluralEn(r.assinaturas_projeto_min, 'signatory', 'signatories')}; one resolution per topic`
		},
		{ grupo: 'Documents', rotulo: 'Amendment', texto: `signed by ${pluralEn(r.assinaturas_emenda, 'delegation', 'delegations')}` },
		{ grupo: 'Documents', rotulo: 'Reopen an agreed clause', texto: `requested by ${pluralEn(r.reabrir_clausula_min_delegacoes, 'delegation', 'delegations')}` },
		{ grupo: 'Documents', rotulo: 'Position papers', texto: r.dpos_publicos ? 'open to the committee' : 'only the dais reads them' },
		{ grupo: 'Communication', rotulo: 'Pending crisis notes', texto: `up to ${pluralEn(r.limite_notas_pendentes, 'note', 'notes')} per delegation` },
		{
			grupo: 'Communication',
			rotulo: 'Notes between delegations',
			texto: r.bilhetes_bloqueados ? 'blocked by the dais' : r.mesa_le_bilhetes ? 'the dais may read them' : 'only sender and recipient read them'
		},
		{ grupo: 'Communication', rotulo: 'Press', texto: r.press_revisao ? 'news reviewed by the Press Board' : 'publishes without prior review' }
	];
}

/** Cada regra como texto para pessoas, na ordem em que aparece na tela. */
export function regrasLegiveis(r: Regras): RegraLegivel[] {
	if (idioma.atual === 'en') return regrasEmIngles(r);
	return [
		{ grupo: 'Sessão', rotulo: 'Quórum', texto: `${fracao(r.quorum_fracao)} das delegações previstas` },
		{
			grupo: 'Sessão',
			rotulo: 'Presidência da sessão',
			texto: `delegação sorteada, no máximo ${plural(r.max_sessoes_presidencia, 'sessão', 'sessões')}; o bureau preside a plenária de abertura e a fase de ação`
		},
		{ grupo: 'Sessão', rotulo: 'Aviso de tempo', texto: `${plural(r.aviso_fala_seg, 'segundo', 'segundos')} antes do fim da fala` },
		{ grupo: 'Sessão', rotulo: 'Informal-informal', texto: `até ${plural(r.informal_informal_max_min, 'minuto', 'minutos')} por sessão` },
		{ grupo: 'Votações', rotulo: 'Votação substantiva', texto: votacao(r) },
		{ grupo: 'Votações', rotulo: 'Votação procedimental', texto: 'maioria simples, sem abstenção' },
		{ grupo: 'Votações', rotulo: 'Quórum de votação', texto: 'maioria simples das delegações previstas, nas votações substantivas' },
		{
			grupo: 'Votações',
			rotulo: 'Não-confiança',
			texto: `pedido assinado por ${fracao(r.assinaturas_desconfianca_fracao)} das delegações previstas e maioria simples`
		},
		{
			grupo: 'Documentos',
			rotulo: 'Projeto de resolução',
			texto: `no mínimo ${plural(r.assinaturas_projeto_min, 'signatário', 'signatários')}; uma resolução por tópico`
		},
		{ grupo: 'Documentos', rotulo: 'Emenda', texto: `assinada por ${plural(r.assinaturas_emenda, 'delegação', 'delegações')}` },
		{ grupo: 'Documentos', rotulo: 'Reabrir cláusula acordada', texto: `pedido de ${plural(r.reabrir_clausula_min_delegacoes, 'delegação', 'delegações')}` },
		{ grupo: 'Documentos', rotulo: 'DPOs', texto: r.dpos_publicos ? 'públicos para o comitê' : 'só a mesa lê' },
		{ grupo: 'Comunicação', rotulo: 'Notas de crise pendentes', texto: `até ${plural(r.limite_notas_pendentes, 'nota', 'notas')} por delegação` },
		{
			grupo: 'Comunicação',
			rotulo: 'Bilhetes',
			texto: r.bilhetes_bloqueados
				? 'bloqueados pela mesa'
				: r.mesa_le_bilhetes
					? 'a mesa pode ler'
					: 'só quem envia e quem recebe leem'
		},
		{ grupo: 'Comunicação', rotulo: 'Press', texto: r.press_revisao ? 'notícias revisadas pela Diretoria da Press' : 'publica sem revisão prévia' }
	];
}
