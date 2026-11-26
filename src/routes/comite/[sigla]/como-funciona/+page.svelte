<script lang="ts">
	// Passo 61: o caminho do comitê numa tela só, para quem nunca usou o app: a plenária de
	// abertura, o debate de cada tópico e o que cada papel faz. Sem tutorial longo.
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const sigla = $derived(data.comite.sigla);
</script>

<svelte:head>
	<title>{tituloDaAba(t('Como funciona o comitê'), sigla)}</title>
</svelte:head>

<p class="rotulo">{t('Comitê')} · {sigla}</p>
<h1>{t('Como funciona o comitê')}</h1>
<p>{t('O comitê segue sempre a mesma ordem. Na Sessão, a linha do topo mostra em que momento ele está, o que fazer agora e o que vem depois.')}</p>

<ol class="como-funciona">
	<li>
		<h2>{t('Plenária de abertura')}</h2>
		<p class="suave">{t('Na primeira sessão. A mesa conduz.')}</p>
		<ol>
			<li><strong>{t('Briefing')}:</strong> {t('a mesa apresenta os tópicos e responde às perguntas. A lista de presidências é sorteada.')}</li>
			<li><strong>{t('Discursos de abertura')}:</strong> {t('todas as delegações falam, em ordem alfabética.')}</li>
			<li>
				<strong>{t('Moção do tópico')}:</strong>
				{t('uma delegação propõe qual tópico abre o debate ("Fazer um ponto ou moção" → "Moção de introdução do tópico no topo"), e a sala vota.')}
			</li>
		</ol>
	</li>
	<li>
		<h2>{t('O debate de cada tópico')}</h2>
		<p class="suave">{t('Preside a delegação da vez, na ordem sorteada; ela muda no fim da sessão ou com a não-confiança.')}</p>
		<ol>
			<li><strong>{t('Agenda')}:</strong> {t('a primeira sessão do tópico discute o que será debatido e em que ordem.')}</li>
			<li>
				<strong>{t('Working papers')}:</strong>
				{t('cada grande item da agenda tem um, de toda a sala. O redator de cada bloco (ou a delegação sem bloco) propõe mudanças; todas marcam posição; quem preside aceita ou rejeita depois do debate. Assinar é opcional e mostra acordo.')}
			</li>
			<li>
				<strong>{t('Projeto de resolução')}:</strong>
				{t('um por tópico: a mesa ouve a sala e transforma os working papers nele, com os preâmbulos primeiro e as assinaturas junto. Nasce fechado e vai à fase de ação com 5 assinaturas.')}
			</li>
			<li>
				<strong>{t('Fase de ação')}:</strong>
				{t('um signatário lê o projeto, e a mesa pergunta se alguma delegação se opõe: sem objeção, ele é aprovado por consenso; com objeção, vai a voto. Aprovado, é a resolução do tópico; rejeitado, os working papers reabrem.')}
			</li>
		</ol>
	</li>
</ol>

<h2>{t('O que cada um faz')}</h2>
<dl class="ficha">
	<div>
		<dt>{t('Delegação')}</dt>
		<dd>
			{t('Levanta a placa para pedir a palavra (a presidência escolhe quem fala: as placas não são uma fila), faz pontos e moções pelo botão do topo da Sessão, vota, marca posição nas propostas e assina; no bloco, quem propõe é o redator.')}
		</dd>
	</div>
	<div>
		<dt>{t('Presidência')}</dt>
		<dd>{t('A delegação da vez conduz o debate no Painel: escolhe os próximos entre as placas, dá a palavra, decide os pontos e moções aprovados pela mesa e aceita ou rejeita as propostas nos working papers. Também vota e discursa.')}</dd>
	</div>
	<div>
		<dt>{t('Mesa')}</dt>
		<dd>
			{t('Conduz a plenária de abertura e a fase de ação. No debate, é o bureau: aprova os pontos e moções, confirma as chegadas e transforma os working papers em projeto. Assume a presidência só num caso excepcional.')}
		</dd>
	</div>
</dl>
<p><a class="botao botao--secundario" href={`/comite/${sigla}/sessao`}>{t('Ir para a sessão')}</a></p>
