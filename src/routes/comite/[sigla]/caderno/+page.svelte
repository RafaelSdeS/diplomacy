<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { contador } from '#lib/contador.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { invalidate } from '$app/navigation';
	import { caixa, mensagemDoEnvio } from '#lib/caixa.ts';
	import { estimarDuracao } from '#lib/caderno.ts';
	import { formatarTempo } from '#lib/cronometro.ts';
	import { formatarQuando } from '#lib/cronograma.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import Modal from '#lib/ui/Modal.svelte';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const agora = new Date();

	const eu = $derived(data.participacoes.find((p) => p.comite_id === data.comite.id && p.papel === 'delegado'));
	const minhas = $derived(data.anotacoes.filter((a) => a.delegacao_id === eu?.delegacao_id));
	const recebidas = $derived(data.anotacoes.filter((a) => a.delegacao_id !== eu?.delegacao_id));
	const nomeDe = (id: string | null) => data.delegacoes.find((d) => d.id === id)?.nome ?? '';
	const outras = $derived(data.delegacoes.filter((d) => d.id !== eu?.delegacao_id));
	const ABAS = [
		{ chave: 'nota', rotulo: t('Notas') },
		{ chave: 'sobre', rotulo: t('Sobre as delegações') },
		{ chave: 'fala', rotulo: t('Falas') }
	] as const;
	let aba = $state<'nota' | 'sobre' | 'fala'>('nota');

	let erro = $state('');
	let mensagem = $state('');
	let texto = $state('');
	let titulo = $state('');
	let sobre = $state('');
	let compartilhar = $state<Record<string, string[]>>({});
	let lendo = $state<{ titulo: string | null; texto: string } | null>(null);
	let leitura = $state<Modal>();

	async function salvar(evento: SubmitEvent) {
		evento.preventDefault();
		erro = mensagem = '';
		const id = crypto.randomUUID();
		const resultado = await caixa.enviar({
			id,
			rpc: 'salvar_anotacao',
			args: {
				p_id: id,
				p_comite: data.comite.id,
				p_tipo: aba,
				p_texto: texto,
				p_titulo: aba === 'fala' ? titulo : undefined,
				p_sobre: aba === 'sobre' ? sobre : undefined
			},
			rotulo: t('Anotação')
		});
		({ erro, mensagem } = mensagemDoEnvio(resultado, t('Anotação salva.')));
		if (!erro) texto = titulo = '';
		await invalidate('app:caderno');
	}

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, ok: string) {
		erro = mensagem = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		else mensagem = ok;
		await invalidate('app:caderno');
	}

	function usarNaFala(a: { titulo: string | null; texto: string }) {
		lendo = a;
		leitura?.abrir();
	}
</script>

