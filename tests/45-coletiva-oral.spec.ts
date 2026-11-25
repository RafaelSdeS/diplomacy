import { expect, test, type Browser, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contaDaDelegacao } from '../scripts/delegacoes.ts';
import { abrirAcao, CONTAS, entrar, escolher } from './ajuda.ts';

// Passo 45, parte B: a coletiva como fluxo oral. A jornalista pergunta em voz alta e a
// delegação responde em voz alta; o app organiza a ordem e só mostra a pergunta (à
// delegação e no telão) depois de feita. Um arquivo só, serial: abrir uma coletiva fecha
// a outra do evento.
test.describe.configure({ mode: 'serial' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'a coletiva do evento é uma só');
});

const DIRETORIA = 'diretoria-press@exemplo.test';

async function abrir(browser: Browser, conta: string, rota: string, viewport = { width: 1366, height: 768 }) {
	const contexto = await browser.newContext({ viewport, isMobile: viewport.width < 500 });
	const page = await contexto.newPage();
	await entrar(page, conta);
	await page.goto(rota);
	await expect(page.locator('[data-ao-vivo="sim"]').first()).toBeVisible({ timeout: 10_000 });
	return page;
}
const semErros = async (page: Page) =>
	expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);

test('a Diretoria chama, a delegação só vê a pergunta ao responder, e o telão acompanha', async ({ browser }) => {
	test.setTimeout(90_000);
	const pergunta = `Qual a resposta ao bloqueio? ${Date.now()}`;
	const nota = 'O Brasil disse que vai propor uma mediação.';

	const diretoria = await abrir(browser, DIRETORIA, '/press/coletiva');
	await diretoria.getByRole('button', { name: 'Abrir uma coletiva' }).click();
	await expect(diretoria.getByRole('status')).toHaveText('Coletiva aberta.');

	const press = await abrir(browser, CONTAS.press, '/press/coletiva');
	await abrirAcao(press, 'Nova pergunta');
	const nova = press.getByRole('form', { name: 'Nova pergunta' });
	await escolher(nova, 'Delegação', 'Brasil');
	await nova.getByLabel('Pergunta').fill(pergunta);
	await nova.getByRole('button', { name: 'Pôr na pauta' }).click();
	await expect(press.getByRole('status')).toHaveText('Pergunta na pauta.');
	await expect(diretoria.getByText(pergunta)).toBeVisible({ timeout: 10_000 });

	// Antes de ser feita, a delegação e o telão não leem a pergunta.
	const brasil = await abrir(browser, contaDaDelegacao('Brasil'), '/press/coletiva', { width: 360, height: 740 });
	await expect(brasil.getByText('a pergunta só é conhecida quando for feita em voz alta').first()).toBeVisible();
	await expect(brasil.getByText(pergunta)).toHaveCount(0);
	const telao = await abrir(browser, DIRETORIA, '/telao/coletiva', { width: 1920, height: 1080 });
	await expect(telao.getByRole('complementary', { name: 'Próximas' })).toContainText('Brasil');

	// Chamando: o aviso chega ao celular, sem a pergunta; a delegação diz que está pronta.
	const conduzir = diretoria.getByRole('article', { name: 'Conduzir a coletiva' });
	await conduzir.getByRole('button', { name: 'Chamar a próxima' }).click();
	const chamada = brasil.getByRole('article', { name: 'Sua delegação foi chamada' });
	await expect(chamada).toContainText('Aguarde o microfone', { timeout: 10_000 });
	await expect(brasil.getByText(pergunta)).toHaveCount(0);
	await expect(telao.getByRole('region', { name: 'Com a palavra' })).toContainText('Brasil', { timeout: 10_000 });
	await expect(telao.getByText(pergunta)).toHaveCount(0);
	await semErros(brasil);
	await chamada.getByRole('button', { name: 'Estamos prontos' }).click();
	await expect(conduzir).toContainText('prontos', { timeout: 10_000 });

	// Respondendo: a pergunta aparece no telão e para a delegação, com o tempo correndo.
	await conduzir.getByRole('button', { name: 'Iniciar resposta' }).click();
	await expect(telao.getByText(pergunta)).toBeVisible({ timeout: 10_000 });
	await expect(brasil.getByRole('article', { name: 'Sua delegação está respondendo' })).toContainText(pergunta, { timeout: 10_000 });
	await semErros(telao);

	// Concluída: o telão espera a próxima, e a press anota a fala para a matéria.
	await conduzir.getByRole('button', { name: 'Concluir resposta' }).click();
	await diretoria.getByRole('dialog').getByRole('button', { name: 'Concluir resposta' }).click();
	await expect(diretoria.getByRole('status')).toHaveText('Resposta concluída.');
	await expect(telao.getByText('Aguardando a próxima pergunta')).toBeVisible({ timeout: 10_000 });
	await press.reload();
	await press.getByRole('button', { name: 'Anotar a fala' }).click();
	const modal = press.getByRole('dialog', { name: 'Nota da fala' });
	await modal.getByLabel('O que a delegação disse').fill(nota);
	await modal.getByRole('button', { name: 'Guardar a nota' }).click();
	await expect(press.getByRole('status')).toHaveText('Nota guardada.');
	await expect(brasil.getByText(nota)).toHaveCount(0);
	await press.getByRole('button', { name: 'Escrever a matéria da coletiva' }).click();
	await expect(press.getByLabel(/^Texto/)).toHaveValue(new RegExp(nota));

	// Encerrar pede confirmação; cancelar não encerra (passo 47).
	await diretoria.getByRole('button', { name: 'Encerrar a coletiva' }).click();
	const confirmacao = diretoria.getByRole('dialog', { name: 'Encerrar a coletiva?' });
	await confirmacao.getByRole('button', { name: 'Cancelar' }).click();
	await expect(confirmacao).toBeHidden();
	await diretoria.getByRole('button', { name: 'Encerrar a coletiva' }).click();
	await confirmacao.getByRole('button', { name: 'Encerrar a coletiva' }).click();
	await expect(diretoria.getByRole('status')).toHaveText('Coletiva encerrada.');
	await expect(telao.getByText('Coletiva encerrada')).toBeVisible({ timeout: 10_000 });
	await Promise.all([diretoria, press, brasil, telao].map((p) => p.context().close()));
});
