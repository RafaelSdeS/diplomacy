import { comitePorSigla } from '#lib/sessao.ts';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ params }) => ({ comite: await comitePorSigla(params.sigla) });
