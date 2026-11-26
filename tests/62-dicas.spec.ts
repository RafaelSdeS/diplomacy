import { expect, test } from '@playwright/test';
import { contaDoTreino, isolado } from '../scripts/delegacoes.ts';
import { comiteEmDebate, CONTAS, entrar } from './ajuda.ts';

// A cópia do TREINO só deste arquivo, para o painel com a sessão aberta.
const C = isolado('62');

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

test('a ação indisponível diz por quê: a dica mostra o motivo, e o clique não faz nada', async ({ page }) => {
	const mesa = C.conta('mesa-treino@exemplo.test');
	await comiteEmDebate(mesa, C.sigla, C.conta(contaDoTreino('Brasil')));
	await entrar(page, mesa);
	await page.goto(`/comite/${C.sigla}/sessao/presidencia`);
	const encerrar = page.getByRole('button', { name: 'Encerrar fala' });
	// Sem ninguém com a palavra, o botão fica indisponível (aria-disabled), mas recebe o mouse.
	await expect(encerrar).toBeDisabled();
	await encerrar.hover();
	await expect(page.getByRole('tooltip')).toHaveText('Ninguém está com a palavra.');
	await expect(encerrar).toHaveAccessibleDescription('Ninguém está com a palavra.');
	await encerrar.click({ force: true }); // o Playwright não clica no aria-disabled sem force
	await expect(page.getByRole('alert')).toHaveCount(0);
});
