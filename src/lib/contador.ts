// Contador de caracteres (passo 38): "120 de 300" embaixo do campo, ligado por
// aria-describedby, em âmbar nos últimos 10%. Uso: {@attach contador(texto)}; o
// argumento faz o contador acompanhar também o que muda sem digitação.
import { t } from './i18n.svelte.ts';

let proximo = 0;

export function contador(valor: string | null | undefined) {
	return (campo: HTMLInputElement | HTMLTextAreaElement) => {
		const max = campo.maxLength;
		if (max <= 0) return;
		const saida = document.createElement('span');
		saida.id = `contador-${++proximo}`;
		saida.className = 'contador';
		// Fora do <label>, para não entrar no nome do campo.
		(campo.closest('label') ?? campo).after(saida);
		const descricao = campo.getAttribute('aria-describedby');
		campo.setAttribute('aria-describedby', [descricao, saida.id].filter(Boolean).join(' '));
		const atualizar = () => {
			const n = campo.value.length;
			saida.textContent = t('{n} de {max}', { n, max });
			saida.classList.toggle('contador--perto', n >= max * 0.9);
		};
		void valor;
		atualizar();
		campo.addEventListener('input', atualizar);
		return () => {
			campo.removeEventListener('input', atualizar);
			campo.setAttribute('aria-describedby', descricao ?? '');
			if (!descricao) campo.removeAttribute('aria-describedby');
			saida.remove();
		};
	};
}
