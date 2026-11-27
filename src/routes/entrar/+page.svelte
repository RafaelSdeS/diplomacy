<script lang="ts">
	import { APP, marca, tituloDaAba } from '#lib/titulo.svelte.ts';
	import { t } from '#lib/i18n.svelte.ts';
	import { dica } from '#lib/dica.ts';
	import { goto } from '$app/navigation';
	import { LOGIN_GOOGLE } from '$app/env/public';
	import { entrarComCodigo } from '#lib/credenciais.ts';
	import { supabase } from '#lib/supabase.ts';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import QrCode from '@lucide/svelte/icons/qr-code';

	let email = $state('');
	let senha = $state('');
	let verSenha = $state(false);
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
					? t('E-mail ou senha incorretos.')
					: t('Não foi possível entrar agora. Tente de novo em instantes.');
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
		if (error) erroEmail = t('Código inválido ou vencido. Peça outro.');
		else await goto('/', { invalidateAll: true });
	}

	// As três formas de entrar, em abas (para caber na tela sem rolar). A senha é a principal.
	type Forma = 'senha' | 'codigo' | 'email';
	const FORMAS: { chave: Forma; rotulo: string; dica: string }[] = $derived([
		{ chave: 'senha', rotulo: t('Senha'), dica: t('Com o e-mail e a senha que a secretaria cadastrou.') },
		{ chave: 'codigo', rotulo: t('Código'), dica: t('Com o código de 8 letras e números que a secretaria deu a você.') },
		{ chave: 'email', rotulo: t('Por e-mail'), dica: t('Sem senha: um link e um código chegam no seu e-mail.') }
	]);
	let forma = $state<Forma>('senha');
	// Abas da WAI-ARIA: só a escolhida fica no Tab; as setas trocam de aba.
	function setas(evento: KeyboardEvent) {
		const passo = { ArrowRight: 1, ArrowLeft: -1 }[evento.key];
		if (!passo) return;
		evento.preventDefault();
		const i = (FORMAS.findIndex((f) => f.chave === forma) + passo + FORMAS.length) % FORMAS.length;
		forma = FORMAS[i].chave;
		document.getElementById(`aba-${forma}`)?.focus();
	}

	async function entrarComGoogle() {
		await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } });
	}
</script>

<svelte:head>
	<title>{tituloDaAba(t('Entrar'))}</title>
</svelte:head>

