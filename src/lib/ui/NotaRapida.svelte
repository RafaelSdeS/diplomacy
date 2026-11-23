<script lang="ts">
	import { t } from '#lib/i18n.svelte.ts';
	import { caixa, mensagemDoEnvio } from '#lib/caixa.ts';
	import { contador } from '#lib/contador.ts';
	import { formatarHora } from '#lib/cronograma.ts';
	import { argsDaNota, contextoAgora, type Contexto, type TipoNota } from '#lib/nota-rapida.ts';
	import { guardarRascunho, lerRascunho } from '#lib/rascunho.ts';
	import { untrack } from 'svelte';

	// Passo 46: a nota rápida e o rascunho da próxima fala, sempre à vista na sessão. No
	// notebook é um cartão aberto ao lado de "Com a palavra"; no celular, uma folha que
	// abre por cima da sessão, sem mudar a posição de leitura.
	type Props = {
		comite: { id: string; sigla: string };
		estado: Parameters<typeof contextoAgora>[0];
		onresultado: (r: { erro: string; mensagem: string }) => void;
	};
	let { comite, estado, onresultado }: Props = $props();

	const chave = (tipo: TipoNota, parte = 'texto') => `nota-${parte}:${comite.sigla}:${tipo}`;
	function lerContexto(tipo: TipoNota): Contexto | null {
		try {
			return JSON.parse(lerRascunho(chave(tipo, 'contexto')) || 'null');
		} catch {
			return null;
		}
	}

	// O tipo escolhido também fica: depois de recarregar, a pessoa volta à mesma nota.
	const inicial = untrack(() => (lerRascunho(`nota-tipo:${comite.sigla}`) || 'nota') as TipoNota);
	let tipo = $state<TipoNota>(inicial);
	let texto = $state(untrack(() => lerRascunho(chave(inicial))));
	let contexto = $state<Contexto | null>(untrack(() => lerContexto(inicial)));
	let aberta = $state(false);
	let enviando = $state(false);
	let campo = $state<HTMLTextAreaElement>();

	// O contexto é o de quando a nota começou: trocar de orador no meio não muda de quem ela fala.
	$effect(() => {
		if (!texto.trim()) contexto = null;
		else if (!contexto) contexto = contextoAgora(untrack(() => estado));
	});
	// Texto e contexto ficam no aparelho a cada tecla: atualizar ao vivo, reconectar ou
	// recarregar não apagam nada. Uma fala apagada começa outra no caderno.
	$effect(() => {
		guardarRascunho(`nota-tipo:${comite.sigla}`, tipo === 'nota' ? '' : tipo);
		guardarRascunho(chave(tipo), texto);
		guardarRascunho(chave(tipo, 'contexto'), contexto ? JSON.stringify(contexto) : '');
		if (tipo === 'fala' && !texto.trim()) guardarRascunho(chave('fala', 'id'), '');
	});

	function escolher(novo: TipoNota) {
		tipo = novo;
		texto = lerRascunho(chave(novo));
		contexto = lerContexto(novo);
	}

	// "Sobre…" fala de quem estava com a palavra quando a nota sobre a delegação começou.
	const sobre = $derived((tipo === 'sobre' ? contexto?.orador : lerContexto('sobre')?.orador) ?? estado?.orador ?? null);
	const descricao = $derived.by(() => {
		const c = contexto ?? contextoAgora(estado);
		return [
			c.topico ? t('Tópico {n}', { n: c.topico }) : null,
			c.orador ? t('{delegacao} com a palavra', { delegacao: c.orador.nome }) : null,
			formatarHora(c.hora)
		]
			.filter(Boolean)
			.join(' · ');
	});

	async function guardar(evento: SubmitEvent) {
		evento.preventDefault();
		const c = contexto ?? contextoAgora(estado);
		if (tipo === 'sobre' && !c.orador) return;
		// A próxima fala é uma só no caderno: guardar de novo atualiza a mesma.
		const id = (tipo === 'fala' && lerRascunho(chave('fala', 'id'))) || crypto.randomUUID();
		enviando = true;
		const resultado = await caixa.enviar({ id, rpc: 'salvar_anotacao', args: argsDaNota(id, comite.id, tipo, texto, c), rotulo: t('Anotação') });
		enviando = false;
		const r = mensagemDoEnvio(resultado, tipo === 'fala' ? t('Fala guardada no caderno.') : t('Anotado no caderno.'));
		onresultado(r);
		if (r.erro) return;
		if (tipo === 'fala') guardarRascunho(chave('fala', 'id'), id);
		else texto = '';
	}

	function alternar() {
		aberta = !aberta;
		if (aberta) setTimeout(() => campo?.focus());
	}
</script>

<article class="cartao nota-rapida" class:aberta aria-labelledby="c-nota-rapida">
	<div class="nota-rapida-barra">
		<h2 id="c-nota-rapida">{t('Anotar')}</h2>
		{#if !aberta && texto.trim()}<span class="selo selo--info">{t('rascunho guardado')}</span>{/if}
		<button class="botao botao--secundario botao--pequeno nota-rapida-alternar" type="button" aria-expanded={aberta} onclick={alternar}>
			{aberta ? t('Fechar') : t('Abrir')}
		</button>
	</div>
	<form class="formulario nota-rapida-corpo" onsubmit={guardar} aria-label={t('Anotar no caderno')}>
		<fieldset class="opcoes">
			<legend>{t('Tipo')}</legend>
			<label class="opcao">
				<input type="radio" name="tipo-nota" checked={tipo === 'nota'} onchange={() => escolher('nota')} />
				{t('Nota')}
			</label>
			<label class="opcao">
				<input type="radio" name="tipo-nota" checked={tipo === 'sobre'} disabled={!sobre} onchange={() => escolher('sobre')} />
				{sobre ? t('Sobre {delegacao}', { delegacao: sobre.nome }) : t('Sobre quem fala')}
			</label>
			<label class="opcao">
				<input type="radio" name="tipo-nota" checked={tipo === 'fala'} onchange={() => escolher('fala')} />
				{t('Minha próxima fala')}
			</label>
		</fieldset>
		<label class="campo">
			{tipo === 'fala' ? t('Rascunho da próxima fala') : t('Nota rápida')}
			<textarea bind:this={campo} required rows={tipo === 'fala' ? 5 : 2} maxlength="4000" bind:value={texto} {@attach contador(texto)}
			></textarea>
		</label>
		{#if tipo !== 'fala'}<p class="detalhe">{descricao}</p>{/if}
		<div class="acoes">
			<button class="botao botao--secundario botao--pequeno" disabled={enviando}>{t('Guardar no caderno')}</button>
			<a href={`/comite/${comite.sigla}/caderno`}>{t('Abrir o caderno')}</a>
		</div>
	</form>
</article>
