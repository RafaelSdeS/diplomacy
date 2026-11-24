import { createECDH, randomBytes } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { contaDoTreino } from '../scripts/delegacoes.ts';
import { clienteComo, CONTAS, entrar, abrirAcao } from './ajuda.ts';

// Passo 15 (bônus): notificações Web Push. O navegador de teste não fala com um serviço
// de push de verdade: a assinatura do navegador é simulada, com chaves válidas, e a
// chegada da mensagem é entregue ao service worker pelo protocolo do Chrome.

test.describe.configure({ mode: 'serial' });
// O "headless shell" padrão bloqueia notificações; o Chromium completo, não.
test.use({ channel: 'chromium' });
test.beforeEach(({}, info) => {
	test.skip(info.project.name !== 'notebook', 'roda num projeto só');
});

const CONTA = contaDoTreino('Uruguai');
const ENDPOINT = `https://push.exemplo.test/e2e-${Date.now()}`;
const ecdh = createECDH('prime256v1');
ecdh.generateKeys();
const CHAVES = { p256dh: ecdh.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') };

test('a pessoa ativa no perfil, um aviso dispara o envio, e ela desativa', async ({ page, context, browser }) => {
	await context.grantPermissions(['notifications']);
	// A assinatura do navegador, simulada (o resto do caminho é o de verdade).
	await context.addInitScript(
		({ endpoint, chaves }) => {
			let atual: object | null = null;
			const assinatura = {
				endpoint,
				toJSON: () => ({ endpoint, keys: chaves }),
				unsubscribe: async () => ((atual = null), true)
			};
			PushManager.prototype.subscribe = async () => ((atual = assinatura), assinatura as unknown as PushSubscription);
			PushManager.prototype.getSubscription = async () => atual as PushSubscription | null;
		},
		{ endpoint: ENDPOINT, chaves: CHAVES }
	);
	await entrar(page, CONTA);
	await page.goto('/perfil');
	const notificacoes = page.getByRole('region', { name: 'Notificações' });
	await notificacoes.getByRole('button', { name: 'Ativar notificações neste aparelho' }).click();
	await expect(notificacoes.getByRole('status')).toHaveText('Notificações ativadas neste aparelho.');
	const pessoa = await clienteComo(CONTA);
	expect((await pessoa.from('assinatura_push').select('endpoint')).data).toContainEqual({ endpoint: ENDPOINT });

	// A secretaria publica um aviso: o app pede o envio, e a função tenta entregar ao
	// aparelho (o endereço de teste não existe, então conta como falha de entrega).
	const contexto = await browser.newContext();
	const secretaria = await contexto.newPage();
	await entrar(secretaria, CONTAS.secretaria);
	await secretaria.goto('/avisos');
	await abrirAcao(secretaria, 'Novo aviso');
	await secretaria.getByLabel('Aviso', { exact: true }).fill(`Teste de notificação ${Date.now()}`);
	const [envio] = await Promise.all([
		secretaria.waitForResponse((r) => r.url().includes('/functions/v1/enviar-push') && r.request().method() === 'POST'),
		secretaria.getByRole('button', { name: 'Publicar' }).click()
	]);
	expect(envio.status()).toBe(200);
	const resultado = await envio.json();
	expect(resultado.enviadas + resultado.falhas + resultado.esquecidas).toBeGreaterThanOrEqual(1);
	await contexto.close();

	await notificacoes.getByRole('button', { name: 'Desativar notificações neste aparelho' }).click();
	await expect(notificacoes.getByRole('status')).toHaveText('Notificações desativadas neste aparelho.');
	expect((await pessoa.from('assinatura_push').select('endpoint')).data).not.toContainEqual({ endpoint: ENDPOINT });
});

test('a mensagem que chega ao service worker vira uma notificação', async ({ page, context, baseURL }) => {
	await context.grantPermissions(['notifications']);
	await entrar(page, CONTA);
	await page.evaluate(() => navigator.serviceWorker.ready);
	const cdp = await context.newCDPSession(page);
	const registro = new Promise<string>((resolver) =>
		cdp.on('ServiceWorker.workerRegistrationUpdated', ({ registrations }) => {
			const ativo = registrations.find((r) => !r.isDeleted);
			if (ativo) resolver(ativo.registrationId);
		})
	);
	await cdp.send('ServiceWorker.enable');
	const registrationId = await registro;
	const mostradas = () =>
		page.evaluate(async () =>
			(await (await navigator.serviceWorker.ready).getNotifications()).map((n) => `${n.title}: ${n.body} → ${n.data?.url}`)
		);
	// Logo depois de instalado, o service worker às vezes perde a primeira entrega: repete.
	await expect(async () => {
		await cdp.send('ServiceWorker.deliverPushMessage', {
			origin: new URL(baseURL!).origin,
			registrationId,
			data: JSON.stringify({ titulo: 'Aviso da organização', corpo: 'A plenária começa às 14h.', url: '/avisos' })
		});
		await expect.poll(mostradas, { timeout: 2_000 }).toContain('Aviso da organização: A plenária começa às 14h. → /avisos');
	}).toPass({ timeout: 15_000 });
});