<div class="entrada">
	<!-- No notebook, a marca ao lado do formulário; no celular, o cabeçalho já mostra a marca. -->
	<div class="entrada-marca">
		<img src="/favicon.svg" alt="" width="64" height="64" />
		<p class="entrada-evento">{marca.evento ?? APP}</p>
		<p>{t('O app de uma simulação da ONU: a sessão, os documentos, as mensagens, a crise e a press num lugar só.')}</p>
		<p class="entrada-marca-pe">{t('Cada pessoa vê o que o seu papel pede, no celular ou no notebook.')}</p>
	</div>

	<div class="entrada-cartao">
		<h1>{t('Entrar')}</h1>
		<p class="suave">{t('Use a conta que a secretaria do evento cadastrou para você.')}</p>

		<div class="abas entrada-abas" role="tablist" aria-label={t('Como entrar')} tabindex="-1" onkeydown={setas}>
			{#each FORMAS as f (f.chave)}
				<button
					class="aba"
					type="button"
					role="tab"
					id={`aba-${f.chave}`}
					aria-selected={forma === f.chave}
					aria-controls="forma-de-entrar"
					tabindex={forma === f.chave ? 0 : -1}
					onclick={() => (forma = f.chave)}
					{@attach dica(f.dica)}>{f.rotulo}</button
				>
			{/each}
		</div>

		<div class="entrada-forma" role="tabpanel" id="forma-de-entrar">
			{#if forma === 'senha'}
				<form class="formulario" onsubmit={entrar}>
					<label class="campo">
						{t('E-mail')}
						<input type="email" autocomplete="email" required bind:value={email} />
					</label>
					<!-- Passo 66: o olho, dentro do campo, mostra ou esconde a senha. -->
					<div class="campo">
						<label for="senha">{t('Senha')}</label>
						<span class="campo-senha">
							<input id="senha" type={verSenha ? 'text' : 'password'} autocomplete="current-password" required bind:value={senha} />
							<button
								class="campo-senha-olho"
								type="button"
								aria-label={verSenha ? t('Esconder senha') : t('Mostrar senha')}
								aria-pressed={verSenha}
								onclick={() => (verSenha = !verSenha)}
								>{#if verSenha}<EyeOff aria-hidden="true" size={18} strokeWidth={1.75} />{:else}<Eye aria-hidden="true" size={18} strokeWidth={1.75} />{/if}</button
							>
						</span>
					</div>
					{#if erro}
						<p class="erro" role="alert">{erro}</p>
					{/if}
					<button class="botao" disabled={enviando} {@attach dica(t('Entra com o e-mail e a senha que a secretaria cadastrou.'))}
						>{enviando ? t('Entrando…') : t('Entrar')}</button
					>
				</form>
				{#if LOGIN_GOOGLE}
					<p class="entrada-ou"><span>{t('ou')}</span></p>
					<button class="botao botao--secundario" type="button" onclick={entrarComGoogle} {@attach dica(t('Entra com a sua conta Google, se for o e-mail cadastrado no evento.'))}
						>{t('Entrar com Google')}</button
					>
				{/if}
			{:else if forma === 'codigo'}
				<form class="formulario" onsubmit={entrarComCodigoDaSecretaria}>
					<p class="suave">{t('Perdeu o crachá? Peça um código à secretaria. Ele vale uma vez só.')}</p>
					<label class="campo">
						{t('Código de 8 letras e números')}
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
					<button class="botao" disabled={enviando} {@attach dica(t('Entra com o código que a secretaria deu a você.'))}
						>{enviando ? t('Entrando…') : t('Entrar com o código')}</button
					>
				</form>
			{:else if !enviado}
				<form class="formulario" onsubmit={pedirEmail}>
					<p class="suave">{t('Sem senha: mandamos um link e um código para o seu e-mail.')}</p>
					<label class="campo">
						{t('E-mail da sua conta')}
						<input type="email" autocomplete="email" required bind:value={emailOtp} />
					</label>
					<button class="botao" disabled={enviando} {@attach dica(t('Manda um link e um código para o seu e-mail, sem precisar de senha.'))}
						>{enviando ? t('Enviando…') : t('Receber link e código')}</button
					>
				</form>
			{:else}
				<form class="formulario" onsubmit={entrarComCodigoDoEmail}>
					<p role="status">{t('Se houver uma conta com esse e-mail, enviamos um link e um código. Abra o link ou digite o código.')}</p>
					<label class="campo">
						{t('Código do e-mail')}
						<input required inputmode="numeric" pattern={'[0-9]{6,8}'} autocomplete="one-time-code" bind:value={codigoEmail} />
					</label>
					{#if erroEmail}
						<p class="erro" role="alert">{erroEmail}</p>
					{/if}
					<button class="botao" disabled={enviando} {@attach dica(t('Entra com o código que chegou no seu e-mail.'))}
						>{enviando ? t('Entrando…') : t('Entrar com o código do e-mail')}</button
					>
				</form>
			{/if}
		</div>

		<div class="entrada-pe">
			<p><QrCode aria-hidden="true" size={20} strokeWidth={1.75} /> {t('Tem crachá? Leia o QR com a câmera do celular: ele já entra no app.')}</p>
			<p><a href="/privacidade">{t('Aviso de privacidade')}</a> · <a href="/sobre">{t('Sobre o Diplomacy')}</a></p>
		</div>
	</div>
</div>
