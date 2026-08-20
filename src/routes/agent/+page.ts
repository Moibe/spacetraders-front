import { env } from '$env/dynamic/public';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, depends }) => {
	// Ata este load a una clave propia para re-dispararlo desde el componente
	// (setInterval + invalidate), igual que /leaderboards.
	depends('app:agent');

	const base = env.PUBLIC_API_URL ?? 'http://localhost:8010';

	const [agentRes, shipsRes, contractsRes] = await Promise.all([
		fetch(`${base}/api/agent`),
		fetch(`${base}/api/ships`),
		fetch(`${base}/api/contracts`)
	]);

	return {
		agent: agentRes.ok ? await agentRes.json() : null,
		ships: shipsRes.ok ? await shipsRes.json() : [],
		contracts: contractsRes.ok ? await contractsRes.json() : []
	};
};
