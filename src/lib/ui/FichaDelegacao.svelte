<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { ficha, fecharFicha } from '#lib/ficha.svelte.ts';
	import { caixa, mensagemDoEnvio } from '#lib/caixa.ts';
	import { contador } from '#lib/contador.ts';
	import { guardarRascunho, lerRascunho } from '#lib/rascunho.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { STATUS_DPO } from '#lib/impressao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { ESCOLHAS } from '#lib/votacao.ts';
	import Bandeira from './Bandeira.svelte';
	import Modal from './Modal.svelte';

	// Passo 43: a ficha da delegação, aberta por cima da tela ao vivo. O resumo da página da
	// delegação (a RLS decide o que aparece); a página completa fica a um clique.
	async function carregar(id: string) {
		const [delegacao, delegados, dpos, votos] = await Promise.all([
			supabase.from('delegacao').select('id, nome, nome_oficial, bandeira, situacao').eq('id', id).maybeSingle(),
			supabase.from('participacao').select('pessoa(nome)').eq('delegacao_id', id).eq('papel', 'delegado'),
			supabase.from('dpo').select('topico, status').eq('delegacao_id', id).order('topico'),
			supabase
				.from('voto')
				.select('escolha, votacao!inner(id, objeto, encerrada_em)')
				.eq('delegacao_id', id)
				.not('votacao.encerrada_em', 'is', null)
				.order('votacao(encerrada_em)', { ascending: false })
				.limit(5)
		]);
		for (const r of [delegacao, delegados, dpos, votos]) if (r.error) throw r.error;
		return {
			delegacao: delegacao.data,
			delegados: delegados.data!.map((p) => p.pessoa?.nome).filter((n) => !!n),
			dpos: dpos.data!,
			votos: votos.data!
		};
	}

	// Passo 47: bilhete e carta para a delegação da ficha, sem ir às mensagens ou às cartas.
	// Os rascunhos são os mesmos daquelas telas.
	type Participacao = { papel: string; comite_id: string | null; comite_sigla: string | null; delegacao_id: string | null };
	let { participacoes }: { participacoes: Participacao[] } = $props();
	const eu = $derived(participacoes.find((p) => p.papel === 'delegado' && p.comite_sigla === ficha.sigla));
	const podeEscrever = $derived(!!eu?.delegacao_id && eu.delegacao_id !== ficha.id);
	let escrever = $state<'' | 'bilhete' | 'carta'>('');
	let titulo = $state('');
	let texto = $state({ bilhete: '', carta: '' });
	let aviso = $state('');
	let falha = $state('');
	let enviando = $state(false);
	const rascunho = (tipo: 'bilhete' | 'carta') => `${tipo}:${ficha.sigla}`;
	$effect(() => {
		if (escrever) guardarRascunho(rascunho(escrever), texto[escrever]);
	});
	function comecar(tipo: 'bilhete' | 'carta') {
		texto[tipo] = lerRascunho(rascunho(tipo));
		aviso = falha = '';
		escrever = tipo;
	}
	async function enviarEscrito(evento: SubmitEvent) {
		evento.preventDefault();
		if (!escrever || !eu?.comite_id || !ficha.id || !dados?.delegacao) return;
		const tipo = escrever;
		falha = aviso = '';
		enviando = true;
		if (tipo === 'bilhete') {
			const id = crypto.randomUUID();
			const resultado = await caixa.enviar({
				id,
				rpc: 'enviar_mensagem',
				args: { p_id: id, p_comite: eu.comite_id, p_tipo: 'bilhete', p_texto: texto.bilhete, p_para: ficha.id },
				rotulo: t('Bilhete para {delegacao}', { delegacao: dados.delegacao.nome })
			});
			({ erro: falha, mensagem: aviso } = mensagemDoEnvio(resultado, t('Bilhete enviado.')));
		} else {
			const { error } = await supabase.rpc('enviar_carta', {
				p_comite: eu.comite_id,
				p_titulo: titulo,
				p_corpo: texto.carta,
				p_publica: false,
				p_destinatarios: [ficha.id]
			});
			if (error) falha = mensagemDeErro(error);
			else aviso = t('Carta enviada.');
		}
		enviando = false;
		if (falha) return;
		texto[tipo] = '';
		guardarRascunho(rascunho(tipo), '');
		if (tipo === 'carta') titulo = '';
		escrever = '';
	}

	let modal = $state<Modal>();
	let dados = $state<Awaited<ReturnType<typeof carregar>> | null>(null);
	let erro = $state('');
	const SITUACAO: Record<string, string> = { observadora: 'Observadora', suspensa: 'Suspensa' };

	$effect(() => {
		const id = ficha.id;
		if (!id || !modal) return;
		dados = null;
		erro = '';
		escrever = '';
		aviso = falha = '';
		modal.abrir();
		carregar(id)
			.then((d) => {
				if (ficha.id === id) dados = d;
			})
			.catch(() => (erro = t('Não foi possível carregar a delegação.')));
	});
