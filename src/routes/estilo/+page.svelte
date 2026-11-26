<script lang="ts">
	import { tituloDaAba } from '#lib/titulo.svelte.ts';
	import Check from '@lucide/svelte/icons/check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import X from '@lucide/svelte/icons/x';
	import Modal from '#lib/ui/Modal.svelte';
	import Escolha from '#lib/ui/Escolha.svelte';
	import { dica } from '#lib/dica.ts';

	// Referência visual do app e base dos testes de aparência. Não tem dados e não fica no menu.
	let dialogo = $state<Modal>();
	let escolhida = $state('br');
	const paises = [
		['ar', 'Argentina'],
		['bo', 'Bolívia'],
		['br', 'Brasil'],
		['cl', 'Chile'],
		['py', 'Paraguai'],
		['pe', 'Peru'],
		['uy', 'Uruguai']
	].map(([bandeira, nome]) => ({ id: bandeira, nome, bandeira }));

	const cores = [
		['--cor-fundo', 'Fundo'],
		['--cor-superficie', 'Superfície'],
		['--cor-linha', 'Linha'],
		['--cor-texto', 'Texto'],
		['--cor-texto-suave', 'Texto suave'],
		['--cor-marinho', 'Marinho'],
		['--cor-dourado', 'Dourado'],
		['--cor-faixa', 'Faixa'],
		['--cor-fio-dourado', 'Fio dourado'],
		['--cor-vivo', 'Ao vivo']
	];
</script>

<svelte:head>
	<title>{tituloDaAba('Estilo')}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<p class="rotulo">Referência visual</p>
<h1>Estilo</h1>
<p class="suave">Cores, tipos e componentes base do app. Esta página não tem dados.</p>

<section aria-labelledby="t-cores">
	<h2 id="t-cores">Cores</h2>
	<ul class="amostras">
		{#each cores as [variavel, nome] (variavel)}
			<li><span class="amostra" style:background="var({variavel})"></span>{nome}</li>
		{/each}
	</ul>
</section>

<section aria-labelledby="t-tipos">
	<h2 id="t-tipos">Tipografia</h2>
	<p class="rotulo">Rótulo em versalete</p>
	<h3>Título de seção com serifa</h3>
	<p>Texto da interface na fonte do sistema. A palavra está com a delegação da França.</p>
	<p><span class="codigo-doc">EVENTO/CSNU/RES/3</span></p>
</section>

<section aria-labelledby="t-botoes">
	<h2 id="t-botoes">Botões</h2>
	<div class="linha">
		<button class="botao" type="button" {@attach dica('Exemplo de botão principal, com a dica da ação.')}>Dar a palavra</button>
		<button class="botao botao--secundario" type="button" {@attach dica('Exemplo de botão secundário.')}>Pausar</button>
	</div>
</section>

<section aria-labelledby="t-cartao">
	<h2 id="t-cartao">Cartão</h2>
	<article class="cartao">
		<header class="cartao-timbre">
			<span class="rotulo">Conselho de Segurança</span>
			<span class="codigo-doc">Sessão 3</span>
		</header>
		<p>Sala 204, até as 16h.</p>
	</article>
</section>

<section aria-labelledby="t-selos">
	<h2 id="t-selos">Situação</h2>
	<div class="linha">
		<span class="selo selo--ok"><Check aria-hidden="true" size={16} /> Aprovado</span>
		<span class="selo selo--alerta"><TriangleAlert aria-hidden="true" size={16} /> Pendente</span>
		<span class="selo selo--erro"><X aria-hidden="true" size={16} /> Rejeitado</span>
	</div>
	<div class="linha">
		<span class="carimbo">Aprovada</span>
		<span class="carimbo carimbo--confidencial">Confidencial</span>
	</div>
</section>

<section aria-labelledby="t-menus">
	<h2 id="t-menus">Menus de escolha</h2>
	<p class="suave">Até seis opções curtas: o menu nativo, com o visual do app. Listas de delegações: o Escolha.</p>
	<div class="formulario">
		<label class="campo campo--curto">
			Tipo
			<select>
				<option>Nota urgente</option>
				<option>Reportagem</option>
				<option>Opinião</option>
			</select>
		</label>
		<Escolha unica rotulo="Delegação" botao="Escolher" opcoes={paises} bind:valor={escolhida} />
	</div>
</section>

<section aria-labelledby="t-dialogo">
	<h2 id="t-dialogo">Diálogo</h2>
	<button class="botao botao--secundario" type="button" onclick={() => dialogo?.abrir()} {@attach dica('Abre um exemplo de diálogo de confirmação.')}>
		Abrir diálogo
	</button>
	<Modal bind:this={dialogo} rotulo="t-dialogo-titulo">
		<h3 id="t-dialogo-titulo">Encerrar a votação?</h3>
		<p>Os votos não poderão mais ser alterados.</p>
		<form method="dialog" class="linha">
			<button class="botao">Encerrar</button>
			<button class="botao botao--secundario">Cancelar</button>
		</form>
	</Modal>
</section>

<style>
	.amostras {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
		gap: 0.75rem;
		padding: 0;
		list-style: none;
	}

	.amostras li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	.amostra {
		flex: none;
		width: 2rem;
		height: 2rem;
		border: var(--linha);
		border-radius: var(--raio);
	}
</style>
