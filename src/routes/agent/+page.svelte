<script lang="ts">
	import { invalidate } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const REFRESH_MS = 30_000;

	// lastUpdated arranca en null y solo se pone dentro de un $effect
	// (client-only) -- si se pusiera con new Date() aqui arriba, este script
	// tambien corre durante el SSR y el texto renderizado no coincidiria con
	// el del cliente al hidratar (mismo bug que ya se corrigio en
	// /leaderboards: hydration_mismatch).
	let lastUpdated = $state<Date | null>(null);

	$effect(() => {
		const id = setInterval(() => invalidate('app:agent'), REFRESH_MS);
		return () => clearInterval(id);
	});

	$effect(() => {
		data.agent; // dependencia: cada vez que invalidate() trae datos nuevos
		lastUpdated = new Date();
	});

	const fmt = (n: number) => n.toLocaleString('es-MX');

	// Traducciones cortas para alguien que recien esta conociendo el juego.
	const ESTADO_NAVE: Record<string, string> = {
		DOCKED: 'atracada',
		IN_ORBIT: 'en órbita',
		IN_TRANSIT: 'en tránsito'
	};

	function estadoContrato(c: { accepted: boolean; fulfilled: boolean }): {
		clave: string;
		label: string;
	} {
		if (c.fulfilled) return { clave: 'cumplido', label: 'Cumplido' };
		if (c.accepted) return { clave: 'aceptado', label: 'Aceptado' };
		return { clave: 'ofrecido', label: 'Ofrecido' };
	}
</script>

<svelte:head>
	<title>Agente</title>
</svelte:head>

<div class="agent-page">
	<h1>Tu agente</h1>

	{#if !data.agent}
		<p class="error">
			No se pudo conectar con spacetraders-api. ¿Está corriendo (npm run dev la arranca sola)?
		</p>
	{:else}
		<section class="identity">
			<div class="identity-main">
				<span class="symbol">{data.agent.symbol}</span>
				<span class="faction">{data.agent.startingFaction}</span>
			</div>
			<div class="identity-stats">
				<div class="stat">
					<span class="stat-value">{fmt(data.agent.credits)}</span>
					<span class="stat-label">créditos</span>
				</div>
				<div class="stat">
					<span class="stat-value">{data.agent.shipCount}</span>
					<span class="stat-label">naves</span>
				</div>
				<div class="stat">
					<span class="stat-value">{data.agent.headquarters}</span>
					<span class="stat-label">base</span>
				</div>
			</div>
		</section>

		{#if lastUpdated}
			<p class="refresh">actualizado {lastUpdated.toLocaleTimeString('es-MX')}</p>
		{/if}

		<h2>Tu flota</h2>
		{#if data.ships.length === 0}
			<p class="note">Sin naves.</p>
		{:else}
			{#each data.ships as ship (ship.symbol)}
				<div class="card">
					<div class="card-head">
						<strong>{ship.symbol}</strong>
						<span class="badge">{ship.registration.role}</span>
					</div>
					<p class="line">
						{ESTADO_NAVE[ship.nav.status] ?? ship.nav.status} en
						<strong>{ship.nav.waypointSymbol}</strong>
						{#if ship.nav.status === 'IN_TRANSIT'}
							· llega {new Date(ship.nav.route.arrival).toLocaleTimeString('es-MX')}
						{/if}
					</p>
					<p class="line">
						Combustible: {ship.fuel.current}/{ship.fuel.capacity} · Carga: {ship.cargo.units}/{ship
							.cargo.capacity}
					</p>
					{#if ship.cargo.inventory.length > 0}
						<ul class="mini-list">
							{#each ship.cargo.inventory as item (item.symbol)}
								<li>{item.units} × {item.symbol}</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		{/if}

		<h2>Tus contratos</h2>
		{#if data.contracts.length === 0}
			<p class="note">Sin contratos todavía.</p>
		{:else}
			{#each data.contracts as contrato (contrato.id)}
				{@const estado = estadoContrato(contrato)}
				<div class="card">
					<div class="card-head">
						<strong>{contrato.type}</strong>
						<span class="badge estado-{estado.clave}">{estado.label}</span>
					</div>
					<p class="line">
						Paga {fmt(contrato.terms.payment.onAccepted)} al aceptar + {fmt(
							contrato.terms.payment.onFulfilled
						)} al cumplir
					</p>
					<p class="line">Vence {new Date(contrato.terms.deadline).toLocaleString('es-MX')}</p>
					{#if contrato.terms.deliver}
						<ul class="mini-list">
							{#each contrato.terms.deliver as entrega (entrega.tradeSymbol + entrega.destinationSymbol)}
								<li>
									{entrega.unitsFulfilled}/{entrega.unitsRequired} {entrega.tradeSymbol} →
									{entrega.destinationSymbol}
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		{/if}
	{/if}
</div>

<style>
	.agent-page {
		padding: 0.5rem 0.25rem;
		color: #111111;
	}

	h1 {
		margin: 0 0 0.75rem;
		font-size: 1.4rem;
	}

	h2 {
		margin: 1.5rem 0 0.6rem;
		font-size: 1.05rem;
	}

	.identity {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.1rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.35);
		border: 1px solid rgba(255, 255, 255, 0.6);
	}

	.identity-main {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.symbol {
		font-size: 1.3rem;
		font-weight: 800;
	}

	.faction {
		font-size: 0.8rem;
		color: rgba(17, 17, 17, 0.6);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.identity-stats {
		display: flex;
		gap: 1.5rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.stat-value {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.stat-label {
		font-size: 0.75rem;
		color: rgba(17, 17, 17, 0.55);
	}

	.refresh {
		margin: 0.5rem 0 0;
		font-size: 0.75rem;
		color: rgba(17, 17, 17, 0.5);
	}

	.card {
		padding: 0.85rem 1rem;
		margin-bottom: 0.6rem;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.25);
		border: 1px solid rgba(17, 17, 17, 0.1);
	}

	.card-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.35rem;
	}

	.badge {
		font-size: 0.72rem;
		font-weight: 700;
		padding: 0.15rem 0.55rem;
		border-radius: 999px;
		background: rgba(17, 17, 17, 0.1);
		color: rgba(17, 17, 17, 0.75);
		white-space: nowrap;
	}

	.badge.estado-cumplido {
		background: rgba(21, 128, 61, 0.15);
		color: #15803d;
	}

	.badge.estado-aceptado {
		background: rgba(180, 130, 0, 0.15);
		color: #92600a;
	}

	.line {
		margin: 0.2rem 0;
		font-size: 0.9rem;
		color: rgba(17, 17, 17, 0.85);
	}

	.mini-list {
		margin: 0.4rem 0 0;
		padding-left: 1.1rem;
		font-size: 0.85rem;
		color: rgba(17, 17, 17, 0.75);
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
