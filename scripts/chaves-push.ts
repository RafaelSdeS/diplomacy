// Gera um par de chaves VAPID (P-256) para as notificações Web Push e grava no arquivo
// de variáveis indicado, sem mostrar a chave privada. Mostra só a pública.
//
//   Local e CI:  node scripts/chaves-push.ts supabase/functions/.env
//   Nuvem:       node scripts/chaves-push.ts /tmp/push.env \
//                  && npx supabase secrets set --env-file /tmp/push.env && rm /tmp/push.env
//
// Trocar as chaves invalida as notificações ativadas: cada pessoa ativa de novo no perfil.
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const arquivo = process.argv[2];
if (!arquivo) {
	console.error('Uso: node scripts/chaves-push.ts <arquivo .env>');
	process.exit(1);
}
const jwk = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({ format: 'jwk' });
// O formato do Web Push: a pública é o ponto não comprimido (0x04 || x || y), em base64url.
const publica = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x!, 'base64url'), Buffer.from(jwk.y!, 'base64url')]).toString(
	'base64url'
);
const outras = existsSync(arquivo)
	? readFileSync(arquivo, 'utf8').split('\n').filter((l) => l && !l.startsWith('PUSH_CHAVE_'))
	: [];
writeFileSync(arquivo, [...outras, `PUSH_CHAVE_PUBLICA=${publica}`, `PUSH_CHAVE_PRIVADA=${jwk.d}`, ''].join('\n'), {
	mode: 0o600
});
console.log(`Chaves gravadas em ${arquivo}. Pública: ${publica}`);
