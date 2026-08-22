import { env } from '$env/dynamic/public';

// Apodos personales para waypoints (ej. "Tierra" para X1-SC86-A1) -- no es
// dato del juego, viven en la base de spacetraders-api y nunca se mandan a
// la API de SpaceTraders. Se usan en todas las paginas que muestran un
// symbol de waypoint, para que alguien aprendiendo la nomenclatura tenga
// ademas un nombre familiar.

export type Aliases = Record<string, string>;

export async function fetchAliases(fetchFn: typeof fetch = fetch): Promise<Aliases> {
	const base = env.PUBLIC_API_URL ?? 'http://localhost:8010';
	const res = await fetchFn(`${base}/api/aliases`);
	return res.ok ? await res.json() : {};
}

// "X1-SC86-A1" + {"X1-SC86-A1": "Tierra"} -> "X1-SC86-A1 (Tierra)"
export function withAlias(symbol: string, aliases: Aliases): string {
	const alias = aliases[symbol];
	return alias ? `${symbol} (${alias})` : symbol;
}
