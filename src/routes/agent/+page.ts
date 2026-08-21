import { env } from '$env/dynamic/public';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, depends }) => {
	// Ata este load a una clave propia para re-dispararlo desde el componente
	// (setInterval + invalidate), igual que /leaderboards.
	depends('app:agent');

	const base = env.PUBLIC_API_URL ?? 'http://localhost:8010';

	// La faccion se deriva del agente (agent.startingFaction), asi que ese
	// fetch va primero -- el resto si puede ir en paralelo.
	const agentRes = await fetch(`${base}/api/agent`);
	if (!agentRes.ok) {
		return { agent: null, faction: null, ships: [], contracts: [] };
	}
	const agent = await agentRes.json();

	const [factionRes, shipsRes, contractsRes] = await Promise.all([
		fetch(`${base}/api/factions/${agent.startingFaction}`),
		fetch(`${base}/api/ships`),
		fetch(`${base}/api/contracts`)
	]);

	return {
		agent,
		faction: factionRes.ok ? await factionRes.json() : null,
		ships: shipsRes.ok ? await shipsRes.json() : [],
		contracts: contractsRes.ok ? await contractsRes.json() : []
	};
};
