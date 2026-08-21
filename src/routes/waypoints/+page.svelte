<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Rasgos que le importan a alguien recien empezando: donde se compra/vende
	// y donde se compran naves. El resto de los rasgos se muestran igual, solo
	// sin resaltar.
	const DESTACADOS = new Set(['MARKETPLACE', 'SHIPYARD']);

	// La estrella nunca es un waypoint (no hay tipo "STAR" en la API): vive en
	// el objeto del sistema mismo, en el campo `type`. Traduccion corta para
	// alguien que no conoce los 10 valores posibles del enum SystemType.
	const ESTRELLA: Record<string, string> = {
		NEUTRON_STAR: 'estrella de neutrones',
		RED_STAR: 'estrella roja',
		ORANGE_STAR: 'estrella naranja',
		BLUE_STAR: 'estrella azul',
		YOUNG_STAR: 'estrella joven',
		WHITE_DWARF: 'enana blanca',
		BLACK_HOLE: 'agujero negro',
		HYPERGIANT: 'hipergigante',
		NEBULA: 'nebulosa',
		UNSTABLE: 'estrella inestable'
	};

	// Color decorativo del punto que representa la estrella -- no es una
	// paleta categorica que se compare lado a lado (por eso no pasa por el
	// validador de la skill dataviz), es un solo swatch describiendo un solo
	// valor a la vez.
	const COLOR_ESTRELLA: Record<string, string> = {
		NEUTRON_STAR: '#b388ff',
		RED_STAR: '#ff5555',
		ORANGE_STAR: '#ff8c3d',
		BLUE_STAR: '#5ac8fa',
		YOUNG_STAR: '#eaf6ff',
		WHITE_DWARF: '#f5f5f5',
		BLACK_HOLE: '#4b3d66',
		HYPERGIANT: '#ff4d4d',
		NEBULA: '#d966ff',
		UNSTABLE: '#d4ff4d'
	};

	// Que naves propias hay en cada waypoint, para poner el icono. Un mismo
	// waypoint puede tener mas de una nave (ej. dos atracadas en la base).
	const navesPorWaypoint = $derived.by(() => {
		const mapa: Record<string, string[]> = {};
		for (const nave of data.ships as { symbol: string; nav: { waypointSymbol: string } }[]) {
			(mapa[nave.nav.waypointSymbol] ??= []).push(nave.symbol);
		}
		return mapa;
	});

	// Nave desde la que se mide la distancia. Por default, la de mayor
	// bodega -- la que de verdad sale a comerciar (mismo criterio que usa el
	// bot de contratos para elegir nave), no la sonda que se queda fija.
	let naveReferencia = $state<string | null>(null);
	$effect(() => {
		const naves = data.ships as { symbol: string; cargo: { capacity: number } }[];
		// untrack: esta lectura es solo un guard, no debe volver a este efecto
		// dependiente de su propia escritura (eso lo haria correr en loop).
		if (naves.length === 0 || untrack(() => naveReferencia) !== null) return;
		naveReferencia = naves.reduce((mejor, n) =>
			n.cargo.capacity > mejor.cargo.capacity ? n : mejor
		).symbol;
	});

	const origenWaypoint = $derived.by(() => {
		const nave = (data.ships as { symbol: string; nav: { waypointSymbol: string } }[]).find(
			(n) => n.symbol === naveReferencia
		);
		if (!nave) return null;
		return (data.waypoints as { symbol: string; x: number; y: number }[]).find(
			(w) => w.symbol === nave.nav.waypointSymbol
		);
	});

	function distancia(w: { x: number; y: number }): number | null {
		if (!origenWaypoint) return null;
		return Math.hypot(w.x - origenWaypoint.x, w.y - origenWaypoint.y);
	}

	let filtro = $state('');

	const waypointsFiltrados = $derived.by(() => {
		const q = filtro.trim().toUpperCase();
		const base = !q
			? data.waypoints
			: data.waypoints.filter(
					(w: { symbol: string; type: string; traits: { symbol: string; name: string }[] }) =>
						w.symbol.includes(q) ||
						w.type.includes(q) ||
						w.traits.some((t) => t.symbol.includes(q) || t.name.toUpperCase().includes(q))
				);

		// Ordenado por cercania cuando ya se sabe desde donde medir -- es lo
		// que hace util a la distancia (que tan caro es llegar), no solo un
		// numero mas en la tabla.
		if (!origenWaypoint) return base;
		return [...base].sort((a, b) => (distancia(a) ?? 0) - (distancia(b) ?? 0));
	});
</script>

<svelte:head>
	<title>Ubicaciones</title>
</svelte:head>

