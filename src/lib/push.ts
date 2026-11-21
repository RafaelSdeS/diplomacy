// Notificações Web Push (passo 15, bônus). No iPhone só funcionam com o app na tela de
// início. Nada depende delas: a Agora e o telão continuam sendo o canal principal.
import { supabase } from './supabase.ts';

export type EstadoPush = 'indisponivel' | 'bloqueado' | 'ativo' | 'inativo';

export const pushDisponivel = () =>
	typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const assinaturaAtual = async () => (await navigator.serviceWorker.ready).pushManager.getSubscription();

export async function estadoPush(): Promise<EstadoPush> {
	if (!pushDisponivel()) return 'indisponivel';
	if (Notification.permission === 'denied') return 'bloqueado';
	return (await assinaturaAtual()) ? 'ativo' : 'inativo';
}

/** Pede a permissão, assina no navegador e guarda o aparelho no banco. */
export async function ativarPush(): Promise<EstadoPush> {
	if ((await Notification.requestPermission()) !== 'granted') return 'bloqueado';
	const chave = await supabase.functions.invoke<{ chave: string }>('enviar-push', { method: 'GET' });
	if (chave.error || !chave.data?.chave) throw new Error('sem chave');
	const registro = await navigator.serviceWorker.ready;
	const assinatura = await registro.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: Uint8Array.from(atob(chave.data.chave.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
			c.charCodeAt(0)
		)
	});
	const { endpoint, keys } = assinatura.toJSON();
	const { error } = await supabase.rpc('salvar_assinatura_push', {
		p_endpoint: endpoint!,
		p_p256dh: keys!.p256dh,
		p_auth: keys!.auth
	});
	if (error) {
		await assinatura.unsubscribe();
		throw error;
	}
	return 'ativo';
}

/** Desliga neste aparelho (também ao sair da conta: o aparelho pode ser de outra pessoa). */
export async function desativarPush() {
	if (!pushDisponivel()) return;
	const assinatura = await assinaturaAtual();
	if (!assinatura) return;
	await supabase.rpc('remover_assinatura_push', { p_endpoint: assinatura.endpoint });
	await assinatura.unsubscribe();
}

/**
 * Pede o envio depois de publicar um aviso ou responder notas. O banco decide quem
 * recebe, e cada item sai uma vez só.
 * ponytail: se o app fechar entre publicar e pedir, a notificação não sai (o aviso
 * aparece no app do mesmo jeito). Um gatilho com pg_net resolveria, se fizer falta.
 */
export function pedirNotificacao(tipo: 'aviso' | 'nota', ids: string[]) {
	if (!ids.length) return;
	void supabase.functions.invoke('enviar-push', { body: { tipo, ids } }).catch(() => {});
}
