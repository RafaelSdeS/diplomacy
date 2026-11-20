import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { usuario } = await parent();
	const pessoa = await supabase.from('pessoa').select('nome, bio, foto_path').eq('id', usuario!.id).single();
	if (pessoa.error) throw pessoa.error;

	let fotoUrl: string | null = null;
	if (pessoa.data.foto_path) {
		const assinada = await supabase.storage.from('fotos').createSignedUrl(pessoa.data.foto_path, 3600);
		fotoUrl = assinada.data?.signedUrl ?? null;
	}
	return { pessoa: pessoa.data, fotoUrl };
};