<svelte:head>
	<title>{tituloDaAba(t('Caderno'), data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">
	{t('Comitê')} · {data.comite.sigla}
	{#if eu?.delegacao_id}
		<AoVivo canais={[`delegacao:${eu.delegacao_id}`]} tabelas={['anotacao', 'anotacao_compartilhada']} dependencia="app:caderno" />
	{/if}
</p>
<h1>{t('Caderno da delegação')}</h1>

{#if !eu}
	<p class="suave">{t('O caderno é das delegações. A mesa não lê o caderno.')}</p>
{:else}
	<p class="suave">{t('Só a sua delegação lê. Cada anotação pode ser compartilhada, só para leitura, com as delegações que você escolher.')}</p>
	{#if erro}<p class="erro" role="alert">{erro}</p>{/if}
	{#if mensagem}<p class="sucesso" role="status">{mensagem}</p>{/if}

	<div class="abas" role="tablist" aria-label={t('Partes do caderno')}>
		{#each ABAS as a (a.chave)}
			<button class="aba" type="button" role="tab" aria-selected={aba === a.chave} onclick={() => (aba = a.chave)}>{a.rotulo}</button>
		{/each}
	</div>

	<div role="tabpanel" aria-label={ABAS.find((a) => a.chave === aba)?.rotulo}>
		<form class="formulario formulario--largo" onsubmit={salvar} aria-label={t('Nova anotação')}>
			{#if aba === 'sobre'}
				<label class="campo">
					{t('Sobre a delegação')}
					<select required bind:value={sobre}>
						<option value="">{t('Escolha')}</option>
						{#each outras as d (d.id)}<option value={d.id}>{d.nome}</option>{/each}
					</select>
				</label>
			{:else if aba === 'fala'}
				<label class="campo">{t('Título da fala')} <input maxlength="120" bind:value={titulo} {@attach contador(titulo)} /></label>
			{/if}
			<label class="campo">
				{aba === 'fala' ? t('Texto da fala') : t('Anotação')}
				<textarea required rows={aba === 'fala' ? 8 : 3} maxlength="4000" bind:value={texto} {@attach contador(texto)}></textarea>
			</label>
			{#if aba === 'fala'}
				{@const seg = estimarDuracao(texto)}
				<p class={seg > data.tempoFalaSeg ? 'erro' : 'suave'} aria-live="polite">
					{t('~{tempo} de {limite} de tempo de fala', { tempo: formatarTempo(seg), limite: formatarTempo(data.tempoFalaSeg) })}
				</p>
			{/if}
			<button class="botao">{t('Salvar no caderno')}</button>
		</form>

		<ul class="lista anotacoes">
			{#each minhas.filter((a) => a.tipo === aba) as a (a.id)}
				<li>
					<div>
						{#if a.tipo === 'sobre'}<NomeDelegacao sigla={data.comite.sigla} delegacao={data.delegacoes.find((d) => d.id === a.sobre_delegacao_id)} />{/if}
						{#if a.titulo}<strong>{a.titulo}</strong>{/if}
						<p class="texto-nota">{a.texto}</p>
						<span class="detalhe">
							{formatarQuando(a.criado_em, agora)}
							{#if a.topico}· {t('Tópico')} {a.topico}{/if}
							{#if a.orador?.nome}· {t('falava {delegacao}', { delegacao: a.orador.nome })}{/if}
							{#if a.tipo === 'fala'}· {t('~{tempo}', { tempo: formatarTempo(estimarDuracao(a.texto)) })}{/if}
							{#if a.compartilhada.length}· {t('compartilhada com {delegacoes}', { delegacoes: a.compartilhada.map((c) => nomeDe(c.delegacao_id)).join(', ') })}{/if}
						</span>
					</div>
					<div class="acoes">
						{#if a.tipo === 'fala'}
							<button class="botao botao--pequeno" type="button" onclick={() => usarNaFala(a)}>{t('Usar na próxima fala')}</button>
						{/if}
						<details class="compartilhar">
							<summary>{t('Compartilhar com…')}</summary>
							<fieldset class="opcoes">
								<legend>{t('Delegações que podem ler')}</legend>
								{#each outras as d (d.id)}
									<label class="opcao">
										<input
											type="checkbox"
											value={d.id}
											checked={(compartilhar[a.id] ?? a.compartilhada.map((c) => c.delegacao_id)).includes(d.id)}
											onchange={(e) => {
												const atual = compartilhar[a.id] ?? a.compartilhada.map((c) => c.delegacao_id);
												compartilhar[a.id] = e.currentTarget.checked ? [...atual, d.id] : atual.filter((x) => x !== d.id);
											}}
										/>
										{d.nome}{d.id === a.sobre_delegacao_id ? ` · ${t('é sobre ela')}` : ''}
									</label>
								{/each}
								<button
									class="botao botao--secundario botao--pequeno"
									type="button"
									onclick={() =>
										executar(
											supabase.rpc('compartilhar_anotacao', {
												p_id: a.id,
												p_delegacoes: compartilhar[a.id] ?? a.compartilhada.map((c) => c.delegacao_id)
											}),
											t('Compartilhamento salvo.')
										)}>{t('Salvar o compartilhamento')}</button
								>
							</fieldset>
						</details>
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							onclick={() => confirm(t('Apagar esta anotação?')) && executar(supabase.rpc('apagar_anotacao', { p_id: a.id }), t('Anotação apagada.'))}
							>{t('Apagar')}</button
						>
					</div>
				</li>
			{:else}
				<li class="suave">{t('Nada anotado aqui ainda.')}</li>
			{/each}
		</ul>
	</div>

	{#if recebidas.length}
		<section aria-labelledby="t-recebidas">
			<h2 id="t-recebidas">{t('Compartilhadas com a sua delegação')}</h2>
			<ul class="lista anotacoes">
				{#each recebidas as a (a.id)}
					<li>
						<div>
							<span class="rotulo">{t('De {delegacao}', { delegacao: nomeDe(a.delegacao_id) })}</span>
							{#if a.titulo}<strong>{a.titulo}</strong>{/if}
							<p class="texto-nota">{a.texto}</p>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<Modal classe="leitura-fala" bind:this={leitura} nome={t('Texto da fala')}>
		{#if lendo}
			{#if lendo.titulo}<h2>{lendo.titulo}</h2>{/if}
			<p>{lendo.texto}</p>
		{/if}
		<form method="dialog"><button class="botao botao--secundario">{t('Fechar')}</button></form>
	</Modal>
{/if}
