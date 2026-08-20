import { env } from '$env/dynamic/public';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, depends }) => {
	// Ata este load a una clave propia para poder re-dispararlo desde el
	// componente (setInterval + invalidate) sin duplicar el fetch ahi.
	depends('app:leaderboard');

	const base = env.PUBLIC_API_URL ?? 'http://localhost:8010';

	const [statusRes, agentRes, deltasRes] = await Promise.all([
		fetch(`${base}/api/status`),
		fetch(`${base}/api/agent`),
		// El ultimo incremento observado por agente, persistido en el backend
		// (no en la pestana) -- se mantiene "pegado" hasta que se observe uno
		// nuevo, en vez de desaparecer cuando pasa una ventana fija de tiempo.
		fetch(`${base}/api/leaderboard/deltas`)
	]);

	return {
		status: statusRes.ok ? await statusRes.json() : null,
		agent: agentRes.ok ? await agentRes.json() : null,
		deltas: deltasRes.ok ? (await deltasRes.json()).deltas : {}
	};
};
