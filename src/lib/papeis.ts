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
