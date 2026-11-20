// Regras de procedimento de um comitê, como o banco devolve em `regras(comite)`:
// guia, padrão do evento e ajustes do comitê já juntos (todas as chaves presentes).
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
	press_revisao: boolean;
};

export type RegraLegivel = { grupo: string; rotulo: string; texto: string };

const lista = new Intl.ListFormat('pt-BR', { type: 'conjunction' });
const fracao = ([a, b]: [number, number]) => `${a}/${b}`;
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function votacao(r: Regras) {
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

/** Cada regra como texto para pessoas, na ordem em que aparece na tela. */
export function regrasLegiveis(r: Regras): RegraLegivel[] {
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
		{ grupo: 'Comunicação', rotulo: 'Bilhetes', texto: r.mesa_le_bilhetes ? 'a mesa pode ler' : 'só quem envia e quem recebe leem' },
		{ grupo: 'Comunicação', rotulo: 'Press', texto: r.press_revisao ? 'notícias revisadas pela Diretoria da Press' : 'publica sem revisão prévia' }
	];
}