</script>

<Modal bind:this={modal} lateral classe="ficha" rotulo="ficha-titulo" onclose={fecharFicha}>
	{#if dados?.delegacao && escrever}
		<h3 id="ficha-titulo">
			{escrever === 'bilhete' ? t('Bilhete para {delegacao}', { delegacao: dados.delegacao.nome }) : t('Carta para {delegacao}', { delegacao: dados.delegacao.nome })}
		</h3>
		<form class="formulario" onsubmit={enviarEscrito}>
			{#if escrever === 'carta'}
				<label class="campo">
					{t('Título')}
					<input required maxlength="200" bind:value={titulo} {@attach contador(titulo)} />
				</label>
			{/if}
			<label class="campo">
				{escrever === 'bilhete' ? t('Bilhete') : t('Carta')}
				<textarea required rows="6" maxlength={escrever === 'bilhete' ? 1000 : 8000} bind:value={texto[escrever]} {@attach contador(texto[escrever])}
				></textarea>
			</label>
			{#if falha}<p class="erro" role="alert">{falha}</p>{/if}
			<div class="acoes">
				<button class="botao" disabled={enviando}>{escrever === 'bilhete' ? t('Enviar bilhete') : t('Enviar carta')}</button>
				<button class="botao botao--secundario" type="button" onclick={() => (escrever = '')}>{t('Voltar')}</button>
			</div>
		</form>
	{:else if dados?.delegacao}
		{@const d = dados.delegacao}
		<p class="ficha-bandeira"><Bandeira codigo={d.bandeira} /></p>
		<h3 id="ficha-titulo">{d.nome}</h3>
		<p class="suave">{d.nome_oficial}{SITUACAO[d.situacao] ? ` · ${t(SITUACAO[d.situacao])}` : ''}</p>
		<dl class="ficha-dados">
			<dt>{dados.delegados.length === 1 ? t('Delegado') : t('Delegados')}</dt>
			<dd>{dados.delegados.join(', ') || '—'}</dd>
			<dt>{t('DPO')}</dt>
			<dd>
				{#each dados.dpos as dpo (dpo.topico)}
					<span class="ficha-dpo">{t('Tópico')} {dpo.topico} <span class="selo {STATUS_DPO[dpo.status].selo}">{STATUS_DPO[dpo.status].rotulo}</span></span>
				{:else}
					—
				{/each}
			</dd>
		</dl>
		{#if dados.votos.length}
			<h4>{t('Votos recentes')}</h4>
			<ul class="lista">
				{#each dados.votos as v (v.votacao.id)}
					<li><span>{v.votacao.objeto}</span> <span class="detalhe">{ESCOLHAS[v.escolha]}</span></li>
				{/each}
			</ul>
		{/if}
	{:else}
		<h3 id="ficha-titulo">{t('Delegação')}</h3>
		<p class={erro ? 'erro' : 'suave'}>{erro || t('Carregando…')}</p>
	{/if}
	{#if aviso && !escrever}<p class="sucesso" role="status">{aviso}</p>{/if}
	<div class="acoes" hidden={!!escrever}>
		{#if dados?.delegacao && podeEscrever}
			<button class="botao" type="button" onclick={() => comecar('bilhete')}>{t('Mandar bilhete')}</button>
			<button class="botao botao--secundario" type="button" onclick={() => comecar('carta')}>{t('Escrever carta')}</button>
		{/if}
		{#if dados?.delegacao}
			<a class="botao botao--secundario" href={`/comite/${ficha.sigla}/delegacao/${dados.delegacao.id}`} onclick={() => modal?.fechar()}
				>{t('Abrir a página da delegação')}</a
			>
		{/if}
		<form method="dialog"><button class="botao">{t('Fechar')}</button></form>
	</div>
</Modal>
