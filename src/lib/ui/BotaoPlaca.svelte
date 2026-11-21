<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import Hand from '@lucide/svelte/icons/hand';
	import { invalidate } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';

	// A placa da delegação: levantar e baixar, com a posição na fila (passo 32: a
	// Sessão e o Agora usam o mesmo botão). Erros sobem por `onerro`.
	type Props = { comiteId: string; posicao: number; nome: string; onerro?: (mensagem: string) => void };
	let { comiteId, posicao, nome, onerro }: Props = $props();

	async function acao(funcao: 'levantar_placa' | 'baixar_placa') {
		const { error } = await supabase.rpc(funcao, { p_comite: comiteId });
		if (error) onerro?.(mensagemDeErro(error));
		await invalidate('app:sessao-ao-vivo');
	}
</script>

{#if posicao >= 0}
	<p class="destaque">{t('Placa levantada')} · {t('{n}ª na fila', { n: posicao + 1 })}</p>
	<button class="botao botao--grande" type="button" aria-pressed="true" onclick={() => acao('baixar_placa')}>
		<Hand aria-hidden="true" size={20} /> {t('Baixar placa')}
	</button>
{:else}
	<p class="suave">{nome}</p>
	<button class="botao botao--grande" type="button" aria-pressed="false" onclick={() => acao('levantar_placa')}>
		<Hand aria-hidden="true" size={20} /> {t('Levantar placa')}
	</button>
{/if}
