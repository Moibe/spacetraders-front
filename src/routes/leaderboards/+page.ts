import { env } from '$env/dynamic/public';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, depends }) => {
	// Ata este load a una clave propia para poder re-dispararlo desde el
	// componente (setInterval + invalidate) sin duplicar el fetch ahi.
	depends('app:leaderboard');

	const base = env.PUBLIC_API_URL ?? 'http://localhost:8010';

	const [statusRes, agentRes, historyRes] = await Promise.all([
		fetch(`${base}/api/status`),
		fetch(`${base}/api/agent`),
		// limit=1: el snapshot persistido mas reciente, para comparar contra el
		// estado actual y calcular el delta. Persistido en el backend (no en la
		// pestana), asi que sobrevive un reload de la pagina.
		fetch(`${base}/api/leaderboard/history?limit=1`)
	]);

	return {
		status: statusRes.ok ? await statusRes.json() : null,
		agent: agentRes.ok ? await agentRes.json() : null,
		previousBatch: historyRes.ok ? (await historyRes.json()).batches[0] ?? null : null
	};
};
