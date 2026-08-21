import { env } from '$env/dynamic/public';
import type { PageLoad } from './$types';

// Mismo criterio que /waypoints y /map.
function systemOf(waypointSymbol: string): string {
	return waypointSymbol.split('-').slice(0, 2).join('-');
}

export const load: PageLoad = async ({ fetch }) => {
	const base = env.PUBLIC_API_URL ?? 'http://localhost:8010';

	const agentRes = await fetch(`${base}/api/agent`);
	if (!agentRes.ok) {
		return { system: null, updatedAt: null, markets: [] };
	}
	const agent = await agentRes.json();
	const system = systemOf(agent.headquarters);

	// El catalogo ya viene persistido (lo llena _market_catalog_loop en el
	// backend cada varias horas) -- este fetch nunca le pide nada al juego
	// en el momento, por eso esta pagina no necesita el polling de 30s que
	// tienen las demas.
	const catalogRes = await fetch(`${base}/api/systems/${system}/markets`);
	const catalog = catalogRes.ok ? await catalogRes.json() : { updatedAt: null, markets: [] };

	return {
		system,
		updatedAt: catalog.updatedAt as string | null,
		markets: catalog.markets as {
			waypointSymbol: string;
			exports: string[];
			imports: string[];
			exchange: string[];
		}[]
	};
};
