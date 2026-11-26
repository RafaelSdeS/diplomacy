<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { invalidate } from '$app/navigation';
	import { PAPEIS } from '#lib/papeis.ts';
	import { supabase, type Papel } from '#lib/supabase.ts';
	import Confirmar from '#lib/ui/Confirmar.svelte';
	import Escolha from '#lib/ui/Escolha.svelte';
	import AcaoEmModal from '#lib/ui/AcaoEmModal.svelte';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';
	import type { PageProps, Snapshot } from './$types';

	let { data }: PageProps = $props();

	let email = $state('');
	let papel = $state<Papel>('delegado');
	let comite = $state('');
	let delegacao = $state('');
	let erro = $state('');
	let enviando = $state(false);

	const delegacoesDoComite = $derived(data.delegacoes.filter((d) => d.comite_id === comite));

	// Passo 51 (lote da secretaria): o convite abre num modal; as listas têm busca e filtros.
	let modalConvite = $state<AcaoEmModal>();
	let busca = $state('');
	let filtroComite = $state('');
	let filtroPapel = $state('');
	const filtrando = $derived(!!(busca.trim() || filtroComite || filtroPapel));
	const passa = (item: { papel: Papel; comite_id: string | null }, texto: string) =>
		(!filtroComite || item.comite_id === filtroComite) &&
		(!filtroPapel || item.papel === filtroPapel) &&
		texto.toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR'));
	const convites = $derived(data.convites.filter((c) => passa(c, c.email)));
	const inscritos = $derived(data.inscritos.filter((p) => passa(p, p.pessoa?.nome ?? '')));
	function limpar() {
		busca = filtroComite = filtroPapel = '';
	}

	function descrever(item: { papel: Papel; comite_id: string | null; delegacao_id: string | null }) {
		const partes = [PAPEIS.find((p) => p.valor === item.papel)?.rotulo ?? item.papel];
		const sigla = data.comites.find((c) => c.id === item.comite_id)?.sigla;
		const delegacao = data.delegacoes.find((d) => d.id === item.delegacao_id)?.nome;
		if (sigla) partes.push(sigla);
		if (delegacao) partes.push(delegacao);
		return partes.join(' · ');
	}

	async function convidar(evento: SubmitEvent) {
		evento.preventDefault();
		enviando = true;
		erro = '';
		const { error } = await supabase.from('convite').insert({
			email: email.trim().toLowerCase(),
			evento_id: data.evento,
			papel,
			comite_id: papel === 'secretaria' || papel === 'diretoria_press' ? null : comite,
			delegacao_id: papel === 'delegado' ? delegacao : null
		});
		enviando = false;
		if (error) {
			erro =
				error.code === '23505'
					? 'Este convite já existe.'
					: 'Não foi possível criar o convite. Confira o e-mail, o comitê e a delegação.';
			return;
		}
		email = '';
		modalConvite?.fechar();
		await invalidate('app:participantes');
	}

	async function remover(id: string) {
		erro = '';
		const { error } = await supabase.from('convite').delete().eq('id', id);
		if (error) {
			erro = 'Não foi possível remover o convite.';
			return;
		}
		await invalidate('app:participantes');
	}

	// Passo 44: tirar o acesso encerra as sessões da conta e as notificações dela (no banco).
	async function removerAcesso(id: string) {
		erro = '';
		const { error } = await supabase.from('participacao').delete().eq('id', id);
		if (error) {
			erro = 'Não foi possível remover o acesso.';
			return;
		}
		await invalidate('app:participantes');
	}

	// O "Voltar" devolve a busca e os filtros (snapshot do SvelteKit).
	export const snapshot: Snapshot<[string, string, string]> = {
		capture: () => [busca, filtroComite, filtroPapel],
		restore: (v) => ([busca, filtroComite, filtroPapel] = v)
	};
</script>

<svelte:head>
	<title>{tituloDaAba('Participantes')}</title>
</svelte:head>

