import type { Idioma } from './i18n.svelte.ts';
import { supabase, type Participacao } from './supabase.ts';

// As participações e o nome de quem está logado, guardados em memória: o layout raiz
// roda a cada troca de tela e não precisa consultá-los de novo. Recarregam quando a
// conta muda, ao sair, ou quando alguém pede (esquecerConta, depois de editar o perfil).
let guardado: { usuario: string; participacoes: Participacao[]; nome: string; idioma: Idioma } | null = null;

export function esquecerConta() {
	guardado = null;
}

export async function carregarConta(usuario: { id: string; email?: string }) {
	if (guardado?.usuario === usuario.id) return guardado;
	const [resposta, pessoa] = await Promise.all([
		supabase.from('minhas_participacoes').select('*'),
		supabase.from('pessoa').select('nome, idioma').eq('id', usuario.id).maybeSingle()
	]);
	if (resposta.error) throw resposta.error;
	if (pessoa.error) throw pessoa.error;
	// O idioma da interface: o escolhido no perfil; senão, o do primeiro comitê da pessoa.
	let idioma = pessoa.data?.idioma as Idioma | null;
	const comite = resposta.data.find((p) => p.comite_id)?.comite_id;
	if (!idioma && comite) {
		const c = await supabase.from('comite').select('idioma').eq('id', comite).maybeSingle();
		idioma = c.data?.idioma === 'en' ? 'en' : 'pt';
	}
	guardado = {
		usuario: usuario.id,
		participacoes: resposta.data,
		nome: pessoa.data?.nome ?? usuario.email ?? '',
		idioma: idioma ?? 'pt'
	};
	return guardado;
}
