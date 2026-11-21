import { t } from './i18n.svelte.ts';
import type { Papel } from './supabase.ts';

const papel = (valor: Papel, rotulo: string) => ({
	valor,
	get rotulo() {
		return t(rotulo);
	}
});

export const PAPEIS: { valor: Papel; rotulo: string }[] = [
	papel('delegado', 'Delegado'),
	papel('mesa', 'Mesa'),
	papel('crise', 'Crise'),
	papel('press', 'Press'),
	papel('diretoria_press', 'Diretoria da Press'),
	papel('secretaria', 'Secretaria')
];

export const rotuloPapel = (papel: Papel | null | undefined) => PAPEIS.find((p) => p.valor === papel)?.rotulo ?? '';

// Passo 32: o papel que monta o Agora e o menu, quando a pessoa tem mais de um.
const PRIORIDADE: Papel[] = ['secretaria', 'diretoria_press', 'mesa', 'crise', 'press', 'delegado'];
export const papelPrincipal = (participacoes: { papel: Papel }[]): Papel | null =>
	PRIORIDADE.find((p) => participacoes.some((x) => x.papel === p)) ?? null;
