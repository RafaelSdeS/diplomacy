<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';
	import { abrirAnotacao, anotacao, ficha, fecharFicha } from '#lib/ficha.svelte.ts';
	import { nomeDoDocumento } from '#lib/formatacao.ts';
	import { caixa, mensagemDoEnvio } from '#lib/caixa.ts';
	import { contador } from '#lib/contador.ts';
	import { guardarRascunho, lerRascunho } from '#lib/rascunho.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { STATUS_DPO } from '#lib/impressao.ts';
	import { supabase } from '#lib/supabase.ts';
	import { ESCOLHAS } from '#lib/votacao.ts';
	import Bandeira from './Bandeira.svelte';
	import Modal from './Modal.svelte';
	import Quando from './Quando.svelte';

	// Passo 43: a ficha da delegação, aberta por cima da tela ao vivo. O resumo da página da
	// delegação (a RLS decide o que aparece); a página completa fica a um clique.
	async function carregar(id: string) {
		const [delegacao, delegados, dpos, votos, blocos, assinados] = await Promise.all([
			supabase.from('delegacao').select('id, comite_id, nome, nome_oficial, bandeira, situacao').eq('id', id).maybeSingle(),
			supabase.from('participacao').select('pessoa(nome)').eq('delegacao_id', id).eq('papel', 'delegado'),
			supabase.from('dpo').select('topico, status').eq('delegacao_id', id).order('topico'),
			supabase
				.from('voto')
				.select('escolha, votacao!inner(id, objeto, encerrada_em)')
				.eq('delegacao_id', id)
				.not('votacao.encerrada_em', 'is', null)
				.order('votacao(encerrada_em)', { ascending: false })
				.limit(3),
			// Passo 55: o essencial do comitê, uma linha cada.
			supabase.from('bloco_membro').select('bloco(nome)').eq('delegacao_id', id),
			supabase.from('assinatura').select('documento(tipo, numero, titulo)').eq('delegacao_id', id)
		]);
		for (const r of [delegacao, delegados, dpos, votos, blocos, assinados]) if (r.error) throw r.error;
		// A chamada de hoje: presente se a delegação está na presença da sessão aberta.
		const comite = delegacao.data?.comite_id;
		const estado = comite ? await supabase.from('estado_sessao').select('sessao_id').eq('comite_id', comite).maybeSingle() : null;
		const sessao = estado?.data?.sessao_id;
		const presenca = sessao ? await supabase.from('presenca').select('delegacao_id').eq('sessao_id', sessao).eq('delegacao_id', id) : null;
		return {
			delegacao: delegacao.data,
			delegados: delegados.data!.map((p) => p.pessoa?.nome).filter((n) => !!n),
			dpos: dpos.data!,
			votos: votos.data!,
			blocos: blocos.data!.map((b) => b.bloco?.nome).filter((n) => !!n),
			assinados: assinados.data!.map((a) => a.documento).filter((d) => !!d),
			presente: presenca && !presenca.error ? presenca.data.length > 0 : null
		};
	}

	// Passo 47: bilhete e carta para a delegação da ficha, sem ir às mensagens ou às cartas.
	// Os rascunhos são os mesmos daquelas telas.
	type Participacao = { papel: string; comite_id: string | null; comite_sigla: string | null; delegacao_id: string | null };
	let { participacoes }: { participacoes: Participacao[] } = $props();
	const eu = $derived(participacoes.find((p) => p.papel === 'delegado' && p.comite_sigla === ficha.sigla));
	const podeEscrever = $derived(!!eu?.delegacao_id && eu.delegacao_id !== ficha.id);

	// Passo 55: a ficha sempre mostra o que eu anotei sobre a delegação: as notas da minha
	// delegação, para o delegado, e as da mesa (delegacao_id nulo), para a mesa. A RLS só
	// devolve as minhas, as da mesa (para a mesa) e as compartilhadas comigo.
	const souMesa = $derived(participacoes.some((p) => p.papel === 'mesa' && p.comite_sigla === ficha.sigla));
	const anota = $derived(podeEscrever || (souMesa && !eu));
	const dona = $derived(eu?.delegacao_id ?? null);
	type Nota = { id: string; titulo: string | null; texto: string; criado_em: string; delegacao_id: string | null };
	let notas = $state<Nota[]>([]);
	const minhas = $derived(notas.filter((n) => n.delegacao_id === dona));
	const compartilhadas = $derived(notas.filter((n) => n.delegacao_id !== dona));
	$effect(() => {
		void anotacao.salvas; // depois do "Anotar", a nota nova aparece sem recarregar
		const id = ficha.id;
		notas = [];
		if (!id || !anota) return;
		void supabase
			.from('anotacao')
			.select('id, titulo, texto, criado_em, delegacao_id')
			.eq('sobre_delegacao_id', id)
			.order('criado_em', { ascending: false })
			.limit(50)
			.then(({ data }) => {
				if (ficha.id === id) notas = data ?? [];
			});
	});
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

