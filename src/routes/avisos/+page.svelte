<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import Quando from '#lib/ui/Quando.svelte';
	import { contador } from '#lib/contador.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { onMount, untrack } from 'svelte';
	import { invalidate } from '$app/navigation';
	import Bell from '@lucide/svelte/icons/bell';
	import { pedirNotificacao } from '#lib/push.ts';
	import { supabase } from '#lib/supabase.ts';
	import AcaoEmModal from '#lib/ui/AcaoEmModal.svelte';
	import { dica } from '#lib/dica.ts';
	import Megaphone from '@lucide/svelte/icons/megaphone';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let novoAviso = $state<AcaoEmModal>();

	// "Novo" vale para esta visita: guarda quando a pessoa tinha visto antes de abrir.
	const vistosAntes = untrack(() => (data.vistosEm ? new Date(data.vistosEm) : null));
	const ehNovo = (criadoEm: string) => !vistosAntes || new Date(criadoEm) > vistosAntes;
	onMount(() => {
		void supabase.rpc('marcar_avisos_vistos');
	});

	const destinoDe = (id: string | null) =>
		id ? t('Para o {sigla}', { sigla: data.comites.find((c) => c.id === id)?.sigla ?? t('comitê') }) : t('Para todos');
	const podeRemover = (autorId: string | null) => data.secretaria || autorId === data.usuario?.id;

	let texto = $state('');
	let destino = $state(untrack(() => data.destinos[0]?.id ?? ''));
	let erro = $state('');

	async function publicar(evento: SubmitEvent) {
		evento.preventDefault();
		erro = '';
		const { data: aviso, error } = await supabase
			.from('aviso')
			.insert({ evento_id: data.evento!, comite_id: destino || null, texto: texto.trim() })
			.select('id')
			.single();
		if (error) {
			erro = t('Não foi possível publicar o aviso.');
			return;
		}
		pedirNotificacao('aviso', [aviso.id]);
		texto = '';
		novoAviso?.fechar();
		await invalidate('app:avisos');
	}

	async function remover(id: string) {
		erro = '';
		const { error } = await supabase.from('aviso').delete().eq('id', id);
		if (error) {
			erro = t('Não foi possível remover o aviso.');
			return;
		}
		await invalidate('app:avisos');
	}
</script>

<svelte:head>
	<title>{tituloDaAba(t('Avisos'))}</title>
</svelte:head>

<p class="rotulo">{t('Evento')}</p>
<h1>{t('Avisos')}</h1>

{#if data.destinos.length > 0}
	<div class="acoes">
		<AcaoEmModal bind:this={novoAviso} rotulo={t('Novo aviso')} icone={Megaphone} descricao={t('O aviso aparece na Agora de quem você escolher e, para quem ativou, como notificação.')}>
			<form aria-label={t('Novo aviso')} class="formulario" onsubmit={publicar}>
				<label class="campo">
					{t('Aviso')}
					<textarea required maxlength="1000" bind:value={texto} {@attach contador(texto)}></textarea>
				</label>
				<label class="campo">
					{t('Para')}
					<select bind:value={destino}>
						{#each data.destinos as d (d.id)}
							<option value={d.id}>{d.rotulo}</option>
						{/each}
					</select>
				</label>
				{#if erro}
					<p class="erro" role="alert">{erro}</p>
				{/if}
				<div class="acoes">
					<button class="botao">{t('Publicar')}</button>
					<button class="botao botao--secundario" type="button" onclick={() => novoAviso?.fechar()}>{t('Cancelar')}</button>
				</div>
			</form>
		</AcaoEmModal>
	</div>
{/if}

<section aria-labelledby="t-avisos">
	<h2 id="t-avisos">{t('Todos os avisos')}</h2>
	<ul class="lista">
		{#each data.avisos as aviso (aviso.id)}
			<li>
				<span>
					{#if ehNovo(aviso.criado_em)}
						<span class="selo selo--info"><Bell aria-hidden="true" size={14} /> {t('Novo')}</span>
					{/if}
					{aviso.texto}
					<span class="detalhe">{destinoDe(aviso.comite_id)} · <Quando iso={aviso.criado_em} /></span>
				</span>
				{#if podeRemover(aviso.autor_id)}
					<button
						class="botao botao--secundario botao--pequeno"
						type="button"
						aria-label={`Remover o aviso "${aviso.texto.slice(0, 40)}"`}
						{@attach dica(t('Apaga este aviso para todos, na hora.'))}
						onclick={() => remover(aviso.id)}>{t('Remover')}</button
					>
				{/if}
			</li>
		{:else}
			<li class="suave">{t('Nenhum aviso ainda.')}</li>
		{/each}
	</ul>
</section>
