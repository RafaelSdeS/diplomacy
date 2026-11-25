import { t } from './i18n.svelte.ts';
import { ETAPAS, etapaAtual, oQueFazer, ROTULO_ETAPA, type Doc } from './ordem.ts';

// Passo 61: em que momento o comitê está, do começo ao fim, e o que fazer agora e depois,
// por papel. A plenária de abertura (briefing → discursos → moção do tópico) vem antes da
// ordem de cada tópico (agenda → working papers → projeto → resolução).
export type Papel = 'mesa' | 'presidencia' | 'delegacao' | 'outro';
export type Estado = {
	fase: string;
	etapa_plenaria: string | null;
	topico_atual: number | null;
};
export type Momento = { passo: 'plenaria' | 'topico' | 'acao'; agora: string; depois: string };

export function momentoDoComite(estado: Estado | null, papel: Papel, topico?: { adotada: boolean; documentos: Doc[] }): Momento {
	const mesa = papel === 'mesa';
	if (!estado || estado.fase === 'plenaria') {
		const etapa = estado?.etapa_plenaria ?? 'briefing';
		if (etapa === 'briefing')
			return {
				passo: 'plenaria',
				agora: mesa
					? t('Briefing: apresente os tópicos e responda às perguntas; depois, comece os discursos no Painel.')
					: t('Briefing: a mesa apresenta os tópicos e responde às perguntas.'),
				depois: t('Discursos de abertura, um por delegação.')
			};
		if (etapa === 'discursos')
			return {
				passo: 'plenaria',
				agora: mesa
					? t('Discursos de abertura: dê a palavra a cada delegação da lista; depois, passe à moção do tópico.')
					: t('Discursos de abertura: todas as delegações falam, em ordem alfabética.'),
				depois: t('Uma delegação propõe qual tópico abre o debate, e a sala vota.')
			};
		return {
			passo: 'plenaria',
			agora: mesa
				? t('Moção do tópico: espere a moção de uma delegação em "Pontos e moções" e abra a votação.')
				: t('Proponha qual tópico abre o debate: "Fazer um ponto ou moção" → "Moção de introdução do tópico no topo".'),
			depois: t('Aprovada a moção, começa o debate do tópico, pela agenda.')
		};
	}
	if (estado.fase === 'acao')
		return {
			passo: 'acao',
			agora: mesa ? t('Fase de ação: conduza as emendas e a votação do projeto.') : t('Fase de ação: a mesa conduz as emendas e a votação do projeto.'),
			depois: t('Aprovada a resolução, o comitê passa ao próximo tópico.')
		};
	const atual = etapaAtual({ adotada: topico?.adotada ?? false, documentos: topico?.documentos ?? [] });
	const seguinte = atual === 'encerrado' ? null : ETAPAS[ETAPAS.indexOf(atual) + 1];
	return {
		passo: 'topico',
		agora:
			papel === 'presidencia'
				? t('Conduza o debate: escolha os próximos entre as placas e decida os pontos e moções.')
				: oQueFazer(atual, mesa),
		depois: seguinte ? ROTULO_ETAPA()[seguinte] : t('O próximo tópico.')
	};
}
