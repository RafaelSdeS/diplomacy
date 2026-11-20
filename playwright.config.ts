import { defineConfig, devices } from '@playwright/test';

const ci = !!process.env.CI;

// As três telas da definição de pronto. Todas no Chromium; Safari e Android
// de verdade ficam nos testes manuais de cada passo.
const telas = {
	celular: { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true },
	notebook: { viewport: { width: 1366, height: 768 } },
	telao: { viewport: { width: 1920, height: 1080 } }
};

export default defineConfig({
	testDir: 'tests',
	fullyParallel: true,
	// No CI, um processo só: os fluxos ao vivo (sessão, crise, avisos) juntos passam do
	// limite do tempo real local (100 mensagens por segundo, o mesmo do plano gratuito),
	// e o servidor descarta mensagens. A capacidade tem teste próprio (passo 13).
	workers: ci ? 1 : undefined,
	forbidOnly: ci,
	retries: ci ? 1 : 0,
	reporter: ci ? [['github'], ['html', { open: 'never' }]] : 'list',
	// Capturas de referência geradas só no CI (mesmo contêiner), por isso sem o sistema no nome.
	snapshotPathTemplate: '{testDir}/capturas/{testFileName}/{arg}-{projectName}{ext}',
	use: {
		baseURL: 'http://localhost:4173',
		locale: 'pt-BR',
		timezoneId: 'America/Sao_Paulo'
	},
	projects: Object.entries(telas).map(([name, tela]) => ({
		name,
		use: { ...devices['Desktop Chrome'], ...tela }
	})),
	webServer: {
		// No CI o build já foi feito (e medido) antes dos testes.
		command: ci ? 'npm run preview' : 'npm run build && npm run preview',
		port: 4173,
		reuseExistingServer: !ci
	}
});
