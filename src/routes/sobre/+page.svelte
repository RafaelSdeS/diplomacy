<script lang="ts">
	// Passo 54: a página discreta "Sobre": o que é o app, os créditos, a versão e os dados
	// pessoais (LGPD). Abre sem login, como o aviso de privacidade.
	import { tituloDaAba, APP, CRIADOR, ENCARREGADO } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';
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

<!-- Para quem quiser os detalhes técnicos (o README do repositório tem mais). -->
<section aria-labelledby="t-tecnico">
	<h2 id="t-tecnico">{t('Como é feito')}</h2>
	<p class="suave">{t('Para quem quiser os detalhes técnicos.')}</p>
	<dl class="ficha">
		<div>
			<dt>{t('Interface')}</dt>
			<dd>{t('Um app web em SvelteKit (Svelte 5 e TypeScript), sem nada a instalar: funciona no navegador do celular, do notebook e do projetor.')}</dd>
		</div>
		<div>
			<dt>{t('Hospedagem')}</dt>
			<dd>{t('Arquivos estáticos no Cloudflare Workers. Não há servidor próprio: o app fala direto com o banco.')}</dd>
		</div>
		<div>
			<dt>{t('Banco de dados')}</dt>
			<dd>{t('Postgres no Supabase, em São Paulo. As regras do comitê ficam no próprio banco, em funções que conferem quem pode fazer cada coisa.')}</dd>
		</div>
		<div>
			<dt>{t('Segurança')}</dt>
			<dd>{t('Cada leitura passa pela segurança por linha (RLS), ligada em todas as tabelas: cada pessoa só vê o que o papel dela permite. O login é por e-mail, Google ou QR do crachá.')}</dd>
		</div>
		<div>
			<dt>{t('Tempo real')}</dt>
			<dd>{t('O banco avisa na hora o que mudou (Supabase Realtime), e a tela relê só aquilo, para gastar pouco dado móvel.')}</dd>
		</div>
		<div>
			<dt>{t('Sem internet')}</dt>
			<dd>{t('Um service worker guarda o app e as últimas leituras; o que você envia sem rede fica na caixa de saída e sai sozinho quando a conexão volta, sem duplicar.')}</dd>
		</div>
		<div>
			<dt>{t('Idiomas e acessibilidade')}</dt>
			<dd>{t('Português e inglês. Segue as diretrizes WCAG 2.2 AA, com tema escuro e uso pelo teclado; toda ação explica o que faz.')}</dd>
		</div>
		<div>
			<dt>{t('Testes')}</dt>
			<dd>{t('Testes do banco (pgTAP), de unidade (Vitest) e de ponta a ponta no celular, no notebook e no telão (Playwright), rodados a cada mudança.')}</dd>
		</div>
	</dl>
	<p>
		<a class="botao botao--secundario" href="https://github.com/RafaelSdeS/diplomacy" {@attach dica(t('O repositório público, com o código, o plano e a documentação técnica.'))}
			>{t('Código-fonte')}</a
		>
	</p>
</section>

<section aria-labelledby="t-dados">
	<h2 id="t-dados">{t('Seus dados (LGPD)')}</h2>
	<p>{t('Baixe tudo o que o app guarda sobre você, corrija o seu nome ou peça a exclusão da conta.')}</p>
	<div class="acoes">
		<a class="botao botao--secundario" href="/perfil/meus-dados" {@attach dica(t('Baixe tudo o que o app guarda sobre você ou peça a exclusão da conta.'))}>{t('Meus dados (LGPD)')}</a>
		<a class="botao botao--secundario" href="/privacidade" {@attach dica(t('O que o app guarda, para quê e quem vê cada coisa.'))}>{t('Aviso de privacidade')}</a>
	</div>
	<p>{t('Encarregado de dados')}: {ENCARREGADO.nome}, <a href={`mailto:${ENCARREGADO.email}`}>{ENCARREGADO.email}</a></p>
</section>
