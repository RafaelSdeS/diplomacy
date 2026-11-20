import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONTAS, entrar } from './ajuda.ts';

test('as regras do comitê de teste mostram a votação do CSNU e o quórum', async ({ page }) => {
	await entrar(page, CONTAS.delegado);
	await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Comitê' }).click();
	await page.getByRole('link', { name: 'Regras de procedimento' }).click();

	await expect(page.getByRole('heading', { level: 1, name: 'Regras de procedimento' })).toBeVisible();
	const votacoes = page.getByRole('region', { name: 'Votações' });
	await expect(votacoes).toContainText(
		'9 votos a favor, sem voto contra de membro permanente (China, EUA, França, Reino Unido e Rússia)'
	);
	// As regras que o comitê não ajusta vêm do guia.
	await expect(page.getByRole('region', { name: 'Sessão' })).toContainText('até 45 minutos por sessão');
	await expect(page.getByRole('region', { name: 'Sessão' })).toContainText('Hoje: 5 de 15 delegações.');

	// O menu continua marcando o comitê.
	await expect(
		page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Comitê' })
	).toHaveAttribute('aria-current', 'true');
});

for (const tema of ['light', 'dark'] as const) {
	test(`a tela de regras não tem erros de acessibilidade (tema ${tema})`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: tema });
		await entrar(page, CONTAS.delegado);
		await page.goto('/comite/CSNU-T/regras');
		await expect(page.getByRole('heading', { level: 1, name: 'Regras de procedimento' })).toBeVisible();
		const { violations } = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
			.analyze();
		expect(violations).toEqual([]);
	});
}
