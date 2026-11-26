<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';
	import { invalidate } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { ESCOLHAS, type Escolha } from '#lib/votacao.ts';

	// Os botões de voto da delegação, ou o voto já dado (passo 32: Sessão e Agora). Com
	// `representada`, a mesa vota pela delegação que assumiu (passo 31).
	type Props = {
		votacaoId: string;
		escolhas: Escolha[];
		meuVoto: Escolha | undefined;
		representada?: string | null;
		onerro?: (mensagem: string) => void;
	};
	let { votacaoId, escolhas, meuVoto, representada = null, onerro }: Props = $props();

	async function votar(escolha: Escolha) {
		const { error } = representada
			? await supabase.rpc('registrar_voto', { p_votacao: votacaoId, p_delegacao: representada, p_escolha: escolha })
			: await supabase.rpc('votar', { p_votacao: votacaoId, p_escolha: escolha });
		if (error) onerro?.(mensagemDeErro(error));
		await invalidate('app:sessao-ao-vivo');
	}
	const DICA: Record<Escolha, () => string> = {
		a_favor: () => t('Registra o voto da delegação a favor da proposta.'),
		contra: () => t('Registra o voto da delegação contra a proposta.'),
		abstencao: () => t('Registra que a delegação não vota nem a favor nem contra.')
	};
</script>

{#if meuVoto}
	<p>{t('Voto da sua delegação:')} <strong>{ESCOLHAS[meuVoto]}</strong></p>
{:else if escolhas.length}
	<div class="acoes">
		{#each escolhas as escolha (escolha)}
			<button class="botao botao--grande" type="button" onclick={() => votar(escolha)} {@attach dica(DICA[escolha]())}>
{ESCOLHAS[escolha]}</button>
		{/each}
	</div>
{/if}
