<script lang="ts">
	import type { Snippet } from 'svelte';
	import { t } from '#lib/i18n.svelte.ts';
	import { descreverPonto, ehPonto, situacaoDoPonto, type DadosSessao } from '#lib/sessao.ts';
	import Modal from './Modal.svelte';
	import NomeDelegacao from './NomeDelegacao.svelte';

	type Ponto = NonNullable<NonNullable<DadosSessao['estado']>['sessao']>['pontos'][number];

	// Passo 47: a ficha do ponto ou moção, como a da votação (dados ao vivo da tela). As ações
	// vêm da tela, que sabe o que o papel permite: julgar, conceder, votar ou retirar.
	type Props = {
		ponto: Ponto | null | undefined;
		sigla: string;
		assinaturas?: number; // as necessárias, no voto de desconfiança
		acoes?: Snippet<[Ponto]>;
		onclose: () => void;
	};
	let { ponto, sigla, assinaturas, acoes, onclose }: Props = $props();
	const SELO: Record<string, string> = { aceito: 'selo--ok', recusado: 'selo--erro', retirado: '' };
</script>

<Modal aberto={!!ponto} lateral classe="ficha" rotulo="ficha-ponto" {onclose}>
	{#if ponto}
		<p class="rotulo">{ehPonto(ponto.tipo) ? t('Ponto') : t('Moção')}</p>
		<h3 id="ficha-ponto">{descreverPonto(ponto)}</h3>
		<p><span class="selo {SELO[ponto.status] ?? 'selo--info'}">{situacaoDoPonto(ponto)}</span></p>
		<dl class="ficha-dados">
			<dt>{t('Proposto por')}</dt>
			<dd><NomeDelegacao {sigla} delegacao={ponto.delegacao} ficha /></dd>
			{#if ponto.detalhe}
				<dt>{t('Detalhe')}</dt>
				<dd>{ponto.detalhe}</dd>
			{/if}
			{#if ponto.tipo === 'voto_desconfianca' && assinaturas}
				<dt>{t('Assinaturas')}</dt>
				<dd>{t('{n} de {total} assinaturas', { n: ponto.assinaturas.length, total: assinaturas })}</dd>
			{/if}
		</dl>
	{/if}
	<div class="acoes">
		{#if ponto && acoes}{@render acoes(ponto)}{/if}
		<form method="dialog"><button class="botao botao--secundario">{t('Fechar')}</button></form>
	</div>
</Modal>
