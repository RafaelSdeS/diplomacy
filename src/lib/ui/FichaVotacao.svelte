<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import type { DadosSessao } from '#lib/sessao.ts';
	import { REGRAS_VOTACAO, textoResultado } from '#lib/votacao.ts';
	import Confirmar from './Confirmar.svelte';
	import ListaVotos from './ListaVotos.svelte';
	import Modal from './Modal.svelte';

	// Passo 47: a ficha da votação no painel lateral, sem mudar a URL. Os dados vêm da tela,
	// que já os lê ao vivo: o placar anda com a ficha aberta. Sem votação, a ficha fecha.
	type Props = {
		votacao: DadosSessao['votacao'];
		sigla: string;
		delegacoes: DadosSessao['delegacoes'];
		presentes: Set<string>;
		encerrar?: () => unknown; // só para quem preside
		onclose: () => void;
	};
	let { votacao, sigla, delegacoes, presentes, encerrar, onclose }: Props = $props();
</script>

<Modal aberto={!!votacao} lateral classe="ficha" rotulo="ficha-votacao" {onclose}>
	{#if votacao}
		<p class="rotulo">{t('Votação')}</p>
		<h3 id="ficha-votacao">{votacao.objeto}</h3>
		<p>
			<span class="selo {votacao.aberta ? 'selo--info' : votacao.aprovada ? 'selo--ok' : 'selo--erro'}"
				>{votacao.aberta ? t('Aberta') : votacao.aprovada ? t('Aprovada') : t('Rejeitada')}</span
			>
			<span class="detalhe"
				>{votacao.tipo === 'substantiva' ? t('substantiva') : t('procedimental')}, {REGRAS_VOTACAO[votacao.regra]}{votacao.nominal
					? `, ${t('votação nominal')}`
					: ''}</span
			>
		</p>
		{#if !votacao.aberta}<p>{textoResultado(votacao)}</p>{/if}
		<ListaVotos {sigla} {delegacoes} votos={votacao.votos} tipo={votacao.tipo} {presentes} />
	{/if}
	<div class="acoes">
		{#if votacao?.aberta && encerrar}
			<Confirmar
				rotulo={t('Encerrar a votação')}
				pergunta={t('Encerrar a votação de {objeto}?', { objeto: votacao.objeto })}
				explicacao={t('Quem não votou fica sem voto, e o resultado sai na hora.')}
				acao={encerrar}
			/>
		{/if}
		<form method="dialog"><button class="botao botao--secundario">{t('Fechar')}</button></form>
	</div>
</Modal>
