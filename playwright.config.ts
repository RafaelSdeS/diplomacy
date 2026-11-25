import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const ci = !!process.env.CI;

// As três telas da definição de pronto. Todas no Chromium; Safari e Android
// de verdade ficam nos testes manuais de cada passo.
const telas = {
	celular: { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true },
	notebook: { viewport: { width: 1366, height: 768 } },
	telao: { viewport: { width: 1920, height: 1080 } }
};

// Passo 39: os arquivos que só rodam no notebook (os que começam com o beforeEach que pula
// os outros projetos) nem entram no celular e no telão. Pulados em massa, eles
// desequilibravam as partes do CI, que dividem os testes por quantidade.
const SO_NOTEBOOK = readdirSync('tests').filter(
	(f) =>
		f.endsWith('.spec.ts') &&
		/^test\.beforeEach\(\(\{\}, info\) => \{\n\ttest\.skip\(info\.project\.name !== 'notebook'/m.test(readFileSync(`tests/${f}`, 'utf8'))
);

export default defineConfig({
	testDir: 'tests',
	fullyParallel: true,
	// Cada arquivo que mexe em estado ao vivo tem o próprio comitê (passo 39), e o tempo
	// real só avisa (Broadcast) e relê o que mudou (passo 40): no computador, 10 processos
	// num Supabase só passam. No CI, cada parte tem 2 vCPUs por processo de navegador.
	// Passo 52: no computador, 6 processos (com 10, a carga passava de 30 e os testes
	// estouravam o tempo; cada teste abre vários navegadores ao lado do Supabase).
	workers: ci ? 2 : 6,
	forbidOnly: ci,
	retries: ci ? 1 : 0,
	// Passo 52: um teste que só passa na segunda tentativa é defeito, não sorte.
	failOnFlakyTests: ci,
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
		use: { ...devices['Desktop Chrome'], ...tela },
		testIgnore: name === 'notebook' ? [] : SO_NOTEBOOK
	})),
	webServer: {
		// No CI o build já foi feito (e medido) antes dos testes. No computador, só refaz a
		// build se o app mudou (passo 52).
		command: ci ? 'npm run preview' : 'node scripts/build-se-preciso.ts && npm run preview',
		port: 4173,
		reuseExistingServer: !ci
	}
});
