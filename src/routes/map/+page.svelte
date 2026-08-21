<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Waypoint = {
		symbol: string;
		type: string;
		x: number;
		y: number;
		traits: { symbol: string; name: string }[];
	};
	type Ship = { symbol: string; nav: { waypointSymbol: string } };

	// Paleta categorica validada con scripts/validate_palette.js de la skill
	// dataviz --pairs all (obligatorio para scatter: cualquier par de puntos
	// puede quedar lado a lado, no solo los vecinos). Los primeros 3 slots del
	// tema por default son los unicos que pasan all-pairs en ambos modos --
	// por eso son exactamente 3 categorias, no una por cada uno de los 9
	// "type" que trae la API (eso hubiera fallado la separacion CVD). Re-
	// validados contra el fondo oscuro nuevo (surface #0a1420, --pairs all,
	// ambos pisos CVD/vision normal limpios) al pasar el mapa al tema Star
	// Wars -- estos hex NO son los mismos que en el fondo claro original.
	const COLOR: Record<string, string> = {
		asteroide: '#3987e5', // slot 1 (blue)
		cuerpo: '#d95926', // slot 2 (orange)
		estructura: '#199e70' // slot 3 (aqua)
	};
	const LABEL: Record<string, string> = {
		asteroide: 'Asteroide',
		cuerpo: 'Cuerpo celeste',
		estructura: 'Estructura'
	};

	function categoria(type: string): keyof typeof COLOR {
		if (type === 'ASTEROID' || type === 'ENGINEERED_ASTEROID') return 'asteroide';
		if (type === 'PLANET' || type === 'MOON' || type === 'GAS_GIANT') return 'cuerpo';
		return 'estructura'; // FUEL_STATION, ORBITAL_STATION, ASTEROID_BASE, JUMP_GATE
	}

	// Mismos rasgos que se resaltan en /waypoints -- aca se traducen a un
	// segundo canal (tamaño), no a un cuarto color: agregar mas colores rompia
	// la separacion CVD validada para scatter (--pairs all).
	const DESTACADOS = new Set(['MARKETPLACE', 'SHIPYARD']);

	const navesPorWaypoint = $derived.by(() => {
		const mapa: Record<string, string[]> = {};
		for (const nave of data.ships as Ship[]) {
			(mapa[nave.nav.waypointSymbol] ??= []).push(nave.symbol);
		}
		return mapa;
	});

	// Lienzo cuadrado en su propio sistema de coordenadas SVG (0..VIEW),
	// independiente del tamaño real en pantalla -- viewBox lo escala solo.
	const VIEW = 640;
	const MARGIN = 34;

	const bounds = $derived.by(() => {
		const waypoints = data.waypoints as Waypoint[];
		const xs = waypoints.map((w) => w.x);
		const ys = waypoints.map((w) => w.y);
		const minX = Math.min(...xs);
		const maxX = Math.max(...xs);
		const minY = Math.min(...ys);
		const maxY = Math.max(...ys);
		// Colchon proporcional para que los puntos del borde no queden pegados
		// al marco del plano.
		const padX = Math.max(1, (maxX - minX) * 0.08);
		const padY = Math.max(1, (maxY - minY) * 0.08);
		return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
	});

	function proyectar(w: { x: number; y: number }): { px: number; py: number } {
		const { minX, maxX, minY, maxY } = bounds;
		const rangoX = maxX - minX || 1;
		const rangoY = maxY - minY || 1;
		const lienzo = VIEW - 2 * MARGIN;
		return {
			px: MARGIN + ((w.x - minX) / rangoX) * lienzo,
			// Y invertido: SVG crece hacia abajo, el plano cartesiano hacia arriba.
			py: MARGIN + ((maxY - w.y) / rangoY) * lienzo
		};
	}

	const origenEnRango = $derived(
		bounds.minX <= 0 && 0 <= bounds.maxX && bounds.minY <= 0 && 0 <= bounds.maxY
	);
	const origenSvg = $derived(proyectar({ x: 0, y: 0 }));

	// Punto activo (mouse o teclado) -- mismos datos en ambos casos, como pide
	// la skill dataviz (paridad hover/focus).
	let activo = $state<string | null>(null);
	const puntoActivo = $derived(
		activo ? (data.waypoints as Waypoint[]).find((w) => w.symbol === activo) ?? null : null
	);
</script>

<svelte:head>
	<title>Mapa</title>
</svelte:head>

