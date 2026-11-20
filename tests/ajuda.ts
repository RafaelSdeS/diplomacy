import { expect, type Page } from '@playwright/test';

// Contas do seed (scripts/seed.ts). Os testes de ponta a ponta precisam do
// Supabase local com o seed: npm run db:iniciar && npm run seed.
export const SENHA = 'senha-de-teste';

export const CONTAS = {
	delegado: 'delegado01@exemplo.test',
	mesa: 'mesa01@exemplo.test',
	crise: 'crise01@exemplo.test',
	press: 'press01@exemplo.test',
	secretaria: 'secretaria01@exemplo.test',
	semConvite: 'semconvite@exemplo.test'
} as const;

export async function entrar(page: Page, email: string) {
	await page.goto('/entrar');
	await page.getByLabel('E-mail').fill(email);
	await page.getByLabel('Senha').fill(SENHA);
	await page.getByRole('button', { name: 'Entrar', exact: true }).click();
	await expect(page).not.toHaveURL(/\/entrar$/);
}
