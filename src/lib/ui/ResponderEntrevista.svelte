<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import Modal from './Modal.svelte';

	// Passo 47: aceitar (escolhendo o horário) ou recusar um pedido de entrevista num modal
	// curto, nas mensagens e no "Precisa de você" da Agora.
	type Props = {
		entrevista: { id: string; tema: string; veiculo: { nome: string } | null };
		onfeito: (mensagem: string) => void;
	};
	let { entrevista, onfeito }: Props = $props();
	let modal = $state<Modal>();
	let horario = $state('');
	let erro = $state('');
	const id = $props.id();
	const veiculo = $derived(entrevista.veiculo?.nome ?? t('Press'));

	async function responder(aceitar: boolean) {
		erro = '';
		const { error } = await supabase.rpc('responder_entrevista', {
			p_entrevista: entrevista.id,
			p_aceitar: aceitar,
			p_horario: aceitar ? new Date(horario).toISOString() : undefined
		});
		if (error) {
			erro = mensagemDeErro(error);
			return;
		}
		modal?.fechar();
		onfeito(aceitar ? t('Entrevista aceita.') : t('Entrevista recusada.'));
	}
</script>

<button class="botao botao--pequeno" type="button" aria-label={`${t('Responder')}: ${veiculo}, ${entrevista.tema}`} onclick={() => modal?.abrir()}
	>{t('Responder')}</button
>
<Modal bind:this={modal} rotulo={id}>
	<h3 {id}>{t('Pedido de entrevista de {veiculo}', { veiculo })}</h3>
	<p>{entrevista.tema}</p>
	<label class="campo">
		{t('Horário')}
		<input type="datetime-local" bind:value={horario} />
	</label>
	{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
	<div class="acoes">
		<button class="botao" type="button" disabled={!horario} onclick={() => responder(true)}>{t('Aceitar')}</button>
		<button class="botao botao--secundario" type="button" onclick={() => responder(false)}>{t('Recusar')}</button>
		<button class="botao botao--secundario" type="button" onclick={() => modal?.fechar()}>{t('Cancelar')}</button>
	</div>
</Modal>
