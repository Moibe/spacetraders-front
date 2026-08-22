<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const fmt = (n: number) => n.toLocaleString('es-MX');

	type Season = {
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
		last_seen_at: string;
	};

	// La lista ya viene ordenada mas reciente primero (ver db.list_seasons) --
	// la primera fila es la temporada en curso, salvo el instante rarisimo
	// entre un reset real y el siguiente tick del snapshot loop (30s).
	const seasons = $derived(data.seasons as Season[]);
</script>

<svelte:head>
	<title>Temporadas</title>
</svelte:head>

<div class="seasons-page">
	<h1>Temporadas</h1>

	{#if seasons.length === 0}
		<p class="note">
			Todavía no hay ninguna temporada registrada -- se guarda sola cada 30 segundos mientras el
			servidor corre. Espera un momento y refresca.
		</p>
	{:else}
		<p class="meta">
			Registro de universos vividos. Se actualiza solo mientras la temporada sigue vigente; en
			cuanto el juego resetea, la fila se congela en su último valor real -- ese queda como el
			registro final de esa temporada.
		</p>

		<table>
			<thead>
				<tr>
					<th>Temporada</th>
					<th>Estado</th>
					<th>Sistema</th>
					<th>Agente</th>
					<th>Facción</th>
					<th>Créditos</th>
					<th>Naves</th>
					<th>Universo</th>
					<th>Actualizado</th>
				</tr>
			</thead>
			<tbody>
				{#each seasons as s, i (s.reset_date)}
					<tr>
						<td class="symbol-cell">{s.reset_date}</td>
						<td>
							<span class="badge" class:estado-actual={i === 0}>
								{i === 0 ? 'En curso' : 'Terminada'}
							</span>
						</td>
						<td class="nowrap">{s.system_symbol}</td>
						<td>{s.agent_symbol}</td>
						<td>{s.faction_symbol}</td>
						<td class="num">{fmt(s.credits)}</td>
						<td class="num">{s.ship_count}</td>
						<td class="universo">
							{fmt(s.universe_agents)} agentes · {fmt(s.universe_ships)} naves ·
							{fmt(s.universe_systems)} sistemas
						</td>
						<td class="nowrap">{new Date(s.last_seen_at).toLocaleString('es-MX')}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.seasons-page {
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

	.meta {
		margin: 0.25rem 0 0.75rem;
		font-size: 0.9rem;
		color: var(--sw-text-muted);
	}

	.note {
		font-size: 0.85rem;
		color: var(--sw-text-muted);
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

	.num {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.nowrap {
		white-space: nowrap;
	}

	.universo {
		color: var(--sw-text-muted);
		white-space: nowrap;
	}

	.badge {
		display: inline-block;
		font-size: 0.72rem;
		font-weight: 700;
		padding: 0.15rem 0.55rem;
		border-radius: 999px;
		background: var(--sw-blue-faint);
		color: var(--sw-text-muted);
		border: 1px solid var(--sw-blue-dim);
		white-space: nowrap;
	}

	.badge.estado-actual {
		background: rgba(61, 220, 114, 0.15);
		color: var(--sw-green);
		border-color: rgba(61, 220, 114, 0.4);
	}
</style>
