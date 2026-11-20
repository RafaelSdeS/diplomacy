// Lógica do cronograma, sem dependências: testada em cronograma.test.ts.
// Todos os horários aparecem no fuso do evento, qualquer que seja o do aparelho.

export const FUSO = 'America/Sao_Paulo';

export type ItemCronograma = {
	id: string;
	titulo: string;
	local: string | null;
	inicio: string;
	fim: string;
	comite_id: string | null;
};

const ms = (iso: string) => new Date(iso).getTime();

/** Itens que estão acontecendo: começo incluído, fim excluído. */
export function itensAtuais<T extends ItemCronograma>(itens: T[], agora: Date): T[] {
	const t = agora.getTime();
	return itens.filter((i) => ms(i.inicio) <= t && t < ms(i.fim));
}

/** O próximo item a começar depois de agora. */
export function proximoItem<T extends ItemCronograma>(itens: T[], agora: Date): T | undefined {
	const t = agora.getTime();
	return itens.filter((i) => ms(i.inicio) > t).sort((a, b) => ms(a.inicio) - ms(b.inicio))[0];
}

const chaveDoDia = (iso: string) =>
	new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
		new Date(iso)
	);

export const formatarHora = (iso: string) =>
	new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export const formatarDia = (iso: string) =>
	new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, weekday: 'long', day: 'numeric', month: 'long' }).format(
		new Date(iso)
	);

/** "às 12:30" no mesmo dia; senão "quinta-feira, 11 de novembro, às 09:00". */
export function formatarQuando(iso: string, agora: Date): string {
	const hora = `às ${formatarHora(iso)}`;
	return chaveDoDia(iso) === chaveDoDia(agora.toISOString()) ? hora : `${formatarDia(iso)}, ${hora}`;
}

/** Itens em ordem, agrupados pelo dia do evento. */
export function agruparPorDia<T extends ItemCronograma>(itens: T[]): { chave: string; rotulo: string; itens: T[] }[] {
	const grupos = new Map<string, T[]>();
	for (const item of [...itens].sort((a, b) => ms(a.inicio) - ms(b.inicio))) {
		const chave = chaveDoDia(item.inicio);
		grupos.set(chave, [...(grupos.get(chave) ?? []), item]);
	}
	return [...grupos].map(([chave, doDia]) => ({ chave, rotulo: formatarDia(doDia[0].inicio), itens: doDia }));
}
