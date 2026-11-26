// Passo 62 (lote 6): a dica de uma ação, ao passar o mouse e no foco do teclado (o `title`
// nativo não aparece no foco nem no celular). Um balão ligado por aria-describedby, fora do
// nome do botão. Uso: <button {@attach dica(texto)}>, com o texto traduzido. Ação desativada não
// recebe eventos: o motivo dela vai em texto à vista, ao lado.

let proximo = 0;

export function dica(texto: string | null | undefined) {
	return (alvo: HTMLElement) => {
		if (!texto) return;
		const balao = document.createElement('span');
		balao.id = `dica-${++proximo}`;
		balao.className = 'dica';
		balao.setAttribute('role', 'tooltip');
		balao.hidden = true;
		balao.textContent = texto;
		// No modal (camada de cima), o balão fica dentro dele; senão, no fim da página.
		(alvo.closest('dialog') ?? document.body).append(balao);
		const descricao = alvo.getAttribute('aria-describedby');
		alvo.setAttribute('aria-describedby', [descricao, balao.id].filter(Boolean).join(' '));

		const mostrar = () => {
			balao.hidden = false;
			const r = alvo.getBoundingClientRect();
			balao.style.left = `${Math.max(8, Math.min(r.left, innerWidth - balao.offsetWidth - 8))}px`;
			balao.style.top = `${r.bottom + 6}px`;
		};
		const esconder = () => (balao.hidden = true);
		const tecla = (e: KeyboardEvent) => {
			if (e.key === 'Escape') esconder();
		};
		const eventos: [string, EventListener][] = [
			['pointerenter', mostrar],
			['pointerleave', esconder],
			['focusin', mostrar],
			['focusout', esconder],
			['keydown', tecla as EventListener]
		];
		for (const [nome, f] of eventos) alvo.addEventListener(nome, f);
		return () => {
			for (const [nome, f] of eventos) alvo.removeEventListener(nome, f);
			balao.remove();
			if (descricao) alvo.setAttribute('aria-describedby', descricao);
			else alvo.removeAttribute('aria-describedby');
		};
	};
}
