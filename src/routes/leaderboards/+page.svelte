<script lang="ts">
	import { invalidate } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const REFRESH_MS = 30_000;
	const REFRESH_S = REFRESH_MS / 1000;

	// Refresca solo re-corriendo el mismo load() de +page.ts (via su `depends`),
	// asi el fetch vive en un solo lugar. Los $effect corren solo en el cliente,
	// asi que ninguno de estos timers se arma durante el SSR.
	//
	// lastUpdated/now arrancan en null (no new Date()/Date.now() aqui arriba):
	// este bloque de script SI corre durante el SSR, y si el valor inicial
	// fuera "la hora de ahorita" saldria distinto en el servidor vs. al
	// hidratar en el cliente (milisegundos despues) -- eso disparaba un
	// warning de hydration_mismatch. Con null, el primer render coincide en
	// ambos lados, y el reloj real solo se pone adentro de un $effect
	// (client-only).
	let lastUpdated = $state<Date | null>(null);
	let now = $state<number | null>(null);

	$effect(() => {
		const id = setInterval(() => invalidate('app:leaderboard'), REFRESH_MS);
		return () => clearInterval(id);
	});

	// Solo mueve el reloj visual del contador -- el refresco real de datos no
	// depende de este timer, por eso van separados.
	$effect(() => {
		now = Date.now();
		const id = setInterval(() => {
			now = Date.now();
		}, 1000);
		return () => clearInterval(id);
	});

	$effect(() => {
		data.status; // dependencia: cada vez que invalidate() trae datos nuevos
		lastUpdated = new Date();
	});

	// Cuanto subieron los creditos de cada agente desde la revision anterior.
	// Se deriva de data.previousBatch (el snapshot mas reciente persistido en
	// el backend), no de un $state propio de esta pestana -- asi el delta
	// sobrevive un reload de la pagina en vez de perderse.
	const deltas = $derived.by(() => {
		if (!data.status || !data.previousBatch) return {} as Record<string, number>;

		const previo: Record<string, number> = {};
		for (const e of data.previousBatch.entries as { agentSymbol: string; credits: number }[]) {
			previo[e.agentSymbol] = e.credits;
		}

		const resultado: Record<string, number> = {};
		for (const entry of data.status.leaderboards.mostCredits) {
			const antes = previo[entry.agentSymbol];
			if (antes !== undefined && entry.credits > antes) {
				resultado[entry.agentSymbol] = entry.credits - antes;
			}
		}
		return resultado;
	});

	// Derivado de lastUpdated + now en vez de su propio contador independiente,
	// para que nunca se desincronice del refresco real (aunque el navegador
	// pause el timer un rato al estar la pestana en background, por ejemplo).
	const secondsLeft = $derived(
		now !== null && lastUpdated
			? Math.max(0, REFRESH_S - Math.floor((now - lastUpdated.getTime()) / 1000))
			: REFRESH_S
	);

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
	<div class="header-row">
		<h1>Leaderboard de créditos</h1>
		<div class="countdown" title="Segundos para el próximo refresco">
			{secondsLeft}
		</div>
	</div>

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
		{#if lastUpdated}
			<p class="refresh">actualizado {lastUpdated.toLocaleTimeString('es-MX')}</p>
		{/if}

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
						<td>
							{fmt(entry.credits)}
							{#if deltas[entry.agentSymbol]}
								<span class="delta">▲ {fmt(deltas[entry.agentSymbol])}</span>
							{/if}
						</td>
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

	.header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	h1 {
		margin: 0;
		font-size: 1.4rem;
	}

	.countdown {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 3.25rem;
		height: 3.25rem;
		flex-shrink: 0;
		border-radius: 50%;
		background: rgba(17, 17, 17, 0.08);
		border: 2px solid rgba(17, 17, 17, 0.25);
		font-size: 1.5rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
		color: #111111;
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

	.delta {
		display: inline-block;
		margin-left: 0.4rem;
		font-size: 0.7rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: #15803d;
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
