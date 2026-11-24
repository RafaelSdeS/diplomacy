// Passo 52: roda só os testes de ponta a ponta ligados ao que mudou (no disco e nos commits
// que ainda não subiram). Argumentos extras vão para o Playwright: npm run testar:mudou -- --project=notebook
// A suíte inteira continua antes do commit (npm run test:e2e) e no CI.
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { testesDaMudanca } from './testes-da-mudanca.ts';

const git = (...args: string[]) => {
	try {
		return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean);
	} catch {
		return []; // sem ramo remoto, por exemplo
	}
};
const alterados = [
	...git('diff', '--name-only', 'HEAD'),
	...git('ls-files', '--others', '--exclude-standard'),
	...git('diff', '--name-only', '@{upstream}...HEAD')
];

// Só arquivos (as pastas de capturas têm o nome do teste, como tests/capturas/06-sessao.spec.ts/).
const ler = (pasta: string, filtro: RegExp, recursivo = true): Record<string, string> =>
	Object.fromEntries(
		readdirSync(pasta, { recursive: recursivo, withFileTypes: true })
			.filter((f) => f.isFile() && filtro.test(f.name))
			.map((f) => join(f.parentPath, f.name))
			.map((f) => [f, readFileSync(f, 'utf8')])
	);

const testes = testesDaMudanca([...new Set(alterados)], ler('src', /\.(svelte|ts)$/), ler('tests', /\.spec\.ts$/, false));
if (testes !== 'todos' && !testes.length) {
	console.log('Nada a testar de ponta a ponta para o que mudou.');
	process.exit(0);
}
console.log(testes === 'todos' ? 'A mudança pede a suíte inteira.' : `Testes da mudança: ${testes.join(' ')}`);
const resultado = spawnSync('npx', ['playwright', 'test', ...(testes === 'todos' ? [] : testes), ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(resultado.status ?? 1);