<div class="map-page">
	<h1>Mapa{#if data.system}<span class="system"> · {data.system}</span>{/if}</h1>

	{#if !data.system}
		<p class="error">
			No se pudo conectar con spacetraders-api. ¿Está corriendo (npm run dev la arranca sola)?
		</p>
	{:else}
		<p class="meta">
			{data.waypoints.length} waypoints, posición real dentro del sistema (coordenadas x/y del
			juego).
		</p>

		<div class="legend">
			{#each Object.keys(COLOR) as cat (cat)}
				<span class="legend-item">
					<span class="swatch" style="background:{COLOR[cat]}"></span>
					{LABEL[cat]}
				</span>
			{/each}
			<span class="legend-item">
				<span class="swatch swatch-grande" style="background:#898781"></span>
				Marketplace/Shipyard (punto más grande)
			</span>
			<span class="legend-item">
				<svg class="legend-ship" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M12 2 19 20 12 16 5 20Z" />
				</svg>
				Tu nave
			</span>
		</div>

		<svg class="plano" viewBox="0 0 {VIEW} {VIEW}" role="img" aria-label="Mapa de {data.system}">
			<defs>
				<filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
					<feGaussianBlur stdDeviation="3.2" result="blur" />
					<feMerge>
						<feMergeNode in="blur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>

			<rect x="0" y="0" width={VIEW} height={VIEW} class="fondo" />

			{#if origenEnRango}
				<line x1={MARGIN} y1={origenSvg.py} x2={VIEW - MARGIN} y2={origenSvg.py} class="eje" />
				<line x1={origenSvg.px} y1={MARGIN} x2={origenSvg.px} y2={VIEW - MARGIN} class="eje" />
			{/if}

			<!-- Coordenadas de referencia en las esquinas del colchon. -->
			<text x={MARGIN} y={VIEW - 10} class="tick">x≈{Math.round(bounds.minX)}</text>
			<text x={VIEW - MARGIN} y={VIEW - 10} text-anchor="end" class="tick"
				>x≈{Math.round(bounds.maxX)}</text
			>
			<text x="8" y={MARGIN} class="tick">y≈{Math.round(bounds.maxY)}</text>
			<text x="8" y={VIEW - MARGIN} class="tick">y≈{Math.round(bounds.minY)}</text>

			{#each data.waypoints as w (w.symbol)}
				{@const p = proyectar(w)}
				{@const cat = categoria(w.type)}
				{@const destacado = w.traits.some((t) => DESTACADOS.has(t.symbol))}
				{@const naves = navesPorWaypoint[w.symbol]}
				<g
					class="punto-grupo"
					tabindex="0"
					role="button"
					aria-label="{w.symbol}, {w.type}{destacado ? ', con marketplace o shipyard' : ''}{naves
						? ', tu nave está aquí'
						: ''}"
					onmouseenter={() => (activo = w.symbol)}
					onmouseleave={() => (activo = null)}
					onfocus={() => (activo = w.symbol)}
					onblur={() => (activo = null)}
				>
					<!-- Zona de hover mas grande que el punto pintado (spec: ≥24px). -->
					<circle cx={p.px} cy={p.py} r="12" class="hit" />
					<circle
						cx={p.px}
						cy={p.py}
						r={destacado ? 6 : 4}
						fill={COLOR[cat]}
						class="marca"
						class:activa={activo === w.symbol}
						filter="url(#glow)"
					/>
					{#if naves}
						<path
							d="M12 2 19 20 12 16 5 20Z"
							transform="translate({p.px - 4} {p.py - 15}) scale(0.35)"
							class="nave-marca"
						/>
					{/if}
				</g>
			{/each}

			{#if puntoActivo}
				{@const p = proyectar(puntoActivo)}
				<g class="tooltip" transform="translate({p.px} {Math.max(MARGIN, p.py - 20)})">
					<rect x="-72" y="-16" width="144" height="20" rx="5" class="tooltip-fondo" />
					<text x="0" y="-2" text-anchor="middle" class="tooltip-texto"
						>{puntoActivo.symbol} · {puntoActivo.type}</text
					>
				</g>
			{/if}
		</svg>

		<p class="note">
			Distancia relativa dentro del sistema, no metros reales. <a href="/waypoints"
				>Ver como tabla →</a
			>
		</p>
	{/if}
</div>

<style>
	.map-page {
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

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.9rem;
		margin-bottom: 0.75rem;
		font-size: 0.82rem;
		color: var(--sw-text-muted);
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.swatch-grande {
		width: 14px;
		height: 14px;
	}

	.legend-ship {
		width: 12px;
		height: 12px;
		color: var(--sw-amber);
		flex-shrink: 0;
	}

	.plano {
		width: 100%;
		max-width: 640px;
		aspect-ratio: 1;
		display: block;
		border-radius: 6px;
		border: 1px solid var(--sw-blue-dim);
		box-shadow: 0 0 16px rgba(90, 200, 250, 0.1);
	}

	.fondo {
		fill: var(--sw-panel);
	}

	.eje {
		stroke: rgba(90, 200, 250, 0.2);
		stroke-width: 1;
	}

	.tick {
		fill: var(--sw-text-muted);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}

	.hit {
		fill: transparent;
		cursor: pointer;
	}

	.marca {
		stroke: var(--sw-panel);
		stroke-width: 2;
		transition: r 0.12s ease;
	}

	.marca.activa {
		stroke: var(--sw-text);
	}

	.nave-marca {
		fill: var(--sw-amber);
		pointer-events: none;
	}

	.tooltip-fondo {
		fill: var(--sw-panel-raised);
		stroke: var(--sw-blue-dim);
		stroke-width: 1;
	}

	.tooltip-texto {
		fill: var(--sw-text);
		font-size: 12px;
	}

	.note {
		margin-top: 0.6rem;
		font-size: 0.8rem;
		color: var(--sw-text-muted);
	}

	.note a {
		color: var(--sw-blue);
		font-weight: 600;
	}

	.error {
		color: var(--sw-red);
		font-weight: 600;
	}
</style>
