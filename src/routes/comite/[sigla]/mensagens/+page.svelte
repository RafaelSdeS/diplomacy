<script lang="ts">
	import { conversa, lerLidas, marcarLida, naoLidas } from '#lib/nao-lidas.ts';
	import { formatarHora } from '#lib/cronograma.ts';
	import { semAcento } from '#lib/filtro.ts';
	import Bandeira from '#lib/ui/Bandeira.svelte';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Gavel from '@lucide/svelte/icons/gavel';
	import Siren from '@lucide/svelte/icons/siren';
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import Quando from '#lib/ui/Quando.svelte';
	import { contador } from '#lib/contador.ts';
	import { guardarRascunho, lerRascunho } from '#lib/rascunho.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { untrack } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { caixa, mensagemDoEnvio } from '#lib/caixa.ts';
	import { formatarQuando } from '#lib/cronograma.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import AoVivo from '#lib/ui/AoVivo.svelte';
	import ResponderEntrevista from '#lib/ui/ResponderEntrevista.svelte';
	import AcaoEmModal from '#lib/ui/AcaoEmModal.svelte';
	import NomeDelegacao from '#lib/ui/NomeDelegacao.svelte';
	import MessageSquarePlus from '@lucide/svelte/icons/message-square-plus';
	import Send from '@lucide/svelte/icons/send';
	import Ban from '@lucide/svelte/icons/ban';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Escolha from '#lib/ui/Escolha.svelte';
	import type { PageProps, Snapshot } from './$types';

	let { data }: PageProps = $props();
	const agora = new Date();

	const papeis = $derived(data.participacoes.filter((p) => p.comite_id === data.comite.id || p.papel === 'secretaria'));
	const eu = $derived(papeis.find((p) => p.papel === 'delegado'));
	const ehMesa = $derived(papeis.some((p) => p.papel === 'mesa' || p.papel === 'secretaria'));
	const ehCrise = $derived(papeis.some((p) => p.papel === 'crise'));
	const canais = $derived([
		...(eu?.delegacao_id ? [`delegacao:${eu.delegacao_id}`] : []),
		...(ehMesa ? [`mesa:${data.comite.id}`] : []),
		...(ehCrise ? [`crise:${data.comite.id}`] : [])
	]);
	const nome = (id: string | null) => data.delegacoes.find((d) => d.id === id)?.nome ?? t('Mesa');
	// Passo 51 (lote 3): as conversas como num aplicativo de mensagens. Cada uma tem a chave da
	// contagem de não lidas (#lib/nao-lidas.ts): o bilhete pela outra delegação, a conversa com a
	// mesa pela delegação; o canal interno (mesa e crise) fica fixo, sem contagem.
	type Msg = (typeof data.mensagens)[number];
	type Delegacao = (typeof data.delegacoes)[number];
	type Conversa = { id: string; titulo: string; tipo: 'bilhete' | 'mesa' | 'interno'; msgs: Msg[]; destino: string | null; delegacao?: Delegacao };
	const quando = (m: { criado_em: string }) => Date.parse(m.criado_em);
	const lista = $derived.by((): Conversa[] => {
		const r: Conversa[] = [];
		if (ehMesa || ehCrise)
			r.push({ id: 'interno', titulo: ehMesa ? t('Equipe de crise') : t('Mesa diretora'), tipo: 'interno', msgs: do_tipo('interno'), destino: null });
		if (eu?.delegacao_id) {
			r.push({ id: `m:${eu.delegacao_id}`, titulo: t('Mesa diretora'), tipo: 'mesa', msgs: do_tipo('mesa'), destino: null });
			for (const c of conversas) r.push({ id: `b:${c.id}`, titulo: c.delegacao?.nome ?? '', tipo: 'bilhete', msgs: c.msgs, destino: c.id, delegacao: c.delegacao });
		} else if (ehMesa) {
			for (const c of conversasDaMesa) r.push({ id: `m:${c.id}`, titulo: c.delegacao?.nome ?? '', tipo: 'mesa', msgs: c.msgs, destino: c.id, delegacao: c.delegacao });
		}
		return r.map((c) => ({ ...c, msgs: [...c.msgs].sort((a, b) => quando(a) - quando(b)) }));
	});
	let busca = $state('');
	const visiveis = $derived(
		lista.filter((c) => !busca.trim() || semAcento(`${c.titulo} ${c.msgs.map((m) => m.texto).join(' ')}`).includes(semAcento(busca.trim())))
	);
	let aberta = $state<string | null>(null);
	const conversaAberta = $derived(lista.find((c) => c.id === aberta) ?? null);
	// No notebook, a conversa mais recente já vem aberta; no celular, a lista vem primeiro.
	let escolhida = false;
	$effect(() => {
		if (escolhida || !lista.length) return;
		escolhida = true;
		const recente = [...lista].filter((c) => c.msgs.length).sort((a, b) => quando(b.msgs.at(-1)!) - quando(a.msgs.at(-1)!))[0];
		if (matchMedia('(min-width: 1024px)').matches) untrack(() => abrir((recente ?? lista[0]).id));
	});
	// O rascunho de cada conversa fica no aparelho.
	let escrita = $state<Record<string, string>>({});
	const chaveRascunho = (id: string) => `conversa:${untrack(() => data.comite.sigla)}:${id}`;
	function abrir(id: string) {
		aberta = id;
		escrita[id] ??= lerRascunho(chaveRascunho(id));
	}
	$effect(() => {
		if (aberta) guardarRascunho(chaveRascunho(aberta), escrita[aberta] ?? '');
	});
	// Aberta, a conversa conta como lida (também o que chega com ela aberta).
	$effect(() => {
		const c = conversaAberta;
		void c?.msgs.length;
		if (c && c.tipo !== 'interno') untrack(() => marcarLida(data.comite.id, c.id));
	});
	let lidasVersao = $state(0);
	$effect(() => {
		const aoLer = () => lidasVersao++;
		addEventListener('lidas', aoLer);
		return () => removeEventListener('lidas', aoLer);
	});
	const temNovas = (c: Conversa) => {
		void lidasVersao;
		const minha = eu?.delegacao_id ?? null;
		return naoLidas(c.msgs, minha, lerLidas(data.comite.id)).some((m) => conversa(m, minha) === c.id);
	};
	// De quem é cada mensagem: o meu lado à direita.
	const minhaMsg = (c: Conversa, m: Msg) =>
		c.tipo === 'bilhete' ? m.de_delegacao_id === eu?.delegacao_id : c.tipo === 'mesa' ? (eu ? !!m.de_delegacao_id : !m.de_delegacao_id) : m.autor_id === data.usuario?.id;
	const quemEscreveu = (c: Conversa, m: Msg) =>
		[c.tipo === 'bilhete' ? c.titulo : c.tipo === 'mesa' ? (eu ? t('Mesa') : c.titulo) : '', m.autor?.nome].filter(Boolean).join(' · ');
	const podeEscrever = (c: Conversa) =>
		c.tipo === 'bilhete' ? !!eu && !data.regras.bilhetes_bloqueados && !!c.destino && !meBloquearam.has(c.destino) : true;
	// Os separadores por sessão: a sessão em que a mensagem foi escrita.
	const sessaoDe = (iso: string) => [...data.sessoes].reverse().find((s) => Date.parse(s.inicio) <= Date.parse(iso)) ?? null;
	const separador = (iso: string) => {
		const s = sessaoDe(iso);
		return s ? `${t('Sessão {n}', { n: s.numero })} · ${formatarHora(s.inicio)}` : t('Antes das sessões');
	};
	let rolagem = $state<HTMLOListElement>();
	$effect(() => {
		void conversaAberta?.msgs.length;
		if (rolagem) rolagem.scrollTop = rolagem.scrollHeight;
	});
	async function enviarNaConversa(evento: SubmitEvent) {
		evento.preventDefault();
		const c = conversaAberta;
		const texto = (c && escrita[c.id])?.trim();
		if (!c || !texto) return;
		escrita[c.id] = '';
		if (!(await enviarTexto(c.tipo, texto, c.destino, ''))) escrita[c.id] = texto;
	}
	function teclaEnviar(evento: KeyboardEvent) {
		if (evento.key === 'Enter' && !evento.shiftKey) {
			evento.preventDefault();
			(evento.currentTarget as HTMLTextAreaElement).form?.requestSubmit();
		}
	}
	const do_tipo = (tipo: string) => data.mensagens.filter((m) => m.tipo === tipo);
	// Passo 51 (lote 0b): os bilhetes agrupados pela outra delegação, a conversa mais recente primeiro.
	const conversas = $derived.by(() => {
		const porDelegacao = new Map<string, (typeof data.mensagens)[number][]>();
		for (const m of do_tipo('bilhete')) {
			const outra = m.de_delegacao_id === eu?.delegacao_id ? m.para_delegacao_id : m.de_delegacao_id;
			if (!outra) continue;
			porDelegacao.set(outra, [...(porDelegacao.get(outra) ?? []), m]);
		}
		return [...porDelegacao]
			.map(([id, msgs]) => ({ id, delegacao: data.delegacoes.find((d) => d.id === id), msgs: msgs.sort((a, b) => quando(a) - quando(b)) }))
			.sort((a, b) => quando(b.msgs[b.msgs.length - 1]) - quando(a.msgs[a.msgs.length - 1]));
	});
	// A conversa da mesa com cada delegação (a mensagem é da delegação ou da mesa para ela).
	const conversasDaMesa = $derived.by(() => {
		const porDelegacao = new Map<string, (typeof data.mensagens)[number][]>();
		for (const m of do_tipo('mesa')) {
			const d = m.de_delegacao_id ?? m.para_delegacao_id;
			if (d) porDelegacao.set(d, [...(porDelegacao.get(d) ?? []), m]);
		}
		return [...porDelegacao]
			.map(([id, msgs]) => ({ id, delegacao: data.delegacoes.find((d) => d.id === id), msgs: msgs.sort((a, b) => quando(a) - quando(b)) }))
			.sort((a, b) => quando(b.msgs[b.msgs.length - 1]) - quando(a.msgs[a.msgs.length - 1]));
	});
	let respostaDaMesa = $state<AcaoEmModal>();

	let erro = $state('');
	let mensagem = $state('');
	let novoBilhete = $state<AcaoEmModal>();
	// Vindo de "Mandar bilhete" (?para=), o bilhete já abre com o destinatário escolhido.
	$effect(() => {
		if (novoBilhete && untrack(() => page.url.searchParams.has('para'))) novoBilhete.abrir();
	});
	// O bilhete em edição fica guardado no aparelho (passo 38).
	const RASCUNHO = `bilhete:${untrack(() => data.comite.sigla)}`;
	let texto = $state<Record<string, string>>({ bilhete: lerRascunho(RASCUNHO), resposta: '' });
	$effect(() => guardarRascunho(RASCUNHO, texto.bilhete));
	let para = $state(page.url.searchParams.get('para') ?? '');
	let responderA = $state('');
	let bloquear = $state('');

	// Bloqueios de bilhetes (passo 24): os que a sua delegação fez e os que recebeu.
	const bloqueei = $derived(new Set(data.bloqueios.filter((b) => b.delegacao_id === eu?.delegacao_id).map((b) => b.bloqueada_id)));
	const meBloquearam = $derived(new Set(data.bloqueios.filter((b) => b.bloqueada_id === eu?.delegacao_id).map((b) => b.delegacao_id)));
	const bloquearBilhetes = (delegacao: string, sim: boolean) =>
		executar(
			supabase.rpc('bloquear_bilhetes', { p_comite: data.comite.id, p_delegacao: delegacao, p_bloquear: sim }),
			sim ? t('Bilhetes de {delegacao} bloqueados.', { delegacao: nome(delegacao) }) : t('Bilhetes de {delegacao} desbloqueados.', { delegacao: nome(delegacao) })
		);

	async function enviarTexto(tipo: 'bilhete' | 'mesa' | 'interno', conteudo: string, destino: string | null, enviado: string) {
		erro = mensagem = '';
		const id = crypto.randomUUID();
		const resultado = await caixa.enviar({
			id,
			rpc: 'enviar_mensagem',
			args: { p_id: id, p_comite: data.comite.id, p_tipo: tipo, p_texto: conteudo, p_para: destino ?? undefined },
			rotulo: tipo === 'bilhete' ? t('Bilhete para {delegacao}', { delegacao: nome(destino) }) : t('Mensagem')
		});
		({ erro, mensagem } = mensagemDoEnvio(resultado, enviado));
		await invalidate('app:mensagens');
		return !erro;
	}
	async function enviar(tipo: 'bilhete' | 'mesa' | 'interno', campo: string, destino: string | null, enviado: string) {
		await enviarTexto(tipo, texto[campo], destino, enviado);
		if (!erro) {
			texto[campo] = '';
			// Passo 51 (lote 3): enviado o bilhete novo, a conversa com a delegação abre.
			if (destino) abrir(tipo === 'bilhete' ? `b:${destino}` : `m:${destino}`);
			// Passo 51: o modal fecha quando a mensagem sai (ou fica guardada para sair depois).
			if (tipo === 'bilhete') novoBilhete?.fechar();
			if (tipo === 'mesa') respostaDaMesa?.fechar();
		}
		await invalidate('app:mensagens');
	}

	async function executar(acao: PromiseLike<{ error: { code?: string; message?: string } | null }>, ok: string) {
		erro = mensagem = '';
		const { error } = await acao;
		if (error) erro = mensagemDeErro(error);
		else mensagem = ok;
		await invalidate('app:mensagens');
	}

	// Mesa: a regra dos bilhetes do comitê.
	let mesaLe = $state(false);
	let bloqueados = $state(false);
	$effect(() => {
		mesaLe = data.regras.mesa_le_bilhetes;
		bloqueados = !!data.regras.bilhetes_bloqueados;
	});

	// O "Voltar" devolve a busca (snapshot do SvelteKit).
	export const snapshot: Snapshot<string> = { capture: () => busca, restore: (v) => (busca = v) };
