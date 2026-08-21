import { env } from '$env/dynamic/public';
import type { PageLoad } from './$types';

// Mismo criterio que /waypoints y que spacetraders.api.system_of() del lado
// Python: los dos primeros segmentos de un simbolo de waypoint son el sistema.
function systemOf(waypointSymbol: string): string {
	return waypointSymbol.split('-').slice(0, 2).join('-');
}

export const load: PageLoad = async ({ fetch }) => {
	const base = env.PUBLIC_API_URL ?? 'http://localhost:8010';

	const agentRes = await fetch(`${base}/api/agent`);
	if (!agentRes.ok) {
		return { system: null, systemInfo: null, waypoints: [], ships: [] };
	}
	const agent = await agentRes.json();
	const system = systemOf(agent.headquarters);

	const [systemRes, waypointsRes, shipsRes] = await Promise.all([
		fetch(`${base}/api/systems/${system}`),
		fetch(`${base}/api/systems/${system}/waypoints`),
		fetch(`${base}/api/ships`)
	]);

	return {
		system,
		// El sistema en si (estrella, sector, posicion galactica) -- distinto de
		// `waypoints`, que solo trae lo que orbita al sistema, nunca al sistema
		// mismo. Ver spacetraders-api/main.py:get_system.
		systemInfo: systemRes.ok ? await systemRes.json() : null,
		waypoints: waypointsRes.ok ? await waypointsRes.json() : [],
		ships: shipsRes.ok ? await shipsRes.json() : []
	};
};
