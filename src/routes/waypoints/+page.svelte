<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Rasgos que le importan a alguien recien empezando: donde se compra/vende
	// y donde se compran naves. El resto de los rasgos se muestran igual, solo
	// sin resaltar.
	const DESTACADOS = new Set(['MARKETPLACE', 'SHIPYARD']);

	let filtro = $state('');

	const waypointsFiltrados = $derived.by(() => {
		const q = filtro.trim().toUpperCase();
		if (!q) return data.waypoints;
		return data.waypoints.filter(
			(w: { symbol: string; type: string; traits: { symbol: string; name: string }[] }) =>
				w.symbol.includes(q) ||
				w.type.includes(q) ||
				w.traits.some((t) => t.symbol.includes(q) || t.name.toUpperCase().includes(q))
		);
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

		<input
			class="filtro"
			type="text"
			placeholder="Filtrar por símbolo, tipo o rasgo…"
			bind:value={filtro}
		/>

		<table>
			<thead>
				<tr>
					<th>Símbolo</th>
					<th>Tipo</th>
					<th>Rasgos</th>
				</tr>
			</thead>
			<tbody>
				{#each waypointsFiltrados as w (w.symbol)}
					<tr>
						<td>{w.symbol}</td>
						<td>{w.type}</td>
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
		color: #111111;
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: 1.4rem;
	}

	.system {
		font-weight: 400;
		color: rgba(17, 17, 17, 0.55);
	}

	.meta {
		margin: 0.25rem 0 0.75rem;
		font-size: 0.9rem;
		color: rgba(17, 17, 17, 0.7);
	}

	.filtro {
		width: 100%;
		max-width: 360px;
		padding: 0.5rem 0.75rem;
		margin-bottom: 1rem;
		border-radius: 8px;
		border: 1px solid rgba(17, 17, 17, 0.2);
		background: rgba(255, 255, 255, 0.55);
		color: #111111;
		font-size: 0.9rem;
	}

	.filtro:focus {
		outline: none;
		border-color: rgba(17, 17, 17, 0.4);
		background: rgba(255, 255, 255, 0.75);
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		text-align: left;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid rgba(17, 17, 17, 0.1);
		vertical-align: top;
	}

	th {
		font-weight: 600;
		color: rgba(17, 17, 17, 0.6);
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	td {
		font-size: 0.88rem;
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
		background: rgba(17, 17, 17, 0.08);
		color: rgba(17, 17, 17, 0.65);
		white-space: nowrap;
	}

	.trait.destacado {
		background: #111111;
		color: #ffe066;
		font-weight: 700;
	}

	.note {
		font-size: 0.85rem;
		color: rgba(17, 17, 17, 0.55);
	}

	.error {
		color: #b91c1c;
		font-weight: 600;
	}
</style>
