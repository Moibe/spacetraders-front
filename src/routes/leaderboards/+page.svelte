<script lang="ts">
	import { invalidate } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const REFRESH_MS = 30_000;

	// Refresca solo re-corriendo el mismo load() de +page.ts (via su `depends`),
	// asi el fetch vive en un solo lugar. $effect corre solo en el cliente, asi
	// que el intervalo nunca se arma durante el SSR.
	let lastUpdated = $state(new Date());

	$effect(() => {
		const id = setInterval(() => invalidate('app:leaderboard'), REFRESH_MS);
		return () => clearInterval(id);
	});

	$effect(() => {
		data.status; // dependencia: cada vez que invalidate() trae datos nuevos
		lastUpdated = new Date();
	});

	const fmt = (n: number) => n.toLocaleString('es-MX');

	const proximoReset = $derived(
		data.status ? new Date(data.status.serverResets.next).toLocaleString('es-MX') : null
	);

	const enTop15 = $derived(
		data.status && data.agent
			? data.status.leaderboards.mostCredits.some(
					(e: { agentSymbol: string }) => e.agentSymbol === data.agent.symbol
				)
			: false
	);
</script>

<svelte:head>
	<title>Leaderboards</title>
</svelte:head>

<div class="leaderboard">
	<h1>Leaderboard de créditos</h1>

	{#if !data.status}
		<p class="error">
			No se pudo conectar con spacetraders-api. ¿Está corriendo (npm run dev la arranca sola)?
		</p>
	{:else}
		<p class="meta">
			Temporada iniciada {data.status.resetDate} · próximo reset {proximoReset}
		</p>
		<p class="stats">
			{fmt(data.status.stats.agents)} agentes · {fmt(data.status.stats.ships)} naves · {fmt(
				data.status.stats.systems
			)} sistemas
		</p>
		<p class="refresh">
			actualizado {lastUpdated.toLocaleTimeString('es-MX')} · se refresca sola cada 30s
		</p>

		<table>
			<thead>
				<tr>
					<th>#</th>
					<th>Agente</th>
					<th>Créditos</th>
				</tr>
			</thead>
			<tbody>
				{#each data.status.leaderboards.mostCredits as entry, i (entry.agentSymbol)}
					<tr class:you={data.agent && entry.agentSymbol === data.agent.symbol}>
						<td>{i + 1}</td>
						<td>{entry.agentSymbol}</td>
						<td>{fmt(entry.credits)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p class="note">Solo el top 15 -- la API del juego no expone la lista completa.</p>

		{#if data.agent}
			<p class="you-note">
				Tu agente, <strong>{data.agent.symbol}</strong>, tiene {fmt(data.agent.credits)} créditos{#if !enTop15}
					&nbsp;(fuera del top 15){/if}.
			</p>
		{/if}
	{/if}
</div>

<style>
	.leaderboard {
		padding: 0.5rem 0.25rem;
		color: #111111;
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: 1.4rem;
	}

	.meta,
	.stats {
		margin: 0.25rem 0;
		font-size: 0.9rem;
		color: rgba(17, 17, 17, 0.7);
	}

	.refresh {
		margin: 0.5rem 0 0;
		font-size: 0.75rem;
		color: rgba(17, 17, 17, 0.5);
	}

	table {
		width: 100%;
		max-width: 480px;
		border-collapse: collapse;
		margin: 1.25rem 0;
	}

	th,
	td {
		text-align: left;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid rgba(17, 17, 17, 0.1);
	}

	th {
		font-weight: 600;
		color: rgba(17, 17, 17, 0.6);
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	td:last-child,
	th:last-child {
		text-align: right;
	}

	tr.you {
		background: rgba(17, 17, 17, 0.06);
		font-weight: 700;
	}

	.note {
		font-size: 0.8rem;
		color: rgba(17, 17, 17, 0.55);
	}

	.you-note {
		margin-top: 1rem;
		font-size: 0.95rem;
	}

	.error {
		color: #b91c1c;
		font-weight: 600;
	}
</style>
