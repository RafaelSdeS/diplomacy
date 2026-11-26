import { expect, test } from '@playwright/test';
import { CONTAS, entrar } from './ajuda.ts';

// Passo 62 (lote 6): na Sessão, à vista só o principal de cada papel; o resto fica em "Mais
// opções". Cada ação diz o que faz ao passar o mouse e no foco do teclado (não só no `title`).
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'as dicas são do mouse e do teclado');
});

test('as ações secundárias da sessão ficam em "Mais opções", e cada uma diz o que faz', async ({ page }) => {
	const texto = 'Os itens do tópico e as alterações propostas.';
	await entrar(page, CONTAS.delegado);
	await page.goto('/comite/CSNU-T/sessao');
	const barra = page.getByRole('navigation', { name: 'Telas da sessão' });
	const agenda = barra.getByRole('link', { name: 'Agenda' });
	await expect(agenda).toBeHidden();
	await barra.getByText('Mais opções').click();

	await agenda.hover();
	await expect(page.getByRole('tooltip')).toHaveText(texto);
	await expect(agenda).toHaveAccessibleDescription(texto);
	await page.mouse.move(0, 0);
	await expect(page.getByRole('tooltip')).toHaveCount(0);

	await agenda.focus();
	await expect(page.getByRole('tooltip')).toHaveText(texto);
	await page.keyboard.press('Escape');
	await expect(page.getByRole('tooltip')).toHaveCount(0);
});