</script>

<svelte:head>
	<title>{tituloDaAba(t('Mensagens'), data.comite.sigla)}</title>
</svelte:head>

<p class="rotulo">
	{t('Comitê')} · {data.comite.sigla}
	<AoVivo comiteId={data.comite.id} {canais} tabelas={['mensagem', 'entrevista', 'bloqueio_bilhete']} dependencia="app:mensagens" />
</p>
<h1>{t('Mensagens')}</h1>
<div class="mensagens-topo">
	<p class="telegrama" role="note" aria-label={t('Regra dos bilhetes')}>
		{data.regras.bilhetes_bloqueados
			? t('A mesa bloqueou os bilhetes neste comitê.')
			: data.regras.mesa_le_bilhetes
				? t('A mesa pode ler os bilhetes deste comitê.')
				: t('Os bilhetes deste comitê só são lidos por quem envia e por quem recebe.')}
	</p>
	<!-- Bloquear quem escreveu fica no "Mais opções" da conversa; o resto dos bloqueios, e a
	     moderação da mesa, num modal: a conversa fica com a tela. -->
	{#if eu}
		<AcaoEmModal rotulo={bloqueei.size ? `${t('Bloqueios')} (${bloqueei.size})` : t('Bloqueios')} titulo={t('Bloqueios')} icone={Ban} secundario>
			<h4>{t('Sua delegação não recebe bilhetes de')}</h4>
			<ul class="lista">
				{#each data.delegacoes.filter((d) => bloqueei.has(d.id)) as d (d.id)}
					<li>
						<span>{d.nome}</span>
						<button
							class="botao botao--secundario botao--pequeno"
							type="button"
							aria-label={t('Desbloquear {delegacao}', { delegacao: d.nome })}
							onclick={() => bloquearBilhetes(d.id, false)}>{t('Desbloquear')}</button
						>
					</li>
				{:else}
					<li class="suave">{t('Nenhuma delegação bloqueada.')}</li>
				{/each}
			</ul>
			<form
				class="formulario"
				aria-label={t('Bloquear bilhetes')}
				onsubmit={(e) => {
					e.preventDefault();
					if (bloquear) void bloquearBilhetes(bloquear, true).then(() => (bloquear = ''));
				}}
			>
				<Escolha
					unica
					rotulo={t('Delegação')}
					botao={t('Escolher')}
					opcoes={data.delegacoes.filter((d) => d.id !== eu.delegacao_id && !bloqueei.has(d.id))}
					bind:valor={bloquear}
				/>
				<button class="botao botao--secundario">{t('Bloquear bilhetes desta delegação')}</button>
			</form>
			{#if meBloquearam.size}
				<h4>{t('Não aceitam bilhetes da sua delegação')}</h4>
				<ul class="lista" aria-label={t('Não aceitam bilhetes da sua delegação')}>
					{#each data.delegacoes.filter((d) => meBloquearam.has(d.id)) as d (d.id)}
						<li>{d.nome}</li>
					{/each}
				</ul>
			{/if}
		</AcaoEmModal>
	{:else if ehMesa}
		<AcaoEmModal rotulo={t('Moderação dos bilhetes')} icone={ShieldCheck} secundario>
		<section aria-labelledby="t-regra">
			<h4 id="t-regra">{t('Regra dos bilhetes')}</h4>
			<form
				class="formulario"
				onsubmit={(e) => {
					e.preventDefault();
					void executar(supabase.rpc('definir_bilhetes', { p_comite: data.comite.id, p_mesa_le: mesaLe, p_bloqueados: bloqueados }), t('Regra salva.'));
				}}
			>
				<label class="opcao"><input type="checkbox" bind:checked={mesaLe} /> {t('A mesa pode ler os bilhetes')}</label>
				<label class="opcao"><input type="checkbox" bind:checked={bloqueados} /> {t('Bloquear os bilhetes')}</label>
				<button class="botao botao--secundario">{t('Salvar a regra')}</button>
			</form>
		</section>
		{#if data.bloqueios.length}
			<section aria-labelledby="t-bloqueios-comite">
				<h4 id="t-bloqueios-comite">{t('Bloqueios no comitê')}</h4>
				<ul class="lista">
					{#each data.bloqueios as b (`${b.delegacao_id}-${b.bloqueada_id}`)}
						<li>{t('{delegacao} não recebe bilhetes de {bloqueada}', { delegacao: nome(b.delegacao_id), bloqueada: nome(b.bloqueada_id) })}</li>
					{/each}
				</ul>
			</section>
		{/if}
		{#if do_tipo('bilhete').length}
			<section aria-labelledby="t-bilhetes-mesa">
				<h4 id="t-bilhetes-mesa">{t('Bilhetes do comitê')}</h4>
				<ul class="lista">
					{#each do_tipo('bilhete') as m (m.id)}
						<li>
							<span>
								<strong>{nome(m.de_delegacao_id)} → {nome(m.para_delegacao_id)}</strong>
								{m.texto}
								{#if m.oculta}<span class="selo selo--erro">{t('Oculto')}</span>{/if}
							</span>
							{#if !m.oculta}
								<button
									class="botao botao--secundario botao--pequeno"
									type="button"
									onclick={() => executar(supabase.rpc('ocultar_mensagem', { p_mensagem: m.id, p_motivo: t('Fora do personagem') }), t('Bilhete ocultado.'))}
									>{t('Ocultar')}</button
								>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
		</AcaoEmModal>
	{/if}
</div>

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

{#if eu}
	{@const minhas = data.entrevistas.filter((e) => e.delegacao_id === eu.delegacao_id)}
	{#if minhas.length}
		<section aria-labelledby="t-entrevistas">
			<h2 id="t-entrevistas">{t('Pedidos de entrevista')}</h2>
			<ul class="lista">
				{#each minhas as e (e.id)}
					<li>
						<span>
							<strong>{e.veiculo?.nome}</strong>: {e.tema}
							<span class="detalhe">
								{e.status === 'aceita' && e.horario ? `${t('Aceita para')} ${formatarQuando(e.horario, agora)}` : e.status === 'recusada' ? t('Recusada') : t('Esperando a sua resposta')}
							</span>
						</span>
						{#if e.status === 'pedida'}
							<ResponderEntrevista
								entrevista={e}
								onfeito={(m) => {
									erro = '';
									mensagem = m;
									invalidate('app:mensagens');
								}}
							/>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}

<!-- Passo 51 (lote 3): as conversas como num aplicativo de mensagens. No notebook, a lista à
     esquerda e a conversa aberta à direita; no celular, uma de cada vez, com "Voltar". -->
<div class={['chat', conversaAberta && 'chat--aberta']}>
	<section class="chat-lista" aria-label={t('Conversas')}>
		<div class="chat-topo">
			<label class="so-leitor" for="busca-conversa">{t('Buscar nas conversas')}</label>
			<input id="busca-conversa" type="search" placeholder={t('Buscar')} bind:value={busca} />
			{#if eu && !data.regras.bilhetes_bloqueados}
			<AcaoEmModal
				bind:this={novoBilhete}
				rotulo={t('Novo bilhete')}
				icone={MessageSquarePlus}
				descricao={t('Um recado curto para outra delegação, durante a sessão.')}
			>
				<form
					class="formulario"
					aria-label={t('Novo bilhete')}
					onsubmit={(e) => {
						e.preventDefault();
						void enviar('bilhete', 'bilhete', para, t('Bilhete enviado.'));
					}}
				>
					<Escolha
						unica
						rotulo={t('Para')}
						botao={t('Escolher')}
						opcoes={data.delegacoes
							.filter((d) => d.id !== eu.delegacao_id)
							.map((d) => ({ ...d, desabilitada: meBloquearam.has(d.id), detalhe: meBloquearam.has(d.id) ? t('não aceita seus bilhetes') : undefined }))}
						bind:valor={para}
					/>
					<label class="campo">
						{t('Bilhete')}
						<textarea required rows="3" maxlength="1000" bind:value={texto.bilhete} {@attach contador(texto.bilhete)}></textarea>
					</label>
					{#if erro}<p class="erro">{erro}</p>{/if}
					<div class="acoes">
						<button class="botao">{t('Enviar bilhete')}</button>
						<button class="botao botao--secundario" type="button" onclick={() => novoBilhete?.fechar()}>{t('Cancelar')}</button>
					</div>
				</form>
			</AcaoEmModal>
			{:else if ehMesa}
			<AcaoEmModal bind:this={respostaDaMesa} rotulo={t('Escrever a uma delegação')} icone={Send} descricao={t('Só a delegação escolhida lê.')}>
				<form
					class="formulario"
					aria-label={t('Resposta da mesa')}
					onsubmit={(e) => {
						e.preventDefault();
						void enviar('mesa', 'resposta', responderA, t('Resposta enviada.'));
					}}
				>
					<Escolha unica rotulo={t('Para a delegação')} botao={t('Escolher')} opcoes={data.delegacoes} bind:valor={responderA} />
					<label class="campo">
						{t('Resposta')}
						<textarea required rows="3" maxlength="1000" bind:value={texto.resposta} {@attach contador(texto.resposta)}></textarea>
					</label>
					{#if erro}<p class="erro">{erro}</p>{/if}
					<div class="acoes">
						<button class="botao">{t('Enviar')}</button>
						<button class="botao botao--secundario" type="button" onclick={() => respostaDaMesa?.fechar()}>{t('Cancelar')}</button>
					</div>
				</form>
			</AcaoEmModal>
			{/if}
		</div>
		<ul class="chat-itens">
			{#each visiveis as c (c.id)}
				{@const ultima = c.msgs.at(-1)}
				<li>
					<button
						class={['chat-item', c.id === aberta && 'chat-item--aberto']}
						type="button"
						aria-current={c.id === aberta ? 'true' : undefined}
						onclick={() => abrir(c.id)}
					>
						<span class="chat-avatar" aria-hidden="true"
							>{#if c.delegacao}<Bandeira codigo={c.delegacao.bandeira} />{:else if c.tipo === 'interno'}<Siren size={18} strokeWidth={1.75} />{:else}<Gavel
									size={18}
									strokeWidth={1.75}
								/>{/if}</span
						>
						<span class="chat-item-texto">
							<span class="chat-item-nome">{c.titulo}</span>
							<span class="chat-item-previa"
								>{ultima ? `${minhaMsg(c, ultima) ? `${t('Você')}: ` : ''}${ultima.texto}` : t('Nenhuma mensagem ainda.')}</span
							>
						</span>
						<span class="chat-item-hora">
							{#if ultima}<Quando iso={ultima.criado_em} />{/if}
							{#if temNovas(c)}<span class="chat-ponto"><span class="so-leitor">{t('não lida')}</span></span>{/if}
						</span>
					</button>
				</li>
			{:else}
				<li class="suave">{busca ? t('Nenhuma conversa encontrada.') : t('Nenhum bilhete ainda. "Novo bilhete" escreve a outra delegação.')}</li>
			{/each}
		</ul>
	</section>

	<section class="chat-conversa" aria-label={conversaAberta?.titulo ?? t('Conversa')}>
		{#if conversaAberta}
			{@const c = conversaAberta}
			<header class="chat-cabecalho">
				<button class="botao botao--secundario botao--pequeno chat-voltar" type="button" onclick={() => (aberta = null)}
					><ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Voltar')}</button
				>
				{#if c.delegacao}<NomeDelegacao sigla={data.comite.sigla} delegacao={c.delegacao} />{:else}<strong>{c.titulo}</strong>{/if}
				{#if c.tipo === 'bilhete' && eu && c.destino}
					{@const destino = c.destino}
					<details class="mais-opcoes">
						<summary class="botao botao--secundario botao--pequeno">{t('Mais opções')}</summary>
						<div class="mais-opcoes-corpo">
							<button class="botao botao--secundario botao--pequeno" type="button" onclick={() => bloquearBilhetes(destino, !bloqueei.has(destino))}
								>{bloqueei.has(destino) ? t('Desbloquear {delegacao}', { delegacao: c.titulo }) : t('Bloquear bilhetes desta delegação')}</button
							>
						</div>
					</details>
				{/if}
			</header>
			<!-- Passo 51: a conversa rola sozinha; com tabindex, o teclado também a rola (axe, rolagem focável). -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<ol class="chat-mensagens" bind:this={rolagem} tabindex="0" aria-label={t('Mensagens com {quem}', { quem: c.titulo })}>
				{#each c.msgs as m, i (m.id)}
					{@const minha = minhaMsg(c, m)}
					{#if i === 0 || separador(c.msgs[i - 1].criado_em) !== separador(m.criado_em)}
						<li class="chat-separador"><span>{separador(m.criado_em)}</span></li>
					{/if}
					<li class={['balao', minha ? 'balao--meu' : 'balao--outro']}>
						<span class="balao-autor">{minha ? (m.autor_id === data.usuario?.id ? t('Você') : (m.autor?.nome ?? t('Sua delegação'))) : quemEscreveu(c, m)}</span>
						<p class="balao-texto">{m.texto}</p>
						<span class="balao-hora"><Quando iso={m.criado_em} /></span>
						{#if !minha && c.tipo === 'bilhete'}
							<details class="denunciar">
								<summary>{t('Denunciar')}</summary>
								<button
									class="botao botao--secundario botao--pequeno"
									type="button"
									onclick={() =>
										executar(supabase.rpc('denunciar_mensagem', { p_mensagem: m.id, p_motivo: t('Fora do personagem ou ofensivo') }), t('Bilhete denunciado à mesa.'))}
									>{t('Denunciar à mesa')}</button
								>
							</details>
						{/if}
					</li>
				{:else}
					<li class="suave">{c.tipo === 'mesa' && eu ? t('Dúvidas e pedidos privados à mesa: só a mesa lê.') : t('Nenhuma mensagem ainda.')}</li>
				{/each}
			</ol>
			{#if podeEscrever(c)}
				<form class="chat-escrever" onsubmit={enviarNaConversa}>
					<label class="so-leitor" for="chat-texto">{t('Escrever para {quem}', { quem: c.titulo })}</label>
					<textarea
						id="chat-texto"
						rows="2"
						maxlength="1000"
						placeholder={t('Escreva; Enter envia, Shift+Enter quebra a linha')}
						bind:value={escrita[c.id]}
						onkeydown={teclaEnviar}
					></textarea>
					<button class="botao"><Send aria-hidden="true" size={16} strokeWidth={1.75} /> {t('Enviar')}</button>
				</form>
			{:else}
				<p class="suave chat-aviso">
					{data.regras.bilhetes_bloqueados ? t('A mesa bloqueou os bilhetes neste comitê.') : t('Esta delegação não aceita bilhetes da sua.')}
				</p>
			{/if}
		{:else}
			<p class="suave chat-vazio">{t('Escolha uma conversa.')}</p>
		{/if}
	</section>
</div>
