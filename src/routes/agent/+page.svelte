<script lang="ts">
	import { untrack } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { invalidate } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Mismo base que usan los +page.ts -- aca hace falta ademas para las
	// acciones de escritura (negociar/aceptar), que no pasan por `load`.
	const base = env.PUBLIC_API_URL ?? 'http://localhost:8010';

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

	// -------------------------------------------------------- acciones (escritura)
	// Primera parte del sitio que cambia el estado real del juego, no solo lo
	// muestra. Manuales a proposito: el usuario elige la nave y confirma cada
	// paso, nada se negocia o acepta solo.

	type ShipLite = { symbol: string; nav: { status: string } };

	const navesAtracadas = $derived(
		(data.ships as ShipLite[]).filter((n) => n.nav.status === 'DOCKED')
	);

	let naveNegociando = $state<string | null>(null);
	$effect(() => {
		// untrack: guard de default, no debe volver a este efecto por su propia escritura.
		if (navesAtracadas.length === 0 || untrack(() => naveNegociando) !== null) return;
		naveNegociando = navesAtracadas[0].symbol;
	});

	let negociando = $state(false);
	let errorNegociar = $state<string | null>(null);

	async function mensajeDeError(res: Response): Promise<string> {
		const cuerpo = await res.json().catch(() => null);
		return cuerpo?.detail ?? `Error ${res.status}`;
	}

	async function negociarContrato() {
		if (!naveNegociando) return;
		negociando = true;
		errorNegociar = null;
		try {
			const res = await fetch(
				`${base}/api/contracts/negotiate?ship_symbol=${encodeURIComponent(naveNegociando)}`,
				{ method: 'POST' }
			);
			if (!res.ok) throw new Error(await mensajeDeError(res));
			await invalidate('app:agent');
		} catch (e) {
			errorNegociar = e instanceof Error ? e.message : 'Error desconocido';
		} finally {
			negociando = false;
		}
	}

	let aceptandoId = $state<string | null>(null);
	let errorAceptar = $state<{ id: string; mensaje: string } | null>(null);

	async function aceptarContrato(id: string) {
		aceptandoId = id;
		errorAceptar = null;
		try {
			const res = await fetch(`${base}/api/contracts/${id}/accept`, { method: 'POST' });
			if (!res.ok) throw new Error(await mensajeDeError(res));
			await invalidate('app:agent');
		} catch (e) {
			errorAceptar = { id, mensaje: e instanceof Error ? e.message : 'Error desconocido' };
		} finally {
			aceptandoId = null;
		}
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

		<h2>Tu facción</h2>
		{#if data.faction}
			<div class="faction-card">
				<span class="faction-emblem" aria-hidden="true">{data.faction.name.charAt(0)}</span>
				<div class="faction-body">
					<div class="faction-head">
						<strong class="faction-name">{data.faction.name}</strong>
						<span class="badge">{data.faction.isRecruiting ? 'Reclutando' : 'No recluta'}</span>
					</div>
					<p class="line">{data.faction.description}</p>
					{#if data.faction.headquarters}
						<p class="note">Sede en <strong>{data.faction.headquarters}</strong></p>
					{/if}
					{#if data.faction.traits?.length > 0}
						<ul class="faction-traits">
							{#each data.faction.traits as t (t.symbol)}
								<li class="faction-trait" title={t.description}>{t.name}</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
		{:else}
			<p class="note">No se pudo cargar la información de la facción.</p>
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

		{#if navesAtracadas.length > 0}
			<div class="accion-row">
				<label class="ref-label">
					Negociar contrato nuevo con
					<select class="ref-select" bind:value={naveNegociando}>
						{#each navesAtracadas as nave (nave.symbol)}
							<option value={nave.symbol}>{nave.symbol}</option>
						{/each}
					</select>
				</label>
				<button type="button" class="btn" onclick={negociarContrato} disabled={negociando}>
					{negociando ? 'Negociando…' : 'Negociar'}
				</button>
			</div>
			{#if errorNegociar}
				<p class="error action-error">{errorNegociar}</p>
			{/if}
		{:else}
			<p class="note">Necesitas una nave atracada para negociar un contrato nuevo.</p>
		{/if}

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
					{#if !contrato.accepted && contrato.deadlineToAccept}
						<p class="line">
							Vence para aceptar {new Date(contrato.deadlineToAccept).toLocaleString('es-MX')}
						</p>
					{:else}
						<p class="line">Vence {new Date(contrato.terms.deadline).toLocaleString('es-MX')}</p>
					{/if}
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
					{#if !contrato.accepted}
						<button
							type="button"
							class="btn"
							onclick={() => aceptarContrato(contrato.id)}
							disabled={aceptandoId === contrato.id}
						>
							{aceptandoId === contrato.id ? 'Aceptando…' : 'Aceptar contrato'}
						</button>
						{#if errorAceptar && errorAceptar.id === contrato.id}
							<p class="error action-error">{errorAceptar.mensaje}</p>
						{/if}
					{/if}
				</div>
			{/each}
		{/if}
	{/if}
</div>

<style>
	.agent-page {
		padding: 0.5rem 0.25rem;
		color: var(--sw-text);
	}

	h1 {
		margin: 0 0 0.75rem;
		font-size: 1.4rem;
		color: var(--sw-blue);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		text-shadow: 0 0 6px rgba(90, 200, 250, 0.35);
	}

	h2 {
		margin: 1.5rem 0 0.6rem;
		padding-bottom: 0.35rem;
		font-size: 1.05rem;
		color: var(--sw-blue);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		border-bottom: 1px solid var(--sw-blue-dim);
	}

	.identity {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.1rem;
		border-radius: 6px;
		background: var(--sw-panel-raised);
		border: 1px solid var(--sw-blue-dim);
		box-shadow: inset 0 0 0 1px rgba(90, 200, 250, 0.06);
	}

	.identity-main {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.symbol {
		font-size: 1.3rem;
		font-weight: 800;
		color: var(--sw-blue);
		text-shadow: 0 0 6px rgba(90, 200, 250, 0.35);
	}

	.faction {
		font-size: 0.8rem;
		color: var(--sw-text-muted);
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
		color: var(--sw-text-muted);
	}

	.refresh {
		margin: 0.5rem 0 0;
		font-size: 0.75rem;
		color: var(--sw-text-muted);
	}

	.accion-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.6rem;
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

	.btn {
		padding: 0.4rem 0.9rem;
		border-radius: 4px;
		border: 1px solid var(--sw-blue);
		background: var(--sw-blue-faint);
		color: var(--sw-blue);
		font-size: 0.85rem;
		font-weight: 700;
		font-family: inherit;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		cursor: pointer;
		transition:
			background 0.15s ease,
			opacity 0.15s ease;
	}

	.btn:hover:not(:disabled) {
		background: rgba(90, 200, 250, 0.28);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	.action-error {
		margin: 0.3rem 0 0.6rem;
	}

	.card .btn {
		margin-top: 0.5rem;
	}

	.card .action-error {
		margin-bottom: 0;
	}

	.card {
		padding: 0.85rem 1rem;
		margin-bottom: 0.6rem;
		border-radius: 6px;
		background: var(--sw-panel-raised);
		border: 1px solid var(--sw-blue-dim);
	}

	/* La API de SpaceTraders no trae logo/artwork de facciones -- el emblema
	   es un monograma generado (misma idea que .brand-mark en TopNav), no un
	   logo oficial del juego. */
	.faction-card {
		display: flex;
		gap: 0.85rem;
		padding: 0.85rem 1rem;
		margin-bottom: 0.6rem;
		border-radius: 6px;
		background: var(--sw-panel-raised);
		border: 1px solid var(--sw-blue-dim);
	}

	.faction-emblem {
		flex-shrink: 0;
		width: 2.4rem;
		height: 2.4rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--sw-blue);
		border-radius: 6px;
		box-shadow: 0 0 8px rgba(90, 200, 250, 0.4);
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--sw-blue);
		text-shadow: 0 0 6px rgba(90, 200, 250, 0.45);
	}

	.faction-body {
		flex: 1;
		min-width: 0;
	}

	.faction-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.3rem;
	}

	.faction-name {
		font-size: 0.95rem;
	}

	.faction-traits {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		margin: 0.4rem 0 0;
		padding: 0;
		list-style: none;
	}

	.faction-trait {
		font-size: 0.72rem;
		padding: 0.12rem 0.5rem;
		border-radius: 999px;
		background: var(--sw-blue-faint);
		border: 1px solid var(--sw-blue-dim);
		color: var(--sw-text-muted);
		white-space: nowrap;
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
		background: var(--sw-blue-faint);
		color: var(--sw-text-muted);
		border: 1px solid var(--sw-blue-dim);
		white-space: nowrap;
	}

	.badge.estado-cumplido {
		background: rgba(61, 220, 114, 0.15);
		color: var(--sw-green);
		border-color: rgba(61, 220, 114, 0.4);
	}

	.badge.estado-aceptado {
		background: rgba(255, 176, 0, 0.15);
		color: var(--sw-amber);
		border-color: rgba(255, 176, 0, 0.4);
	}

	.line {
		margin: 0.2rem 0;
		font-size: 0.9rem;
		color: var(--sw-text);
	}

	.mini-list {
		margin: 0.4rem 0 0;
		padding-left: 1.1rem;
		font-size: 0.85rem;
		color: var(--sw-text-muted);
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
