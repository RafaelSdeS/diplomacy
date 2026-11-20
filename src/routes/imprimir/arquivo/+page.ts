import { eventoDaSecretaria } from '#lib/secretaria.ts';
import { supabase } from '#lib/supabase.ts';
import type { PageLoad } from './$types';

type Arquivo = {
	evento: { nome: string; ano: number };
	comites: {
		sigla: string;
		nome: string;
		nome_oficial: string;
		topicos: string[];
		agenda: { texto: string; ordem: number }[] | null;
		resolucoes: { tipo: string; numero: number | null; titulo: string; clausulas: { tipo: string; texto: string }[] | null }[] | null;
		noticias: { titulo: string; linha_fina: string | null; texto: string; publicada_em: string }[] | null;
	}[];
	atualizacoes_de_crise: { texto: string; publicada_em: string }[];
};

export const load: PageLoad = async ({ parent }) => {
	const evento = eventoDaSecretaria((await parent()).participacoes);
	const { data, error } = await supabase.rpc('arquivo_publico', { p_evento: evento });
	if (error) throw error;
	return { arquivo: data as unknown as Arquivo };
};
