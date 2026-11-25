<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import Hand from '@lucide/svelte/icons/hand';
	import { invalidate } from '$app/navigation';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';

	// A placa da delegação: levantar e baixar, com a posição na fila (passo 32: a
	// Sessão e o Agora usam o mesmo botão). Erros sobem por `onerro`.
	// `compacto` (Agora, passo 51): sem o nome grande da placa, só o botão e a posição.
	type Props = { comiteId: string; posicao: number; nome: string; compacto?: boolean; onerro?: (mensagem: string) => void };
	let { comiteId, posicao, nome, compacto = false, onerro }: Props = $props();

	async function acao(funcao: 'levantar_placa' | 'baixar_placa') {
		const { error } = await supabase.rpc(funcao, { p_comite: comiteId });
		if (error) onerro?.(mensagemDeErro(error));
		await invalidate('app:sessao-ao-vivo');
	}
</script>

{#if !compacto}<p class="placa-nome" class:placa-nome--levantada={posicao >= 0}>{nome}</p>{/if}
{#if posicao >= 0}
	<p class={compacto ? undefined : 'destaque'}><strong>{t('Placa levantada')}</strong></p>
	<button class="botao botao--grande" type="button" aria-pressed="true" onclick={() => acao('baixar_placa')}>
		<Hand aria-hidden="true" size={20} /> {t('Baixar placa')}
	</button>
{:else}
	<button class="botao botao--grande" type="button" aria-pressed="false" onclick={() => acao('levantar_placa')}>
		<Hand aria-hidden="true" size={20} /> {t('Levantar placa')}
	</button>
{/if}
