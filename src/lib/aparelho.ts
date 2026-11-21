// O que o app pede ao aparelho (passo 38): tela acesa, vibração e levar a pessoa
// até o que importa agora. Tudo opcional: sem suporte (iPhone sem vibração), nada acontece.

/** Mantém a tela acesa enquanto a tela do app está aberta; devolve a função que solta. */
export function manterTelaAcesa() {
	let trava: WakeLockSentinel | undefined;
	let fim = false;
	const pedir = async () => {
		try {
			trava = await navigator.wakeLock?.request('screen');
			if (fim) void trava?.release();
		} catch {
			// sem permissão ou sem suporte: a tela pode apagar, nada mais
		}
	};
	const aoVoltar = () => {
		if (document.visibilityState === 'visible') void pedir();
	};
	void pedir();
	document.addEventListener('visibilitychange', aoVoltar);
	return () => {
		fim = true;
		document.removeEventListener('visibilitychange', aoVoltar);
		void trava?.release();
	};
}

export const vibrar = (ms: number) => void navigator.vibrate?.(ms);

/** Rola até o elemento e põe o foco nele, sem tirar o foco de quem está digitando. */
export function chamarAtencao(id: string) {
	vibrar(150);
	if (document.activeElement?.matches('input, textarea, select, [contenteditable]')) return;
	const alvo = document.getElementById(id);
	alvo?.scrollIntoView({ block: 'center' });
	alvo?.focus({ preventScroll: true });
}
