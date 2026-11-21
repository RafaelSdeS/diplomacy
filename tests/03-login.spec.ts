import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CONTAS, SENHA, entrar } from './ajuda.ts';

const temas = ['light', 'dark'] as const;

async function semErrosDeAcessibilidade(page: import('@playwright/test').Page) {
	const { violations } = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
		.analyze();
	expect(violations).toEqual([]);
}

test('sem login, qualquer tela leva a /entrar', async ({ page }) => {
	for (const rota of ['/', '/secretaria/participantes', '/sem-acesso']) {
		await page.goto(rota);
		await expect(page).toHaveURL(/\/entrar$/);
	}
	await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0);
});

test('entra e sai com e-mail e senha', async ({ page }) => {
	await entrar(page, CONTAS.delegado);
	await expect(page.getByRole('heading', { level: 1, name: 'Agora' })).toBeVisible();

	await page.getByRole('button', { name: 'Sair' }).click();
	await expect(page).toHaveURL(/\/entrar$/);
	await page.goto('/');
	await expect(page).toHaveURL(/\/entrar$/);
});

test('senha errada mostra um aviso e não entra', async ({ page }) => {
	await page.goto('/entrar');
	await page.getByLabel('E-mail', { exact: true }).fill(CONTAS.delegado);
	await page.getByLabel('Senha').fill('senha-errada');
	await page.getByRole('button', { name: 'Entrar', exact: true }).click();
	await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
	await expect(page).toHaveURL(/\/entrar$/);
});

test('o formulário de entrar funciona só com o teclado', async ({ page }) => {
	await page.goto('/entrar');
	const email = page.getByLabel('E-mail', { exact: true });
	await expect(email).toBeVisible();
	for (let i = 0; i < 6 && !(await email.evaluate((el) => el === document.activeElement)); i++) {
		await page.keyboard.press('Tab');
	}
	await expect(email).toBeFocused();
	await page.keyboard.type(CONTAS.delegado);
	await page.keyboard.press('Tab');
	await expect(page.getByLabel('Senha')).toBeFocused();
	await page.keyboard.type(SENHA);
	await page.keyboard.press('Enter');
	await expect(page.getByRole('heading', { level: 1, name: 'Agora' })).toBeVisible();
});

test('conta sem convite cai em /sem-acesso, sem menu', async ({ page }) => {
	await entrar(page, CONTAS.semConvite);
	await expect(page).toHaveURL(/\/sem-acesso$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Sem acesso' })).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0);
});

const MENUS = {
	delegado: ['Agora', 'Sessão', 'Comitê', 'Press', 'Cronograma', 'Avisos'],
	mesa: ['Agora', 'Painel', 'Comitê', 'Press', 'Cronograma', 'Avisos'],
	crise: ['Agora', 'Crise', 'Sessão', 'Comitê', 'Press', 'Cronograma', 'Avisos'],
	press: ['Agora', 'Press', 'Escrever', 'Sessão', 'Comitê', 'Cronograma', 'Avisos'],
	secretaria: ['Agora', 'Press', 'Cronograma', 'Avisos', 'Participantes']
} as const;

for (const [papel, itens] of Object.entries(MENUS)) {
	test(`${papel} vê só o próprio menu`, async ({ page }) => {
		await entrar(page, CONTAS[papel as keyof typeof MENUS]);
		const links = page.getByRole('navigation', { name: 'Principal' }).getByRole('link');
		await expect(links).toHaveText([...itens]);
	});
}

test('delegado que digita o endereço da secretaria não vê os dados', async ({ page }) => {
	await entrar(page, CONTAS.delegado);
	await page.goto('/secretaria/participantes');
	await expect(page.getByRole('heading', { level: 1, name: 'Sem permissão' })).toBeVisible();
	await expect(page.getByText('@exemplo.test')).toHaveCount(0);
});

test('a secretaria cria e remove um convite', async ({ page }, info) => {
	// E-mail único: os projetos rodam em paralelo e uma nova tentativa não colide.
	const email = `convite-${info.project.name}-${Date.now()}@exemplo.test`;
	await entrar(page, CONTAS.secretaria);
	await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Participantes' }).click();
	await expect(page.getByRole('heading', { level: 1, name: 'Participantes' })).toBeVisible();

	await page.getByLabel('E-mail').fill(email);
	await page.getByLabel('Papel').selectOption('mesa');
	await page.getByLabel('Comitê').selectOption({ label: 'CSNU-T · Conselho de Segurança (teste)' });
	await page.getByRole('button', { name: 'Convidar' }).click();

	const item = page.getByRole('listitem').filter({ hasText: email });
	await expect(item).toBeVisible();
	await expect(item).toContainText('Mesa · CSNU-T');

	await item.getByRole('button', { name: `Remover o convite de ${email}` }).click();
	await expect(item).toHaveCount(0);
});

for (const tema of temas) {
	test(`entrar, sem acesso e participantes não têm erros de acessibilidade (tema ${tema})`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: tema });

		await page.goto('/entrar');
		await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
		await semErrosDeAcessibilidade(page);

		await entrar(page, CONTAS.secretaria);
		await page.goto('/secretaria/participantes');
		await expect(page.getByRole('heading', { level: 1, name: 'Participantes' })).toBeVisible();
		await semErrosDeAcessibilidade(page);

		await page.getByRole('button', { name: 'Sair' }).click();
		await expect(page).toHaveURL(/\/entrar$/); // espera a saída terminar
		await entrar(page, CONTAS.semConvite);
		await expect(page.getByRole('heading', { level: 1, name: 'Sem acesso' })).toBeVisible();
		await semErrosDeAcessibilidade(page);
	});
}
