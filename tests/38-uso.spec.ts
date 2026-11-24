import { expect, test } from '@playwright/test';
import { CONTAS, entrar } from './ajuda.ts';

// Passo 38: melhorias de uso. Rascunho, filtro, contador e tema; a confirmação ao
// encerrar a votação está nos testes dos passos 06 e 16, e retirar o ponto no do 29.
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'uma tela basta');
});

test('o bilhete em edição volta depois de recarregar; o filtro acha sem acento; o contador conta', async ({ page }) => {
	await entrar(page, CONTAS.delegado);
	await page.goto('/comite/CSNU-T/mensagens');
	const bilhete = page.getByRole('textbox', { name: 'Bilhete' });
	await bilhete.fill('Proposta de aliança no tópico 1');
	await expect(page.getByText('31 de 1000')).toBeVisible();
	await page.reload();
	await expect(bilhete).toHaveValue('Proposta de aliança no tópico 1');
	await bilhete.fill('');

	// Passo 47: o filtro fica dentro do Escolha do destinatário.
	await page.getByRole('button', { name: 'Escolher: Para' }).click();
	const lista = page.getByRole('dialog', { name: 'Para' });
	await lista.getByRole('searchbox', { name: 'Filtrar' }).fill('arabia');
	await expect(lista.getByRole('radio', { disabled: false }).filter({ visible: true })).toHaveCount(1);
	await expect(lista.getByRole('radio', { name: /^Arábia Saudita/ })).toBeVisible();
});

test('o tema escolhido no perfil sobrevive à recarga', async ({ page }) => {
	await entrar(page, CONTAS.delegado);
	await page.goto('/perfil');
	const tema = page.getByRole('combobox', { name: 'Tema neste aparelho' });
	await tema.selectOption({ label: 'Escuro' });
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
	await expect(tema).toHaveValue('dark');
	await tema.selectOption({ label: 'Automático (o do sistema)' });
	await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
});
