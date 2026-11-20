import type { Papel } from './supabase.ts';

export const PAPEIS: { valor: Papel; rotulo: string }[] = [
	{ valor: 'delegado', rotulo: 'Delegado' },
	{ valor: 'mesa', rotulo: 'Mesa' },
	{ valor: 'crise', rotulo: 'Crise' },
	{ valor: 'press', rotulo: 'Press' },
	{ valor: 'diretoria_press', rotulo: 'Diretoria da Press' },
	{ valor: 'secretaria', rotulo: 'Secretaria' }
];

export const rotuloPapel = (papel: Papel | null | undefined) => PAPEIS.find((p) => p.valor === papel)?.rotulo ?? '';
