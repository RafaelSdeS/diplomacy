// Veja https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {}
	// Passo 54: o commit do build (vite.config.ts), na página "Sobre".
	const __VERSAO__: string;
}

export {};
