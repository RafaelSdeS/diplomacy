<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { t } from '#lib/i18n.svelte.ts';
	import { anotacao } from '#lib/ficha.svelte.ts';
	import { caixa, mensagemDoEnvio } from '#lib/caixa.ts';
	import { contador } from '#lib/contador.ts';
	import { guardarRascunho, lerRascunho } from '#lib/rascunho.ts';
	import { supabase } from '#lib/supabase.ts';
	import Escolha from './Escolha.svelte';
	import Modal from './Modal.svelte';

	// Passo 51 (lote 0): o caderno sem ir à aba Caderno. A delegação vem preenchida quando
	// a pessoa anota a partir da ficha ou da página dela; o texto fica salvo no aparelho.
	type Participacao = { papel: string; comite_id: string | null; comite_sigla: string | null; delegacao_id: string | null };
	let { participacoes }: { participacoes: Participacao[] } = $props();
	const eu = $derived(participacoes.find((p) => p.papel === 'delegado' && p.comite_id));

	let modal = $state<Modal>();
	let delegacoes = $state<{ id: string; nome: string; nome_oficial: string; bandeira: string | null }[]>([]);
	let sobre = $state('');
	let texto = $state('');
	let erro = $state('');
	let enviando = $state(false);
	const RASCUNHO = 'anotacao';

	$effect(() => {
		if (!anotacao.aberta || !modal || !eu?.comite_id) return;
		sobre = anotacao.sobre;
		texto = lerRascunho(RASCUNHO);
		erro = '';
		modal.abrir();
		void supabase
			.from('delegacao')
			.select('id, nome, nome_oficial, bandeira')
			.eq('comite_id', eu.comite_id)
			.order('nome')
			.then(({ data }) => (delegacoes = (data ?? []).filter((d) => d.id !== eu.delegacao_id)));
	});
	$effect(() => guardarRascunho(RASCUNHO, texto));

	async function salvar(evento: SubmitEvent) {
		evento.preventDefault();
		if (!eu?.comite_id) return;
		erro = '';
		enviando = true;
		const id = crypto.randomUUID();
		const resultado = await caixa.enviar({
			id,
			rpc: 'salvar_anotacao',
			args: { p_id: id, p_comite: eu.comite_id, p_tipo: sobre ? 'sobre' : 'nota', p_texto: texto, p_sobre: sobre || undefined },
			rotulo: t('Anotação')
		});
		enviando = false;
		const r = mensagemDoEnvio(resultado, t('Anotado no caderno.'));
		if (r.erro) {
			erro = r.erro;
			return;
		}
		texto = '';
		modal?.fechar();
		await invalidate('app:caderno');
	}
</script>

<Modal bind:this={modal} rotulo="anotar-titulo" classe="modal-acao" onclose={() => (anotacao.aberta = false)}>
	<h3 id="anotar-titulo">{t('Anotar no caderno')}</h3>
	<p class="suave">{t('Só a sua delegação lê o que anotar aqui.')}</p>
	<form class="formulario" onsubmit={salvar}>
		<Escolha unica rotulo={t('Sobre a delegação (opcional)')} botao={t('Escolher')} opcoes={delegacoes} bind:valor={sobre} />
		<label class="campo">
			{t('Anotação')}
			<textarea required rows="4" maxlength="4000" bind:value={texto} {@attach contador(texto)}></textarea>
		</label>
		{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
		<div class="acoes">
			<button class="botao" disabled={enviando}>{t('Guardar no caderno')}</button>
			<button class="botao botao--secundario" type="button" onclick={() => modal?.fechar()}>{t('Cancelar')}</button>
		</div>
	</form>
</Modal>
