import { env } from '$env/dynamic/public';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, depends }) => {
	// Ata este load a una clave propia para poder re-dispararlo desde el
	// componente (setInterval + invalidate) sin duplicar el fetch ahi.
	depends('app:leaderboard');

	const base = env.PUBLIC_API_URL ?? 'http://localhost:8010';

	const [statusRes, agentRes] = await Promise.all([
		fetch(`${base}/api/status`),
		fetch(`${base}/api/agent`)
	]);

	return {
		status: statusRes.ok ? await statusRes.json() : null,
		agent: agentRes.ok ? await agentRes.json() : null
	};
};
