<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { contador } from '#lib/contador.ts';
	import { bilingue, t } from '#lib/i18n.svelte.ts';
	import { invalidate } from '$app/navigation';
	import { formatarQuando } from '#lib/cronograma.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Escolha from '#lib/ui/Escolha.svelte';
	import AcaoEmModal from '#lib/ui/AcaoEmModal.svelte';
	import Mic from '@lucide/svelte/icons/mic';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let pedido = $state<AcaoEmModal>();
	const agora = new Date();
	let delegacao = $state('');
	let tema = $state('');
	let erro = $state('');
	let mensagem = $state('');

	const SITUACAO: Record<string, string> = bilingue({ pedida: 'Esperando a delegação', aceita: 'Aceita', recusada: 'Recusada' });

	async function pedir(evento: SubmitEvent) {
		evento.preventDefault();
		erro = mensagem = '';
		const { error } = await supabase.rpc('pedir_entrevista', { p_delegacao: delegacao, p_tema: tema });
		if (error) erro = mensagemDeErro(error);
		else {
			mensagem = t('Pedido enviado à delegação.');
			tema = '';
			pedido?.fechar();
		}
		await invalidate('app:entrevistas');
	}
</script>

<svelte:head>
	<title>{tituloDaAba(t('Entrevistas'), t('Press'))}</title>
</svelte:head>

<p class="rotulo">
	{t('Press · Simulação')}
	<AoVivo comiteId={data.comites[0]} tabelas={['entrevista']} dependencia="app:entrevistas" />
</p>
<h1>{t('Entrevistas')}</h1>
<p class="suave">{t('Peça pelo app; a delegação aceita e escolhe o horário.')}</p>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

<div class="acoes">
	<AcaoEmModal bind:this={pedido} rotulo={t('Pedir entrevista')} icone={Mic} descricao={t('A delegação recebe o pedido e escolhe o horário.')}>
		<form class="formulario" aria-label={t('Pedir entrevista')} onsubmit={pedir}>
			<Escolha unica rotulo={t('Delegação')} botao={t('Escolher')} opcoes={data.delegacoes} bind:valor={delegacao} />
			<label class="campo">
				{t('Tema')}
				<input required maxlength="300" bind:value={tema} {@attach contador(tema)} />
			</label>
			{#if erro}<p class="erro">{erro}</p>{/if}
			<div class="acoes">
				<button class="botao">{t('Pedir entrevista')}</button>
				<button class="botao botao--secundario" type="button" onclick={() => pedido?.fechar()}>{t('Cancelar')}</button>
			</div>
		</form>
	</AcaoEmModal>
</div>

<section aria-labelledby="t-pedidos">
	<h2 id="t-pedidos">{t('Pedidos')}</h2>
	<ul class="lista">
		{#each data.entrevistas as e (e.id)}
			<li>
				<span>
					<strong>{e.delegacao?.nome}</strong>: {e.tema}
					<span class="detalhe">
						{SITUACAO[e.status]}{e.status === 'aceita' && e.horario ? `, ${formatarQuando(e.horario, agora)}` : ''}
					</span>
				</span>
			</li>
		{:else}
			<li class="suave">{t('Nenhum pedido ainda.')}</li>
		{/each}
	</ul>
</section>
