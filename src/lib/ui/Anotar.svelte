<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { t } from '#lib/i18n.svelte.ts';
	import { anotacao } from '#lib/ficha.svelte.ts';
	import { caixa, mensagemDoEnvio } from '#lib/caixa.ts';
	import { contador } from '#lib/contador.ts';
	import { guardarRascunho, lerRascunho } from '#lib/rascunho.ts';
	import { supabase } from '#lib/supabase.ts';
	import { semAcento } from '#lib/filtro.ts';
	import NomeDelegacao from './NomeDelegacao.svelte';
	import Escolha from './Escolha.svelte';
	import Quando from './Quando.svelte';
	import Modal from './Modal.svelte';

	// Passo 51 (lotes 0 e 0b): o caderno de qualquer tela, para escrever e para ler. A
	// delegação vem preenchida quando a pessoa abre a partir da ficha ou da página dela, e
	// então a lista mostra o que já foi anotado sobre ela. O texto fica salvo no aparelho.
	type Participacao = { papel: string; comite_id: string | null; comite_sigla: string | null; delegacao_id: string | null };
	let { participacoes }: { participacoes: Participacao[] } = $props();
	// Passo 55: a mesa também anota (o caderno da mesa, que só ela lê).
	const eu = $derived(
		participacoes.find((p) => p.papel === 'delegado' && p.comite_id) ?? participacoes.find((p) => p.papel === 'mesa' && p.comite_id)
	);

	let modal = $state<Modal>();
	let delegacoes = $state<{ id: string; nome: string; nome_oficial: string; bandeira: string | null }[]>([]);
	type Nota = { id: string; tipo: string; titulo: string | null; texto: string; criado_em: string; delegacao_id: string | null; sobre_delegacao_id: string | null };
	let notas = $state<Nota[]>([]);
	let busca = $state('');
	const nomeDe = (id: string | null) => delegacoes.find((d) => d.id === id);
	// Aberto a partir de uma delegação, só as notas sobre ela; a busca procura no texto.
	const visiveis = $derived(
		notas
			.filter((n) => !anotacao.sobre || n.sobre_delegacao_id === anotacao.sobre)
			.filter((n) => !busca.trim() || semAcento(n.texto).includes(semAcento(busca.trim())))
			.slice(0, 30)
	);
	async function lerNotas(comite: string) {
		const { data } = await supabase
			.from('anotacao')
			.select('id, tipo, titulo, texto, criado_em, delegacao_id, sobre_delegacao_id')
			.eq('comite_id', comite)
			.order('criado_em', { ascending: false })
			.limit(100);
		notas = data ?? [];
	}
	let sobre = $state('');
	let texto = $state('');
	let erro = $state('');
	let enviando = $state(false);
	const RASCUNHO = 'anotacao';

	$effect(() => {
		if (!anotacao.aberta || !modal || !eu?.comite_id) return;
		sobre = anotacao.sobre;
		texto = lerRascunho(RASCUNHO);
		erro = '';
		modal.abrir();
		busca = '';
		const comite = eu.comite_id;
		void supabase
			.from('delegacao')
			.select('id, nome, nome_oficial, bandeira')
			.eq('comite_id', comite)
			.order('nome')
			.then(({ data }) => (delegacoes = (data ?? []).filter((d) => d.id !== eu.delegacao_id)));
		void lerNotas(comite);
	});
	$effect(() => guardarRascunho(RASCUNHO, texto));

	async function salvar(evento: SubmitEvent) {
		evento.preventDefault();
		if (!eu?.comite_id) return;
		erro = '';
		enviando = true;
		const id = crypto.randomUUID();
		const resultado = await caixa.enviar({
			id,
			rpc: 'salvar_anotacao',
			args: { p_id: id, p_comite: eu.comite_id, p_tipo: sobre ? 'sobre' : 'nota', p_texto: texto, p_sobre: sobre || undefined },
			rotulo: t('Anotação')
		});
		enviando = false;
		const r = mensagemDoEnvio(resultado, t('Anotado no caderno.'));
		if (r.erro) {
			erro = r.erro;
			return;
		}
		texto = '';
		anotacao.salvas++;
		await Promise.all([invalidate('app:caderno'), lerNotas(eu.comite_id)]);
	}
</script>

<Modal bind:this={modal} rotulo="anotar-titulo" classe="modal-acao modal-caderno" onclose={() => (anotacao.aberta = false)}>
	<h3 id="anotar-titulo">{t('Caderno')}</h3>
	<p class="suave">{eu?.papel === 'mesa' ? t('Só a mesa do comitê lê o que anotar aqui.') : t('Só a sua delegação lê o que anotar aqui.')}</p>
	<form class="formulario" onsubmit={salvar}>
		<Escolha unica rotulo={t('Sobre a delegação (opcional)')} botao={t('Escolher')} opcoes={delegacoes} bind:valor={sobre} />
		<label class="campo">
			{t('Anotação')}
			<textarea required rows="4" maxlength="4000" bind:value={texto} {@attach contador(texto)}></textarea>
		</label>
		{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
		<div class="acoes">
			<button class="botao" disabled={enviando}>{t('Guardar no caderno')}</button>
			<button class="botao botao--secundario" type="button" onclick={() => modal?.fechar()}>{t('Fechar')}</button>
		</div>
	</form>

	<section class="caderno-notas" aria-labelledby="caderno-notas-titulo">
		<h4 id="caderno-notas-titulo">
			{anotacao.sobre && nomeDe(anotacao.sobre) ? t('Anotado sobre {delegacao}', { delegacao: nomeDe(anotacao.sobre)!.nome }) : t('Anotações recentes')}
		</h4>
		<label class="campo">{t('Buscar nas anotações')} <input type="search" bind:value={busca} /></label>
		<ul class="lista">
			{#each visiveis as n (n.id)}
				{@const sobreQuem = nomeDe(n.sobre_delegacao_id)}
				<li>
					<div>
						<p class="texto-nota">{n.titulo ? `${n.titulo}: ` : ''}{n.texto}</p>
						<span class="detalhe">
							<Quando iso={n.criado_em} />
							{#if sobreQuem && eu?.comite_sigla}· <NomeDelegacao sigla={eu.comite_sigla} delegacao={sobreQuem} />{/if}
							{#if n.tipo === 'fala'}· {t('fala')}{/if}
							{#if n.delegacao_id !== eu?.delegacao_id}· {t('compartilhada com você')}{/if}
						</span>
					</div>
				</li>
			{:else}
				<li class="suave">{t('Nada anotado ainda.')}</li>
			{/each}
		</ul>
		{#if eu?.comite_sigla && eu.papel === 'delegado'}
			<p><a class="botao botao--secundario botao--pequeno" href={`/comite/${eu.comite_sigla}/caderno`} onclick={() => modal?.fechar()}>{t('Abrir o caderno completo')}</a></p>
		{/if}
	</section>
</Modal>
