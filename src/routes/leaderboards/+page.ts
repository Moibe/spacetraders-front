import { env } from '$env/dynamic/public';
import type { PageLoad } from './$types';

// Ventana del delta del leaderboard. Con estos bots comparar contra "hace
// 30s" (el ritmo de refresco) casi siempre da cero -- juegan en rachas de
// una vez cada varios minutos, no venden todo el tiempo. 5 minutos hace que
// el delta se vea con regularidad sin perder el sentido de "reciente".
export const _DELTA_WINDOW_S = 300;

export const load: PageLoad = async ({ fetch, depends }) => {
	// Ata este load a una clave propia para poder re-dispararlo desde el
	// componente (setInterval + invalidate) sin duplicar el fetch ahi.
	depends('app:leaderboard');

	const base = env.PUBLIC_API_URL ?? 'http://localhost:8010';

	const [statusRes, agentRes, historyRes] = await Promise.all([
		fetch(`${base}/api/status`),
		fetch(`${base}/api/agent`),
		// El snapshot persistido con al menos _DELTA_WINDOW_S de antiguedad, para
		// comparar contra el estado actual. Persistido en el backend (no en la
		// pestana), asi que el delta sobrevive un reload de la pagina.
		fetch(`${base}/api/leaderboard/history?before_seconds=${_DELTA_WINDOW_S}`)
	]);

	return {
		status: statusRes.ok ? await statusRes.json() : null,
		agent: agentRes.ok ? await agentRes.json() : null,
		previousBatch: historyRes.ok ? (await historyRes.json()).batches[0] ?? null : null
	};
};
