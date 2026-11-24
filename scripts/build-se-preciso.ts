// Passo 52: refaz a build só se algum arquivo do app mudou depois da última.
// Sem isso, cada rodada local dos testes refazia a build (20 a 30 s).
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MARCA = 'build/.feita';
const ENTRADAS = ['src', 'static', 'svelte.config.js', 'vite.config.ts', 'package-lock.json', '.env'];

function maisNovo(caminho: string): number {
	if (!existsSync(caminho)) return 0;
	const info = statSync(caminho);
	if (!info.isDirectory()) return info.mtimeMs;
	return Math.max(info.mtimeMs, ...readdirSync(caminho).map((f) => maisNovo(join(caminho, f))));
}

const feita = existsSync(MARCA) ? statSync(MARCA).mtimeMs : 0;
if (Math.max(...ENTRADAS.map(maisNovo)) > feita) {
	execSync('npm run build', { stdio: 'inherit' });
	writeFileSync(MARCA, new Date().toISOString());
} else {
	console.log('Build em dia: nada mudou no app desde a última.');
}
