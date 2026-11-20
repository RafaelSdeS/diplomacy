import { defineEnvVars } from '@sveltejs/kit/env';

// Variáveis lidas do .env (veja .env.example). Todas são públicas e fixadas no
// build, porque o app é uma SPA sem servidor.
export const variables = defineEnvVars({
	SUPABASE_URL: {
		public: true,
		static: true,
		description: 'URL do projeto Supabase.'
	},
	SUPABASE_CHAVE: {
		public: true,
		static: true,
		description: 'Chave pública do Supabase (anon ou publishable). Nunca a chave de serviço.'
	},
	LOGIN_GOOGLE: {
		public: true,
		static: true,
		schema: (valor) => valor === '1',
		description: '"1" mostra o botão "Entrar com Google" (precisa do provedor configurado no Supabase).'
	}
});
