// Passo 46: a nota rápida e o rascunho da próxima fala, sempre à vista na sessão. A nota
// guarda o contexto de quando começou a ser escrita (tópico, quem falava e a hora), e
// "Sobre esta delegação" vale para quem estava com a palavra nesse momento.

export type TipoNota = 'nota' | 'sobre' | 'fala';
export type Contexto = { topico: number | null; orador: { id: string; nome: string } | null; hora: string };

type Estado = { topico_atual: number | null; orador: { id: string; nome: string } | null } | null | undefined;

/** O contexto da sessão neste instante. */
export const contextoAgora = (estado: Estado, agora = new Date()): Contexto => ({
	topico: estado?.topico_atual ?? null,
	orador: estado?.orador ? { id: estado.orador.id, nome: estado.orador.nome } : null,
	hora: agora.toISOString()
});

/** Os argumentos de salvar_anotacao (a hora fica com o banco, em criado_em). */
export function argsDaNota(id: string, comite: string, tipo: TipoNota, texto: string, contexto: Contexto) {
	return {
		p_id: id,
		p_comite: comite,
		p_tipo: tipo,
		p_texto: texto.trim(),
		p_topico: contexto.topico ?? undefined,
		p_orador: contexto.orador?.id,
		p_sobre: tipo === 'sobre' ? contexto.orador?.id : undefined
	};
}