<p class="rotulo">Secretaria</p>
<h1>Participantes</h1>
<div class="acoes">
	<AcaoEmModal
		bind:this={modalConvite}
		rotulo="Novo convite"
		icone={UserPlus}
		descricao="Cada convite dá um papel a um e-mail. Quem já tem conta recebe o papel na hora; quem ainda não tem, quando a conta for criada. Remover um convite não tira o papel de quem já o recebeu."
	>
		<form class="formulario" onsubmit={convidar}>
			<label class="campo">
				E-mail
				<input type="email" required autocomplete="off" bind:value={email} />
			</label>
			<label class="campo">
				Papel
				<select bind:value={papel}>
					{#each PAPEIS as p (p.valor)}
						<option value={p.valor}>{p.rotulo}</option>
					{/each}
				</select>
			</label>
			{#if papel !== 'secretaria' && papel !== 'diretoria_press'}
				<label class="campo">
					Comitê
					<select required bind:value={comite} onchange={() => (delegacao = '')}>
						<option value="" disabled>Escolha o comitê</option>
						{#each data.comites as c (c.id)}
							<option value={c.id}>{c.sigla} · {c.nome}</option>
						{/each}
					</select>
				</label>
			{/if}
			{#if papel === 'delegado'}
				<Escolha unica rotulo="Delegação" botao="Escolher" opcoes={delegacoesDoComite} bind:valor={delegacao} />
			{/if}
			{#if erro}
				<p class="erro" role="alert">{erro}</p>
			{/if}
			<button class="botao" disabled={enviando}>{enviando ? 'Enviando…' : 'Convidar'}</button>
		</form>
	</AcaoEmModal>
	<nav class="acoes" aria-label="Ferramentas da secretaria">
		<a class="botao botao--secundario" href="/secretaria/importar" {@attach dica(t('Cria os convites a partir da planilha CSV das inscrições.'))}>Importar inscrições</a>
		<a class="botao botao--secundario" href="/imprimir/crachas" {@attach dica(t('Abre os crachás de todos os participantes para imprimir.'))}>Crachás</a>
		<a class="botao botao--secundario" href="/secretaria/checkin" {@attach dica(t('Marca quem chegou, pela lista ou pelo QR do crachá.'))}>Check-in</a>
		<a class="botao botao--secundario" href="/secretaria/certificados" {@attach dica(t('Emite e imprime os certificados de quem fez check-in.'))}>Certificados</a>
		<a class="botao botao--secundario" href="/secretaria/dados" {@attach dica(t('Baixa o arquivo do evento e apaga os dados pessoais no fim.'))}>Dados e arquivo</a>
	</nav>
</div>

<div class="acoes filtros" role="search" aria-label="Filtrar participantes">
	<label class="campo">
		Buscar
		<input type="search" placeholder="Nome ou e-mail" bind:value={busca} />
	</label>
	<label class="campo">
		Filtrar por comitê
		<select bind:value={filtroComite}>
			<option value="">Todos os comitês</option>
			{#each data.comites as c (c.id)}
				<option value={c.id}>{c.sigla}</option>
			{/each}
		</select>
	</label>
	<label class="campo">
		Filtrar por papel
		<select bind:value={filtroPapel}>
			<option value="">Todos os papéis</option>
			{#each PAPEIS as p (p.valor)}
				<option value={p.valor}>{p.rotulo}</option>
			{/each}
		</select>
	</label>
	{#if filtrando}
		<button class="botao botao--secundario botao--pequeno" type="button" onclick={limpar} {@attach dica(t('Tira a busca e os filtros e mostra todos de novo.'))}>Limpar</button>
	{/if}
</div>
{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}

<div class="colunas-que-rolam">
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<section class="cartao" aria-labelledby="t-inscritos" tabindex="0">
		<h2 id="t-inscritos">Com acesso ({filtrando ? `${inscritos.length} de ${data.inscritos.length}` : data.inscritos.length})</h2>
		<ul class="lista">
			{#each inscritos as p (p.id)}
				<li>
					<span>
						{p.pessoa?.nome}
						<span class="detalhe">{descrever(p)}</span>
					</span>
					<Confirmar
						rotulo="Remover acesso"
						classe="botao botao--secundario botao--pequeno"
						pergunta={`Remover o acesso de ${p.pessoa?.nome ?? 'esta pessoa'} (${descrever(p)})?`}
						explicacao="A pessoa sai do app em todos os aparelhos agora e para de receber notificações. Para voltar, precisa de um convite novo."
						acao={() => removerAcesso(p.id)}
					/>
				</li>
			{:else}
				<li class="suave">{filtrando ? 'Ninguém com acesso neste filtro.' : 'Ninguém tem acesso ainda: crie convites ou importe as inscrições.'}</li>
			{/each}
		</ul>
	</section>

	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<section class="cartao" aria-labelledby="t-convites" tabindex="0">
		<h2 id="t-convites">Convites ({filtrando ? `${convites.length} de ${data.convites.length}` : data.convites.length})</h2>
		<ul class="lista">
			{#each convites as c (c.id)}
				<li>
					<span>
						{c.email}
						<span class="detalhe">{descrever(c)}</span>
					</span>
					<button
						class="botao botao--secundario botao--pequeno"
						type="button"
						aria-label={`Remover o convite de ${c.email}`}
						{@attach dica(t('Apaga o convite; quem já recebeu o papel continua com ele.'))}
						onclick={() => remover(c.id)}>Remover</button
					>
				</li>
			{:else}
				<li class="suave">{filtrando ? 'Nenhum convite neste filtro.' : 'Nenhum convite ainda: use "Novo convite" ou "Importar inscrições".'}</li>
			{/each}
		</ul>
	</section>
</div>
