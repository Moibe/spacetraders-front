import { env } from '$env/dynamic/public';
import type { PageLoad } from './$types';

// Mismo criterio que spacetraders.api.system_of() del lado Python: los dos
// primeros segmentos de un simbolo de waypoint son el sistema.
function systemOf(waypointSymbol: string): string {
	return waypointSymbol.split('-').slice(0, 2).join('-');
}

export const load: PageLoad = async ({ fetch }) => {
	const base = env.PUBLIC_API_URL ?? 'http://localhost:8010';

	// El sistema no es fijo de antemano: se deriva de la base del agente, para
	// que siga siendo correcto si algun dia cambia (otro reset, otro agente).
	const agentRes = await fetch(`${base}/api/agent`);
	if (!agentRes.ok) {
		return { system: null, waypoints: [] };
	}
	const agent = await agentRes.json();
	const system = systemOf(agent.headquarters);

	const [waypointsRes, shipsRes] = await Promise.all([
		fetch(`${base}/api/systems/${system}/waypoints`),
		fetch(`${base}/api/ships`)
	]);

	return {
		system,
		waypoints: waypointsRes.ok ? await waypointsRes.json() : [],
		ships: shipsRes.ok ? await shipsRes.json() : []
	};
};
