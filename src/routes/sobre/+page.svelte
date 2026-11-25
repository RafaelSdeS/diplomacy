<script lang="ts">
	// Passo 54: a página discreta "Sobre": o que é o app, os créditos, a versão e os dados
	// pessoais (LGPD). Abre sem login, como o aviso de privacidade.
	import { tituloDaAba, APP, CRIADOR } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
</script>

<svelte:head>
	<title>{tituloDaAba(t('Sobre o Diplomacy'))}</title>
</svelte:head>

<p class="rotulo">{APP}</p>
<h1>{t('Sobre o Diplomacy')}</h1>
<p>{t('O app de uma simulação da ONU: a sessão, os documentos, as mensagens, a crise e a press num lugar só.')}</p>
<p>{t('Cada pessoa vê o que o seu papel pede, no celular ou no notebook.')}</p>

<section aria-labelledby="t-creditos">
	<h2 id="t-creditos">{t('Créditos')}</h2>
	<p>{t('Criado e desenvolvido por')} <a href={CRIADOR.site}><strong>{CRIADOR.nome}</strong></a></p>
	<p class="suave">{t('Versão')} <code>{__VERSAO__}</code></p>
</section>

<section aria-labelledby="t-dados">
	<h2 id="t-dados">{t('Seus dados (LGPD)')}</h2>
	<p>{t('Baixe tudo o que o app guarda sobre você, corrija o seu nome ou peça a exclusão da conta.')}</p>
	<div class="acoes">
		<a class="botao botao--secundario" href="/perfil/meus-dados">{t('Meus dados (LGPD)')}</a>
		<a class="botao botao--secundario" href="/privacidade">{t('Aviso de privacidade')}</a>
	</div>
	<p class="suave">{t('Encarregado de dados: a organização do evento, que é a controladora dos dados.')}</p>
</section>
