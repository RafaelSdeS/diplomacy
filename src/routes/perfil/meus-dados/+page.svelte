<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';

	let erro = $state('');
	let mensagem = $state('');
	let confirmar = $state(false);

	async function baixar() {
		erro = '';
		const { data, error } = await supabase.rpc('meus_dados');
		if (error) return (erro = mensagemDeErro(error));
		const link = document.createElement('a');
		link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
		link.download = 'meus-dados-ufrgsmun.json';
		link.click();
		setTimeout(() => URL.revokeObjectURL(link.href), 1000);
	}

	async function pedirExclusao() {
		erro = mensagem = '';
		const { error } = await supabase.rpc('pedir_exclusao');
		if (error) erro = mensagemDeErro(error);
		else mensagem = t('Pedido enviado à secretaria. Você recebe a confirmação quando a conta for apagada.');
		confirmar = false;
	}
</script>

<svelte:head>
	<title>{t('Meus dados · UFRGSMUN')}</title>
</svelte:head>

<p class="rotulo">{t('Perfil · LGPD')}</p>
<h1>{t('Meus dados')}</h1>
<p class="suave">{t('O que o app guarda e quem vê cada coisa está no')} <a href="/privacidade">{t('aviso de privacidade')}</a>.</p>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

<section aria-labelledby="t-baixar">
	<h2 id="t-baixar">{t('Baixar os meus dados')}</h2>
	<p>{t('Um arquivo JSON com a sua conta, as suas participações e tudo o que você escreveu no app.')}</p>
	<button class="botao" type="button" onclick={baixar}>{t('Baixar os meus dados')}</button>
</section>

<section aria-labelledby="t-corrigir">
	<h2 id="t-corrigir">{t('Corrigir o nome')}</h2>
	<p>{t('O nome, a foto e a minibiografia se corrigem no')} <a href="/perfil">{t('perfil')}</a>.</p>
</section>

<section aria-labelledby="t-excluir">
	<h2 id="t-excluir">{t('Pedir a exclusão')}</h2>
	<p>
		{t('A secretaria apaga a sua conta, o seu e-mail e o que é privado. Os textos públicos (matérias, documentos aprovados) ficam, sem o seu nome; o certificado fica, porque comprova a sua participação.')}
	</p>
	{#if confirmar}
		<p class="acoes">
			<button class="botao" type="button" onclick={pedirExclusao}>{t('Sim, pedir a exclusão')}</button>
			<button class="botao botao--secundario" type="button" onclick={() => (confirmar = false)}>{t('Cancelar')}</button>
		</p>
	{:else}
		<button class="botao botao--secundario" type="button" onclick={() => (confirmar = true)}>{t('Pedir a exclusão da minha conta')}</button>
	{/if}
</section>
