<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Market = { waypointSymbol: string; exports: string[]; imports: string[]; exchange: string[] };

	let filtro = $state('');

	// Una sola tabla filtrable resuelve las dos preguntas: "¿qué vende cada
	// mercado?" (mírala completa) y "¿dónde compro/vendo X?" (escribe la
	// mercancía) -- mismo patrón de filtro que ya usa /waypoints.
	const marketsFiltrados = $derived.by(() => {
		const q = filtro.trim().toUpperCase();
		if (!q) return data.markets as Market[];
		return (data.markets as Market[]).filter(
			(m) =>
				m.waypointSymbol.includes(q) ||
				m.exports.some((b) => b.includes(q)) ||
				m.imports.some((b) => b.includes(q)) ||
				m.exchange.some((b) => b.includes(q))
		);
	});

	// updatedAt arranca como vino del load (string o null) -- no hace falta
	// el patron null-init + $effect de otras paginas porque esta fecha no
	// depende del reloj del cliente, viene fija del servidor.
	const actualizado = $derived(
		data.updatedAt ? new Date(data.updatedAt).toLocaleString('es-MX') : null
	);
</script>

<svelte:head>
	<title>Mercados</title>
</svelte:head>

<div class="markets-page">
	<h1>Mercados{#if data.system}<span class="system"> · {data.system}</span>{/if}</h1>

	{#if !data.system}
		<p class="error">
			No se pudo conectar con spacetraders-api. ¿Está corriendo (npm run dev la arranca sola)?
		</p>
	{:else if data.markets.length === 0}
		<p class="note">
			Todavía no hay catálogo guardado -- el proceso de fondo hace su primer barrido del sistema
			al arrancar el servidor y tarda un rato (son ~2 peticiones por segundo contra la API del
			juego). Refresca en un momento.
		</p>
	{:else}
		<p class="meta">
			{data.markets.length} mercados en este sistema{#if actualizado}{' · catálogo actualizado ' +
					actualizado}{/if}
		</p>
		<p class="note">
			Solo el catálogo (qué se exporta/importa/intercambia), no precios -- esos cambian con cada
			operación y solo se conocen con una nave presente. Ver también <a href="/contracts"
				>Contratos</a
			>, donde "Comprar" ya usa este mismo catálogo para encontrar mercado solo.
		</p>

		<input
			class="filtro"
			type="text"
			placeholder="Buscar mercancía o waypoint (ej. FERTILIZERS)…"
			bind:value={filtro}
		/>

		{#if filtro.trim()}
			<p class="note">
				{marketsFiltrados.length} de {data.markets.length} mercados coinciden con "{filtro}".
			</p>
		{/if}

		<table>
			<thead>
				<tr>
					<th>Waypoint</th>
					<th>Exporta (se compra aquí)</th>
					<th>Importa (se vende aquí)</th>
					<th>Intercambia</th>
				</tr>
			</thead>
			<tbody>
				{#each marketsFiltrados as m (m.waypointSymbol)}
					<tr>
						<td class="symbol-cell">{m.waypointSymbol}</td>
						<td>{m.exports.join(', ') || '—'}</td>
						<td>{m.imports.join(', ') || '—'}</td>
						<td>{m.exchange.join(', ') || '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>

		{#if marketsFiltrados.length === 0}
			<p class="note">Ningún mercado coincide con "{filtro}".</p>
		{/if}
	{/if}
</div>

<style>
	.markets-page {
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
		margin: 0.25rem 0 0.5rem;
		font-size: 0.9rem;
		color: var(--sw-text-muted);
	}

	.note {
		margin: 0.25rem 0 0.75rem;
		font-size: 0.85rem;
		color: var(--sw-text-muted);
	}

	.note a {
		color: var(--sw-blue);
		font-weight: 600;
	}

	.filtro {
		width: 100%;
		max-width: 420px;
		padding: 0.5rem 0.75rem;
		margin-bottom: 0.75rem;
		border-radius: 4px;
		border: 1px solid var(--sw-blue-dim);
		background: var(--sw-panel-raised);
		color: var(--sw-text);
		font-size: 0.9rem;
		font-family: inherit;
		display: block;
	}

	.filtro:focus {
		outline: none;
		border-color: var(--sw-blue);
		box-shadow: 0 0 0 2px var(--sw-blue-faint);
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
		font-size: 0.85rem;
	}

	.symbol-cell {
		font-weight: 700;
		color: var(--sw-blue);
		white-space: nowrap;
	}

	.error {
		color: var(--sw-red);
		font-weight: 600;
	}
</style>
