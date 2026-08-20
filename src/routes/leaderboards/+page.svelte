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

	// El ultimo incremento observado por agente ya viene calculado del
	// backend (persistido, no de memoria de esta pestana): data.deltas es
	// { agentSymbol: { delta, observedAt } }. Se queda "pegado" hasta que se
	// observe uno nuevo, en vez de desaparecer cuando pasa una ventana fija.
	function haceTiempo(iso: string, ahoraMs: number): string {
		const segundos = Math.max(0, Math.round((ahoraMs - new Date(iso).getTime()) / 1000));
		if (segundos < 60) return `hace ${segundos}s`;
		const minutos = Math.round(segundos / 60);
		if (minutos < 60) return `hace ${minutos} min`;
		return `hace ${Math.round(minutos / 60)}h`;
	}

	// Progreso del "pastel": ciclo de REFRESH_S alineado al reloj de pared
	// (no a cuando cargaste la pagina), asi es el mismo para cualquiera que
	// la tenga abierta y se resetea siempre en el mismo segundo real -- osea,
	// cuanto falta para el proximo refresco de datos (30s).
	const segundosEnElCiclo = $derived(now !== null ? Math.floor(now / 1000) % REFRESH_S : 0);
	const porcentajeRestante = $derived(
		now !== null ? ((REFRESH_S - segundosEnElCiclo) / REFRESH_S) * 100 : 100
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
		<div
			class="pie"
			style="--pct: {porcentajeRestante}%"
			role="img"
			aria-label="{Math.ceil(REFRESH_S - segundosEnElCiclo)} segundos para el próximo refresco"
			title="{Math.ceil(REFRESH_S - segundosEnElCiclo)}s para el próximo refresco"
		></div>
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
							{#if data.deltas?.[entry.agentSymbol]}
								<span
									class="delta"
									title={now !== null
										? `Observado ${haceTiempo(data.deltas[entry.agentSymbol].observedAt, now)}`
										: undefined}
								>
									▲ {fmt(data.deltas[entry.agentSymbol].delta)}
								</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p class="note">Solo el top 15 -- la API del juego no expone la lista completa.</p>
		<p class="note">▲ = último incremento observado (se queda hasta que se vea uno nuevo).</p>

		{#if data.agent}
			<p class="you-note">
				Tu agente, <strong>{data.agent.symbol}</strong>, tiene {fmt(data.agent.credits)} créditos{#if !enTop15}
					&nbsp;(fuera del top 15){/if}.
			</p>
		{/if}
	{/if}
</div>

<style>
	/* Registra --pct como <percentage> animable: sin esto, transition sobre un
	   conic-gradient que solo cambia via variable CSS no interpola -- salta
	   de un valor al siguiente en vez de girar suave. */
	@property --pct {
		syntax: '<percentage>';
		inherits: true;
		initial-value: 100%;
	}

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

	.pie {
		width: 3.25rem;
		height: 3.25rem;
		flex-shrink: 0;
		border-radius: 50%;
		border: 2px solid rgba(17, 17, 17, 0.25);
		background: conic-gradient(
			rgba(17, 17, 17, 0.65) 0% var(--pct),
			rgba(17, 17, 17, 0.08) var(--pct) 100%
		);
		/* El giro se anima solo: --pct cambia un poco cada segundo (viene de
		   $derived), así que el navegador interpola el gradiente entre valores. */
		transition: background 0.3s linear;
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
