import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:avisos');
	const { usuario, participacoes } = await parent();

	const [avisos, comites, pessoa] = await Promise.all([
		supabase.from('aviso').select('id, texto, criado_em, comite_id, autor_id').order('criado_em', { ascending: false }),
		supabase.from('comite').select('id, sigla').order('sigla'),
		supabase.from('pessoa').select('avisos_vistos_em').eq('id', usuario!.id).single()
	]);
	if (avisos.error) throw avisos.error;
	if (comites.error) throw comites.error;
	if (pessoa.error) throw pessoa.error;

	const secretaria = participacoes.find((p) => p.papel === 'secretaria');
	const comitesDaMesa = participacoes.filter((p) => p.papel === 'mesa').map((p) => p.comite_id);
	// Para onde a pessoa pode publicar: secretaria em qualquer lugar; mesa no próprio comitê.
	const destinos = secretaria
		? [{ id: '', rotulo: 'Todos' }, ...comites.data.map((c) => ({ id: c.id, rotulo: c.sigla }))]
		: comites.data.filter((c) => comitesDaMesa.includes(c.id)).map((c) => ({ id: c.id, rotulo: c.sigla }));

	return {
		avisos: avisos.data,
		comites: comites.data,
		vistosEm: pessoa.data.avisos_vistos_em,
		evento: participacoes[0]?.evento_id ?? null,
		secretaria: !!secretaria,
		destinos
	};
};
