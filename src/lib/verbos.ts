// Verbos para começar cláusulas, do guia de vocabulário (inglês) e da tradução
// (português). Sugeridos a partir das primeiras letras.

const VERBOS = {
	pt: {
		preambular: [
			'Acolhendo', 'Afirmando', 'Alarmado', 'Ciente', 'Considerando', 'Convencido', 'Destacando', 'Enfatizando',
			'Expressando', 'Guiado por', 'Lamentando', 'Lembrando', 'Levando em conta', 'Notando', 'Observando',
			'Preocupado', 'Profundamente preocupado', 'Reafirmando', 'Reconhecendo', 'Recordando', 'Ressaltando',
			'Tendo em mente', 'Tendo considerado'
		],
		operativa: [
			'Acolhe', 'Afirma', 'Apoia', 'Aprova', 'Autoriza', 'Chama a atenção', 'Conclama', 'Condena', 'Convida',
			'Decide', 'Declara', 'Encoraja', 'Endossa', 'Exige', 'Expressa', 'Insta', 'Lamenta', 'Pede', 'Reafirma',
			'Recomenda', 'Reconhece', 'Recorda', 'Solicita', 'Urge'
		]
	},
	en: {
		preambular: [
			'Acknowledging', 'Affirming', 'Alarmed by', 'Aware of', 'Bearing in mind', 'Concerned', 'Convinced',
			'Deeply concerned', 'Emphasizing', 'Expressing', 'Fully aware', 'Guided by', 'Having considered', 'Noting',
			'Observing', 'Reaffirming', 'Recalling', 'Recognizing', 'Stressing', 'Welcoming'
		],
		operativa: [
			'Accepts', 'Affirms', 'Approves', 'Authorizes', 'Calls upon', 'Condemns', 'Decides', 'Declares', 'Demands',
			'Encourages', 'Endorses', 'Expresses', 'Invites', 'Recommends', 'Reminds', 'Requests', 'Strongly condemns',
			'Supports', 'Urges', 'Welcomes'
		]
	}
} as const;

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Até `limite` verbos que começam com o que foi digitado (sem diferenciar acento nem maiúscula). */
export function sugerirVerbos(inicio: string, tipo: string, idioma: string, limite = 6): string[] {
	const busca = semAcento(inicio.trimStart());
	if (!busca || (tipo !== 'preambular' && tipo !== 'operativa' && tipo !== 'subitem')) return [];
	const lista = VERBOS[idioma === 'en' ? 'en' : 'pt'][tipo === 'preambular' ? 'preambular' : 'operativa'];
	return lista.filter((v) => semAcento(v).startsWith(busca) && semAcento(v) !== busca).slice(0, limite);
}
