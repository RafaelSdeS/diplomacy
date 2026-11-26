<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import { onDestroy } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { semAcentos } from '#lib/palavroes.ts';
	import { mensagemDeErro } from '#lib/sessao.ts';
	import { supabase } from '#lib/supabase.ts';
	import type { PageProps, Snapshot } from './$types';

	let { data }: PageProps = $props();

	let busca = $state('');
	let erro = $state('');
	let mensagem = $state('');
	const encontrados = $derived(
		busca.trim().length < 2
			? []
			: data.pessoas
					.filter((p) => semAcentos(`${p.nome} ${p.email}`).includes(semAcentos(busca.trim())))
					.slice(0, 20)
	);

	async function marcar(email: string, presente: boolean) {
		erro = mensagem = '';
		const { error } = await supabase.rpc('marcar_checkin', { p_evento: data.evento, p_email: email, p_presente: presente });
		if (error) erro = mensagemDeErro(error);
		await invalidate('app:checkin');
	}

	// Quem perdeu o crachá: um código curto (30 min, uma vez) ou a revogação do crachá.
	async function gerarCodigo(email: string, nome: string) {
		erro = mensagem = '';
		const { data: codigo, error } = await supabase.rpc('emitir_codigo', { p_evento: data.evento, p_email: email });
		if (error) erro = mensagemDeErro(error);
		else mensagem = `Código de ${nome}: ${codigo} (vale por 30 minutos, uma vez, em "Entrar").`;
	}
	async function revogar(email: string, nome: string) {
		erro = mensagem = '';
		const { error } = await supabase.rpc('revogar_credenciais', { p_evento: data.evento, p_email: email });
		if (error) erro = mensagemDeErro(error);
		else mensagem = `O crachá e os códigos de ${nome} não entram mais.`;
	}

	// Leitura do QR do crachá pela câmera, nos navegadores com BarcodeDetector; nos
	// outros, a busca por nome resolve.
	const temCamera = typeof window !== 'undefined' && 'BarcodeDetector' in window;
	let video = $state<HTMLVideoElement>();
	let lendo = $state(false);
	let fluxo: MediaStream | undefined;

	async function lerCracha() {
		erro = mensagem = '';
		try {
			fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
		} catch {
			erro = 'Não foi possível abrir a câmera.';
			return;
		}
		lendo = true;
		await Promise.resolve();
		video!.srcObject = fluxo;
		await video!.play();
		// @ts-expect-error BarcodeDetector ainda não está nos tipos do TypeScript
		const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
		while (lendo) {
			const [qr] = await detector.detect(video!).catch(() => []);
			const codigo = qr?.rawValue?.split('#')[1];
			if (codigo) {
				parar();
				const { data: email, error } = await supabase.rpc('checkin_por_cracha', { p_evento: data.evento, p_codigo: codigo });
				if (error) erro = mensagemDeErro(error);
				else mensagem = `Presença marcada: ${data.pessoas.find((p) => p.email === email)?.nome ?? email}.`;
				await invalidate('app:checkin');
				return;
			}
			await new Promise((pronto) => setTimeout(pronto, 250));
		}
	}

	function parar() {
		lendo = false;
		fluxo?.getTracks().forEach((t) => t.stop());
	}
	onDestroy(parar);

	// O "Voltar" devolve a busca (snapshot do SvelteKit).
	export const snapshot: Snapshot<string> = { capture: () => busca, restore: (v) => (busca = v) };
</script>

<svelte:head>
	<title>{tituloDaAba('Check-in', 'Secretaria')}</title>
</svelte:head>

<p class="rotulo">Secretaria</p>
<h1>Check-in</h1>
<p class="suave">{data.presentes.size} de {data.pessoas.length} presentes hoje.</p>

{#if temCamera}
	<p>
		{#if lendo}
			<button class="botao botao--secundario" type="button" onclick={parar}>Parar a câmera</button>
		{:else}
			<button class="botao" type="button" onclick={lerCracha}>Ler o QR do crachá</button>
		{/if}
	</p>
	{#if lendo}<video class="leitor-qr" bind:this={video} muted playsinline></video>{/if}
{/if}

{#if erro}
	<p class="erro" role="alert">{erro}</p>
{/if}
{#if mensagem}
	<p class="sucesso" role="status">{mensagem}</p>
{/if}

<label class="campo">
	Buscar por nome ou e-mail
	<input type="search" autocomplete="off" bind:value={busca} />
</label>

<ul class="lista" aria-label="Pessoas encontradas">
	{#each encontrados as p (p.email)}
		{@const presente = data.presentes.has(p.email)}
		<li>
			<span>
				<strong>{p.nome}</strong>
				<span class="detalhe">{p.papeis.join('; ')}</span>
			</span>
			<span class="acoes">
				{#if presente}
					<span class="selo selo--ok">Presente</span>
					<button class="botao botao--secundario botao--pequeno" type="button" aria-label={`Desfazer a presença de ${p.nome}`} onclick={() => marcar(p.email, false)}>Desfazer</button>
				{:else}
					<button class="botao botao--pequeno" type="button" aria-label={`Marcar presença de ${p.nome}`} onclick={() => marcar(p.email, true)}>Marcar presença</button>
				{/if}
				<button class="botao botao--secundario botao--pequeno" type="button" aria-label={`Gerar código de acesso para ${p.nome}`} onclick={() => gerarCodigo(p.email, p.nome)}>Gerar código</button>
				<button class="botao botao--secundario botao--pequeno" type="button" aria-label={`Revogar o crachá de ${p.nome}`} onclick={() => revogar(p.email, p.nome)}>Revogar crachá</button>
			</span>
		</li>
	{:else}
		{#if busca.trim().length >= 2}<li class="suave">Ninguém encontrado.</li>{/if}
	{/each}
</ul>