<!-- Passo 55: as minhas anotações sobre a delegação (três à vista) e as compartilhadas comigo. -->
{#snippet anotacoes()}
	<section class="ficha-notas" aria-labelledby="ficha-notas-titulo">
		<div class="ficha-notas-topo">
			<h4 id="ficha-notas-titulo">{eu ? t('Minhas anotações') : t('Anotações da mesa')} ({minhas.length})</h4>
			<div class="acoes">
				{#if minhas.length > 3}
					<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => ficha.id && abrirAnotacao(ficha.id)}
						{@attach dica(t('Abre o caderno com todas as anotações sobre esta delegação.'))}
						>{t('Ver todas')}</button
					>
				{/if}
				<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => ficha.id && abrirAnotacao(ficha.id)}
					{@attach dica(t('Escreve no caderno uma anotação sobre esta delegação.'))}
					>{t('Anotar')}</button
				>
			</div>
		</div>
		<ul class="lista">
			{#each minhas.slice(0, 3) as n (n.id)}
				<li><span class="texto-nota">{n.titulo ? `${n.titulo}: ` : ''}{n.texto} <span class="detalhe"><Quando iso={n.criado_em} /></span></span></li>
			{:else}
				<li class="suave">{t('Nada anotado ainda.')}</li>
			{/each}
		</ul>
		{#if compartilhadas.length}
			<h4>{t('Compartilhadas comigo')} ({compartilhadas.length})</h4>
			<ul class="lista">
				{#each compartilhadas.slice(0, 2) as n (n.id)}
					<li><span class="texto-nota">{n.titulo ? `${n.titulo}: ` : ''}{n.texto} <span class="detalhe"><Quando iso={n.criado_em} /></span></span></li>
				{/each}
			</ul>
		{/if}
	</section>
{/snippet}

<Modal bind:this={modal} classe="modal-ficha" rotulo="ficha-titulo" onclose={fecharFicha}>
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
				<button class="botao" disabled={enviando}>{enviando ? t('Enviando…') : escrever === 'bilhete' ? t('Enviar bilhete') : t('Enviar carta')}</button>
				<button class="botao botao--secundario" type="button" onclick={() => (escrever = '')}>{t('Voltar')}</button>
			</div>
		</form>
	{:else if dados?.delegacao}
		{@const d = dados.delegacao}
		<p class="ficha-bandeira"><Bandeira codigo={d.bandeira} /></p>
		<h3 id="ficha-titulo">{d.nome}</h3>
		<p class="suave">{d.nome_oficial}{SITUACAO[d.situacao] ? ` · ${t(SITUACAO[d.situacao])}` : ''}</p>
		<!-- Passo 55: no notebook, os dados à esquerda e as anotações à direita, sem rolar. -->
		<div class="ficha-corpo">
		<div>
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
			<dt>{t('Blocos')} ({dados.blocos.length})</dt>
			<dd class="uma-linha" title={dados.blocos.join(', ')}>{dados.blocos.join(', ') || '—'}</dd>
			<dt>{t('Assinou')} ({dados.assinados.length})</dt>
			<dd class="uma-linha" title={dados.assinados.map((d) => nomeDoDocumento(d)).join('; ')}>
				{dados.assinados.map((d) => nomeDoDocumento(d)).join('; ') || '—'}
			</dd>
			{#if dados.presente !== null}
				<dt>{t('Chamada')}</dt>
				<dd>{dados.presente ? t('Presente') : t('Ausente')}</dd>
			{/if}
		</dl>
		{#if dados.votos.length}
			<h4>{t('Votos recentes')}</h4>
			<ul class="lista">
				{#each dados.votos as v (v.votacao.id)}
					<li><span>{v.votacao.objeto}</span> <span class="detalhe">{ESCOLHAS[v.escolha]}</span></li>
				{/each}
			</ul>
		{/if}
		</div>
		{#if anota}
			{@render anotacoes()}
		{/if}
		</div>
	{:else}
		<h3 id="ficha-titulo">{t('Delegação')}</h3>
		{#if erro}
			<p class="erro">{erro}</p>
		{:else}
			<!-- Passo 51: o lugar do conteúdo, em CSS, enquanto ele chega. -->
			<div class="esqueleto" role="status"><span class="so-leitor">{t('Carregando…')}</span><span></span><span></span><span></span></div>
		{/if}
	{/if}
	{#if aviso && !escrever}<p class="sucesso" role="status">{aviso}</p>{/if}
	<div class="acoes" hidden={!!escrever}>
		{#if dados?.delegacao && podeEscrever}
			<button class="botao" type="button" onclick={() => comecar('bilhete')} {@attach dica(t('Escreve uma mensagem curta para esta delegação.'))}>{t('Mandar bilhete')}</button>
			<button class="botao botao--secundario" type="button" onclick={() => comecar('carta')} {@attach dica(t('Escreve uma carta diplomática privada, com título, para esta delegação.'))}>{t('Escrever carta')}</button>
		{/if}
		{#if dados?.delegacao}
			<a class="botao botao--secundario" href={`/comite/${ficha.sigla}/delegacao/${dados.delegacao.id}`} onclick={() => modal?.fechar()}
				{@attach dica(t('Fecha a ficha e abre a página inteira da delegação.'))}
				>{t('Abrir a página da delegação')}</a

			>
		{/if}
		<form method="dialog"><button class="botao">{t('Fechar')}</button></form>
	</div>
</Modal>
