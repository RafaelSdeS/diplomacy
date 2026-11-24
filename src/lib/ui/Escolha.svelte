<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { semAcento } from '#lib/filtro.ts';
	import Bandeira from './Bandeira.svelte';
	import Modal from './Modal.svelte';

	// Passo 47: escolher delegações ou blocos numa lista com filtro e bandeira, no lugar de
	// dezenas de caixas soltas. As caixas são nativas (Tab e Espaço já funcionam); aqui entram
	// as setas, o Enter e o filtro. Com `botao`, a lista abre num modal e a tela mostra só o
	// resumo do que foi escolhido. Com `unica`, escolhe uma só (`valor`), e o modal fecha ao escolher.
	type Opcao = { id: string; nome: string; nome_oficial?: string | null; bandeira?: string | null; detalhe?: string; desabilitada?: boolean };
	type Props = { rotulo: string; opcoes: Opcao[]; escolhidos?: string[]; unica?: boolean; valor?: string; botao?: string };
	let { rotulo, opcoes, escolhidos = $bindable([]), unica = false, valor = $bindable(''), botao }: Props = $props();
	const grupo = $props.id();

	let busca = $state('');
	let campoBusca = $state<HTMLInputElement>();
	let lista = $state<HTMLElement>();
	let modal = $state<Modal>();
	const termo = $derived(semAcento(busca.trim()));
	// O filtro esconde (hidden) em vez de tirar da tela: o que já foi escolhido continua escolhido.
	const aparece = (o: Opcao) => !termo || semAcento(`${o.nome} ${o.nome_oficial ?? ''}`).includes(termo);
	const resumo = $derived(
		opcoes
			.filter((o) => (unica ? o.id === valor : escolhidos.includes(o.id)))
			.map((o) => o.nome)
			.join(', ')
	);

	function teclas(evento: KeyboardEvent) {
		const caixas = [...(lista?.querySelectorAll<HTMLInputElement>('li:not([hidden]) input') ?? [])];
		const i = caixas.indexOf(evento.target as HTMLInputElement);
		if (evento.key === 'Enter') {
			// Num formulário, o Enter não envia: marca a caixa (na busca, a primeira que aparece).
			evento.preventDefault();
			(i >= 0 ? caixas[i] : caixas[0])?.click();
			if (unica) modal?.fechar();
		} else if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
			evento.preventDefault();
			const proxima = evento.key === 'ArrowDown' ? Math.min(i + 1, caixas.length - 1) : i - 1;
			if (proxima >= 0) caixas[proxima]?.focus();
			else campoBusca?.focus();
		}
	}
</script>

{#snippet escolha()}
	<!-- As setas e o Enter são atalhos sobre as caixas nativas, que já funcionam com Tab e Espaço. -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<fieldset class="opcoes escolha" onkeydown={teclas}>
		<legend>{rotulo}</legend>
		{#if opcoes.length > 6}
			<label class="campo">{t('Filtrar')} <input type="search" bind:this={campoBusca} bind:value={busca} /></label>
		{/if}
		<ul class="escolha-lista" bind:this={lista}>
			{#each opcoes as o (o.id)}
				<!-- Na escolha única, o clique do mouse (com detail) já fecha; as setas e o Enter, não. -->
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
				<li hidden={!aparece(o)}>
					<label class="opcao com-bandeira" onclick={(e) => unica && e.detail > 0 && modal?.fechar()}
						>{#if unica}<input type="radio" name={grupo} value={o.id} disabled={o.desabilitada} bind:group={valor} />{:else}<input
								type="checkbox"
								value={o.id}
								bind:group={escolhidos}
							/>{/if}{#if o.bandeira !== undefined}<Bandeira codigo={o.bandeira} />{/if}
						{o.nome}{#if o.detalhe}<span class="detalhe">{o.detalhe}</span>{/if}</label
					>
				</li>
			{/each}
		</ul>
	</fieldset>
{/snippet}

{#if botao}
	<div class="escolha-resumo">
		<span class="rotulo">{rotulo}</span>
		<span class={resumo ? '' : 'suave'}>{resumo || (unica ? t('Nenhuma escolhida') : t('Ninguém escolhido'))}</span>
		<button class="botao botao--secundario botao--pequeno" type="button" aria-label={`${botao}: ${rotulo}`} onclick={() => modal?.abrir()}
			>{botao}</button
		>
	</div>
	<Modal bind:this={modal} nome={rotulo} classe="escolha-modal">
		{@render escolha()}
		<div class="acoes"><button class="botao" type="button" onclick={() => modal?.fechar()}>{t('Pronto')}</button></div>
	</Modal>
{:else}
	{@render escolha()}
{/if}
