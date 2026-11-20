<script lang="ts">
	import { goto } from '$app/navigation';
	import { LOGIN_GOOGLE } from '$app/env/public';
	import { supabase } from '#lib/supabase.ts';

	let email = $state('');
	let senha = $state('');
	let erro = $state('');
	let enviando = $state(false);

	async function entrar(evento: SubmitEvent) {
		evento.preventDefault();
		enviando = true;
		erro = '';
		const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
		enviando = false;
		if (error) {
			erro =
				error.code === 'invalid_credentials'
					? 'E-mail ou senha incorretos.'
					: 'Não foi possível entrar agora. Tente de novo em instantes.';
			return;
		}
		await goto('/', { invalidateAll: true });
	}

	async function entrarComGoogle() {
		await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } });
	}
</script>

<svelte:head>
	<title>Entrar · UFRGSMUN</title>
</svelte:head>

<p class="rotulo">Acesso</p>
<h1>Entrar</h1>
<p class="suave">Use a conta que a secretaria do evento cadastrou para você.</p>

<form class="formulario" onsubmit={entrar}>
	<label class="campo">
		E-mail
		<input type="email" autocomplete="email" required bind:value={email} />
	</label>
	<label class="campo">
		Senha
		<input type="password" autocomplete="current-password" required bind:value={senha} />
	</label>
	{#if erro}
		<p class="erro" role="alert">{erro}</p>
	{/if}
	<button class="botao" disabled={enviando}>Entrar</button>
</form>

{#if LOGIN_GOOGLE}
	<button class="botao botao--secundario" type="button" onclick={entrarComGoogle}>Entrar com Google</button>
{/if}
