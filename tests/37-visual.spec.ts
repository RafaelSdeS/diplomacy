import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { CONTAS, entrar } from './ajuda.ts';

// Passo 37: as telas principais de cada papel, no tema escuro, sem erros do axe
// (contraste incluído). O tema claro já é conferido nos testes de cada passo.
const TELAS: [string, string[]][] = [
	[
		CONTAS.delegado,
		['/', '/cronograma', '/perfil', '/avisos', '/comite/CSNU-T', '/comite/CSNU-T/sessao', '/comite/CSNU-T/caderno', '/press/CSNU-T']
	],
	[CONTAS.mesa, ['/', '/comite/CSNU-T/sessao/presidencia', '/comite/CSNU-T/dpo']],
	[CONTAS.crise, ['/crise/CSNU-T']],
	[CONTAS.secretaria, ['/secretaria']]
];

for (const [conta, rotas] of TELAS) {
	test(`tema escuro sem erros de acessibilidade: ${conta}`, async ({ page }, info) => {
		test.skip(info.project.name !== 'notebook', 'uma tela basta');
		await page.emulateMedia({ colorScheme: 'dark' });
		await entrar(page, conta);
		for (const rota of rotas) {
			await page.goto(rota);
			await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
			const { violations } = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
				.analyze();
			expect(violations, rota).toEqual([]);
		}
	});
}