<div class="waypoints-page">
	<h1>Ubicaciones{#if data.system}<span class="system"> · {data.system}</span>{/if}</h1>

	{#if !data.system}
		<p class="error">
			No se pudo conectar con spacetraders-api. ¿Está corriendo (npm run dev la arranca sola)?
		</p>
	{:else}
		<p class="meta">{data.waypoints.length} waypoints en este sistema.</p>

		{#if data.systemInfo}
			<div class="star-card">
				<span
					class="star-dot"
					style="background:{COLOR_ESTRELLA[data.systemInfo.type] ??
						'var(--sw-text-muted)'}; color:{COLOR_ESTRELLA[data.systemInfo.type] ??
						'var(--sw-text-muted)'}"
				></span>
				<div class="star-info">
					<span class="star-name"
						>{data.system}{#if data.systemInfo.name}{' · '}"{data.systemInfo.name}"{/if} · {ESTRELLA[
							data.systemInfo.type
						] ?? data.systemInfo.type}</span
					>
					<span class="star-meta"
						>{#if data.systemInfo.constellation}Constelación {data.systemInfo
								.constellation}{' · '}{/if}Sector {data.systemInfo.sectorSymbol} · posición galáctica
						({data.systemInfo.x}, {data.systemInfo.y})</span
					>
				</div>
			</div>
			<p class="note">
				Esa posición es la del sistema completo dentro de la galaxia -- no tiene relación con las
				coordenadas de la tabla de abajo, que son locales a este sistema.
			</p>
		{/if}

		<div class="controles">
			<input
				class="filtro"
				type="text"
				placeholder="Filtrar por símbolo, tipo o rasgo…"
				bind:value={filtro}
			/>

			{#if data.ships.length > 0}
				<label class="ref-label">
					Distancia desde
					<select class="ref-select" bind:value={naveReferencia}>
						{#each data.ships as nave (nave.symbol)}
							<option value={nave.symbol}>{nave.symbol}</option>
						{/each}
					</select>
				</label>
			{/if}
		</div>

		{#if origenWaypoint}
			<p class="note">
				Distancia relativa dentro del sistema (no metros reales) desde
				<strong>{origenWaypoint.symbol}</strong> -- a mayor distancia, más combustible consume el
				viaje.
			</p>
		{/if}

		<table>
			<thead>
				<tr>
					<th>Símbolo</th>
					<th>Tipo</th>
					{#if origenWaypoint}<th>Distancia</th>{/if}
					<th>Rasgos</th>
				</tr>
			</thead>
			<tbody>
				{#each waypointsFiltrados as w (w.symbol)}
					<tr class:aqui={navesPorWaypoint[w.symbol]}>
						<td class="symbol-cell">
							{#if navesPorWaypoint[w.symbol]}
								<span class="ship-icon" title={navesPorWaypoint[w.symbol].join(', ')}>
									<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
										<path d="M12 2 19 20 12 16 5 20Z" />
									</svg>
								</span>
							{/if}
							{w.symbol}
						</td>
						<td>{w.type}</td>
						{#if origenWaypoint}
							<td class="distancia">{distancia(w)?.toFixed(1)}</td>
						{/if}
						<td class="traits">
							{#each w.traits as t (t.symbol)}
								<span class="trait" class:destacado={DESTACADOS.has(t.symbol)} title={t.description}>
									{t.name}
								</span>
							{/each}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		{#if waypointsFiltrados.length === 0}
			<p class="note">Ningún waypoint coincide con "{filtro}".</p>
		{/if}
	{/if}
</div>

<style>
	.waypoints-page {
		padding: 0.5rem 0.25rem;
		color: var(--sw-text);
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: 1.4rem;
		color: var(--sw-blue);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		text-shadow: 0 0 6px rgba(90, 200, 250, 0.35);
	}

	.system {
		font-weight: 400;
		color: var(--sw-text-muted);
	}

	.meta {
		margin: 0.25rem 0 0.75rem;
		font-size: 0.9rem;
		color: var(--sw-text-muted);
	}

	.star-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.65rem 0.9rem;
		margin-bottom: 0.4rem;
		border-radius: 6px;
		background: var(--sw-panel-raised);
		border: 1px solid var(--sw-blue-dim);
	}

	.star-dot {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		border-radius: 50%;
		box-shadow: 0 0 10px 2px currentColor;
	}

	.star-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.star-name {
		font-weight: 700;
		color: var(--sw-text);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		font-size: 0.9rem;
	}

	.star-meta {
		font-size: 0.78rem;
		color: var(--sw-text-muted);
	}

	.controles {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.filtro {
		flex: 1 1 260px;
		max-width: 360px;
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
		border: 1px solid var(--sw-blue-dim);
		background: var(--sw-panel-raised);
		color: var(--sw-text);
		font-size: 0.9rem;
		font-family: inherit;
	}

	.filtro:focus {
		outline: none;
		border-color: var(--sw-blue);
		box-shadow: 0 0 0 2px var(--sw-blue-faint);
	}

	.ref-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--sw-text-muted);
		white-space: nowrap;
	}

	.ref-select {
		padding: 0.35rem 0.6rem;
		border-radius: 4px;
		border: 1px solid var(--sw-blue-dim);
		background: var(--sw-panel-raised);
		color: var(--sw-text);
		font-size: 0.85rem;
		font-family: inherit;
	}

	.distancia {
		font-variant-numeric: tabular-nums;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		text-align: left;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid rgba(90, 200, 250, 0.15);
		vertical-align: top;
	}

	th {
		font-weight: 600;
		color: var(--sw-text-muted);
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	td {
		font-size: 0.88rem;
	}

	.symbol-cell {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.ship-icon {
		display: inline-flex;
		flex-shrink: 0;
		width: 15px;
		height: 15px;
		color: var(--sw-amber);
		filter: drop-shadow(0 0 3px rgba(255, 176, 0, 0.6));
	}

	.ship-icon svg {
		width: 100%;
		height: 100%;
	}

	tr.aqui {
		background: rgba(255, 176, 0, 0.1);
	}

	.traits {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.trait {
		display: inline-block;
		font-size: 0.72rem;
		padding: 0.12rem 0.5rem;
		border-radius: 999px;
		background: var(--sw-panel-raised);
		border: 1px solid var(--sw-blue-dim);
		color: var(--sw-text-muted);
		white-space: nowrap;
	}

	.trait.destacado {
		background: rgba(255, 176, 0, 0.18);
		border-color: rgba(255, 176, 0, 0.5);
		color: var(--sw-amber);
		font-weight: 700;
	}

	.note {
		font-size: 0.85rem;
		color: var(--sw-text-muted);
	}

	.error {
		color: var(--sw-red);
		font-weight: 600;
	}
</style>
