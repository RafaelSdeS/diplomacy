import { criarCaixa, type Item } from './caixa-de-saida.ts';
import { supabase } from './supabase.ts';

/** A caixa de saída do app: envia pela API, com a imagem antes, se houver. */
export const caixa = criarCaixa(async (item: Item) => {
	if (item.imagem) {
		const { bucket, caminho, blob } = item.imagem;
		const { error } = await supabase.storage.from(bucket).upload(caminho, blob, { contentType: blob.type, upsert: true });
		if (error) {
			const status = (error as { status?: number }).status;
			return { code: status ? `HTTP${status}` : '', message: error.message };
		}
	}
	const { error } = await supabase.rpc(item.rpc as never, item.args as never);
	return error;
});

/** A mensagem para quem enviou: enviado, guardado na caixa ou recusado. */
export function mensagemDoEnvio(resultado: Awaited<ReturnType<typeof caixa.enviar>>, enviado: string) {
	if (resultado === 'enviado') return { mensagem: enviado, erro: '' };
	if (resultado === 'guardado')
		return { mensagem: 'Sem conexão: ficou guardado no aparelho e vai sozinho quando a internet voltar.', erro: '' };
	return { mensagem: '', erro: resultado.erro?.message ?? 'Não foi possível enviar.' };
}
