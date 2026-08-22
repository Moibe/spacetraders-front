import { env } from '$env/dynamic/public';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const base = env.PUBLIC_API_URL ?? 'http://localhost:8010';

	// No hay depends/polling aqui: esto se actualiza solo cada 30s del lado
	// del servidor, y una temporada pasada por definicion ya no cambia --
	// no hace falta refrescar la pagina en vivo para verlo.
	const res = await fetch(`${base}/api/seasons`);

	return {
		seasons: res.ok
			? ((await res.json()) as {
					reset_date: string;
					system_symbol: string;
					agent_symbol: string;
					faction_symbol: string;
					credits: number;
					ship_count: number;
					universe_agents: number;
					universe_ships: number;
					universe_systems: number;
					universe_waypoints: number;
					first_seen_at: string;
					last_seen_at: string;
				}[])
			: []
	};
};
