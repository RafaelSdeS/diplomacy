<script lang="ts">
	import { goto } from '$app/navigation';
	import { LOGIN_GOOGLE } from '$app/env/public';
	import { entrarComCodigo } from '#lib/credenciais.ts';
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

	// Código curto da secretaria, para quem perdeu o crachá.
	let codigo = $state('');
	let erroCodigo = $state('');
	async function entrarComCodigoDaSecretaria(evento: SubmitEvent) {
		evento.preventDefault();
		enviando = true;
		erroCodigo = (await entrarComCodigo(codigo.toUpperCase())) ?? '';
		enviando = false;
		if (!erroCodigo) await goto('/', { invalidateAll: true });
	}

	// Por e-mail: um link e um código. A mensagem é a mesma exista a conta ou não.
	let emailOtp = $state('');
	let codigoEmail = $state('');
	let enviado = $state(false);
	let erroEmail = $state('');
	async function pedirEmail(evento: SubmitEvent) {
		evento.preventDefault();
		enviando = true;
		await supabase.auth.signInWithOtp({
			email: emailOtp.trim(),
			options: { shouldCreateUser: false, emailRedirectTo: location.origin }
		});
		enviando = false;
		enviado = true;
	}
	async function entrarComCodigoDoEmail(evento: SubmitEvent) {
		evento.preventDefault();
		enviando = true;
		const { error } = await supabase.auth.verifyOtp({ email: emailOtp.trim(), token: codigoEmail.trim(), type: 'email' });
		enviando = false;
		if (error) erroEmail = 'Código inválido ou vencido. Peça outro.';
		else await goto('/', { invalidateAll: true });
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

<p class="suave"><a href="/privacidade">Aviso de privacidade</a></p>

<p class="suave">Tem crachá? Leia o QR com a câmera do celular: ele já entra no app.</p>

<section aria-labelledby="t-codigo">
	<h2 id="t-codigo">Código da secretaria</h2>
	<form class="formulario" onsubmit={entrarComCodigoDaSecretaria}>
		<label class="campo">
			Código de 8 letras e números
			<input
				required
				minlength="8"
				maxlength="8"
				autocomplete="one-time-code"
				autocapitalize="characters"
				spellcheck="false"
				bind:value={codigo}
			/>
		</label>
		{#if erroCodigo}
			<p class="erro" role="alert">{erroCodigo}</p>
		{/if}
		<button class="botao botao--secundario" disabled={enviando}>Entrar com o código</button>
	</form>
</section>

<section aria-labelledby="t-email">
	<h2 id="t-email">Por e-mail</h2>
	{#if !enviado}
		<form class="formulario" onsubmit={pedirEmail}>
			<label class="campo">
				E-mail da sua conta
				<input type="email" autocomplete="email" required bind:value={emailOtp} />
			</label>
			<button class="botao botao--secundario" disabled={enviando}>Receber link e código</button>
		</form>
	{:else}
		<p role="status">Se houver uma conta com esse e-mail, enviamos um link e um código. Abra o link ou digite o código.</p>
		<form class="formulario" onsubmit={entrarComCodigoDoEmail}>
			<label class="campo">
				Código do e-mail
				<input
					required
					inputmode="numeric"
					pattern={'[0-9]{6,8}'}
					autocomplete="one-time-code"
					bind:value={codigoEmail}
				/>
			</label>
			{#if erroEmail}
				<p class="erro" role="alert">{erroEmail}</p>
			{/if}
			<button class="botao botao--secundario" disabled={enviando}>Entrar com o código do e-mail</button>
		</form>
	{/if}
</section>
