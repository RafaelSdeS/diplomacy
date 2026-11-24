import { invalidate } from '$app/navigation';
import { esquecerConta } from './conta.ts';
import { idioma, type Idioma } from './i18n.svelte.ts';
import { supabase } from './supabase.ts';

// Passo 47: tema, idioma e saída, iguais no cabeçalho, no "Mais" do celular e no perfil.

/** O tema escolhido neste aparelho ('' segue o sistema). */
export const tema = $state({ escolhido: typeof document === 'undefined' ? '' : (document.documentElement.dataset.theme ?? '') });

/** Vale na hora e fica guardado no aparelho (passo 38). */
export function definirTema(novo: string) {
	tema.escolhido = novo;
	if (novo) document.documentElement.dataset.theme = novo;
	else delete document.documentElement.dataset.theme;
	try {
		if (novo) localStorage.setItem('tema', novo);
		else localStorage.removeItem('tema');
	} catch {
		// sem armazenamento: o tema vale até fechar o app
	}
}

/** O tema que aparece agora: o escolhido ou o do sistema. */
export const temaAtual = () => tema.escolhido || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
export const alternarTema = () => definirTema(temaAtual() === 'dark' ? 'light' : 'dark');

/** O botão de idioma fala na língua para onde leva (quem não lê a atual acha o caminho). */
export const TROCAR_IDIOMA = { pt: 'Mudar o app para português', en: 'Switch the app to English' };

/** Troca o app entre português e inglês, salvo no perfil (vale em todo aparelho). */
export async function alternarIdioma(usuario: string) {
	const novo: Idioma = idioma.atual === 'en' ? 'pt' : 'en';
	const { error } = await supabase.from('pessoa').update({ idioma: novo }).eq('id', usuario);
	if (error) return false;
	esquecerConta();
	await invalidate('app:sessao');
	return true;
}

/** "Sair" no "Mais" do celular: o layout abre a mesma confirmação do cabeçalho. */
export const saida = $state({ pedida: 0 });
export const pedirSaida = () => saida.pedida++;
