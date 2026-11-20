import { supabase, type Participacao } from './supabase.ts';

// As participações e o nome de quem está logado, guardados em memória: o layout raiz
// roda a cada troca de tela e não precisa consultá-los de novo. Recarregam quando a
// conta muda, ao sair, ou quando alguém pede (esquecerConta, depois de editar o perfil).
let guardado: { usuario: string; participacoes: Participacao[]; nome: string } | null = null;

export function esquecerConta() {
	guardado = null;
}

export async function carregarConta(usuario: { id: string; email?: string }) {
	if (guardado?.usuario === usuario.id) return guardado;
	const [resposta, pessoa] = await Promise.all([
		supabase.from('minhas_participacoes').select('*'),
		supabase.from('pessoa').select('nome').eq('id', usuario.id).maybeSingle()
	]);
	if (resposta.error) throw resposta.error;
	if (pessoa.error) throw pessoa.error;
	guardado = { usuario: usuario.id, participacoes: resposta.data, nome: pessoa.data?.nome ?? usuario.email ?? '' };
	return guardado;
}
