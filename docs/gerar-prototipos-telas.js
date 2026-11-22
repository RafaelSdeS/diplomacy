import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';

const root = resolve(process.cwd(), 'docs');
const html = `file://${root}/prototipos-telas.html`;
await mkdir(`${root}/imagens`, { recursive: true });

const server = spawn('python3', ['-m', 'http.server', '4178', '--directory', root], {
	stdio: 'ignore',
	detached: false
});

await new Promise((resolveReady) => setTimeout(resolveReady, 500));

const browser = await chromium.launch({ headless: true });

const screens = [
	['coletiva-pauta', 'coletiva-pauta.png'],
	['resposta-modal', 'coletiva-chamada-delegacao.png'],
	['telao', 'coletiva-telao.png'],
	['demo', 'demonstracao-escolha-papel.png'],
	['delegacao', 'ficha-delegacao.png'],
	['mobile', 'agora-mobile.png'],
	['seguranca', 'saida-segura.png']
];

for (const width of [1200]) {
	const page = await browser.newPage({ viewport: { width, height: 675 }, deviceScaleFactor: 1 });
	await page.goto(`http://127.0.0.1:4178/prototipos-telas.html`, { waitUntil: 'networkidle' });
	for (const [id, name] of screens) {
		await page.locator(`#${id}`).screenshot({ path: `${root}/imagens/${name}` });
	}
	await page.close();
}

const pdf = await browser.newPage({ viewport: { width: 1200, height: 675 } });
await pdf.goto(`http://127.0.0.1:4178/prototipos-telas.html`, { waitUntil: 'networkidle' });

async function gerarPdf(nome, ids) {
	await pdf.addStyleTag({
		content: `
			@page { size: 1200px 675px; margin: 0 }
			.capa { display: none !important }
			.album { display: block; padding: 0 }
			.sheet { display: none !important; break-after: page; box-shadow: none; margin: 0 }
			${ids.map((id) => `#${id} { display: ${id === 'mobile' ? 'grid' : id === 'coletiva-pauta' ? 'block' : id === 'resposta-modal' ? 'block' : id === 'telao' ? 'block' : id === 'demo' ? 'block' : id === 'delegacao' ? 'block' : id === 'seguranca' ? 'block' : 'block'} !important }`).join('\n')}
		`
	});
	await pdf.pdf({
		path: `${root}/${nome}`,
		printBackground: true,
		preferCSSPageSize: true
	});
	await pdf.reload({ waitUntil: 'networkidle' });
}

await gerarPdf('prototipos-coletiva.pdf', ['coletiva-pauta', 'resposta-modal', 'telao']);
await gerarPdf('prototipos-interface-demonstracao.pdf', ['demo', 'delegacao', 'mobile']);
await gerarPdf('prototipos-seguranca.pdf', ['seguranca']);

await browser.close();
server.kill('SIGTERM');
