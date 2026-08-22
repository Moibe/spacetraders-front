<script lang="ts">
	import { untrack } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import { withAlias, type Aliases } from '$lib/aliases';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const base = env.PUBLIC_API_URL ?? 'http://localhost:8010';

	const REFRESH_MS = 30_000;

	// lastUpdated arranca en null y solo se pone dentro de un $effect
	// (client-only) -- mismo patron que /agent, evita hydration_mismatch.
	let lastUpdated = $state<Date | null>(null);

	$effect(() => {
		const id = setInterval(() => invalidate('app:contracts'), REFRESH_MS);
		return () => clearInterval(id);
	});

	$effect(() => {
		data.contracts; // dependencia: cada vez que invalidate() trae datos nuevos
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
	// El contrato negociado no queda ligado a la nave que lo negocio (el
	// objeto Contract ni siquiera guarda esa nave) -- por eso el boton va
	// solo, sin selector: usa la primera nave atracada que haya. La
	// ubicacion/capacidad de tus naves se ve abajo, para decidir con cual
	// entregar cuando llegue el momento (eso si importa).
	type ShipLite = {
		symbol: string;
		nav: { status: string; waypointSymbol: string };
		cargo: { units: number; capacity: number };
	};

	const navesAtracadas = $derived(
		(data.ships as ShipLite[]).filter((n) => n.nav.status === 'DOCKED')
	);

	let negociando = $state(false);
	let errorNegociar = $state<string | null>(null);

	async function mensajeDeError(res: Response): Promise<string> {
		const cuerpo = await res.json().catch(() => null);
		return cuerpo?.detail ?? `Error ${res.status}`;
	}

	async function negociarContrato() {
		const nave = navesAtracadas[0];
		if (!nave) return;
		negociando = true;
		errorNegociar = null;
		try {
			const res = await fetch(
				`${base}/api/contracts/negotiate?ship_symbol=${encodeURIComponent(nave.symbol)}`,
				{ method: 'POST' }
			);
			if (!res.ok) throw new Error(await mensajeDeError(res));
			await invalidate('app:contracts');
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
			await invalidate('app:contracts');
		} catch (e) {
			errorAceptar = { id, mensaje: e instanceof Error ? e.message : 'Error desconocido' };
		} finally {
			aceptandoId = null;
		}
	}

	// Falta la siguiente entrega pendiente de un contrato ya aceptado, o null
	// si ya se entregó todo (y solo falta cumplir).
	function entregaPendiente(c: {
		terms: { deliver?: { unitsFulfilled: number; unitsRequired: number }[] };
	}) {
		return (c.terms.deliver ?? []).find((d) => d.unitsFulfilled < d.unitsRequired) ?? null;
	}

	// Aca si importa la nave (necesita bodega y estar cerca de mercado/destino)
	// -- a diferencia de negociar, se deja elegir, con la de mayor bodega como
	// default (mismo criterio que usa bots/contract_runner.py).
	const navesConBodega = $derived((data.ships as ShipLite[]).filter((n) => n.cargo.capacity > 0));

	let naveTrabajo = $state<string | null>(null);
	$effect(() => {
		if (navesConBodega.length === 0) return;
		const actual = untrack(() => naveTrabajo);
		if (actual !== null && navesConBodega.some((n) => n.symbol === actual)) return;
		naveTrabajo = navesConBodega.reduce((mejor, n) =>
			n.cargo.capacity > mejor.cargo.capacity ? n : mejor
		).symbol;
	});

	let trabajandoId = $state<string | null>(null);
	let errorTrabajo = $state<{ id: string; mensaje: string } | null>(null);

	async function comprarPara(contratoId: string) {
		if (!naveTrabajo) return;
		trabajandoId = contratoId;
		errorTrabajo = null;
		try {
			const res = await fetch(
				`${base}/api/contracts/${contratoId}/buy-cargo?ship_symbol=${encodeURIComponent(naveTrabajo)}`,
				{ method: 'POST' }
			);
			if (!res.ok) throw new Error(await mensajeDeError(res));
			await invalidate('app:contracts');
		} catch (e) {
			errorTrabajo = {
				id: contratoId,
				mensaje: e instanceof Error ? e.message : 'Error desconocido'
			};
		} finally {
			trabajandoId = null;
		}
	}

	async function entregarPara(contratoId: string) {
		if (!naveTrabajo) return;
		trabajandoId = contratoId;
		errorTrabajo = null;
		try {
			const res = await fetch(
				`${base}/api/contracts/${contratoId}/deliver-cargo?ship_symbol=${encodeURIComponent(naveTrabajo)}`,
				{ method: 'POST' }
			);
			if (!res.ok) throw new Error(await mensajeDeError(res));
			await invalidate('app:contracts');
		} catch (e) {
			errorTrabajo = {
				id: contratoId,
				mensaje: e instanceof Error ? e.message : 'Error desconocido'
			};
		} finally {
			trabajandoId = null;
		}
	}

	async function cumplirContrato(contratoId: string) {
		trabajandoId = contratoId;
		errorTrabajo = null;
		try {
			const res = await fetch(`${base}/api/contracts/${contratoId}/fulfill`, { method: 'POST' });
			if (!res.ok) throw new Error(await mensajeDeError(res));
			await invalidate('app:contracts');
		} catch (e) {
			errorTrabajo = {
				id: contratoId,
				mensaje: e instanceof Error ? e.message : 'Error desconocido'
			};
		} finally {
			trabajandoId = null;
		}
	}
</script>

<svelte:head>
	<title>Contratos</title>
</svelte:head>

<div class="contracts-page">
	<h1>Contratos</h1>

	{#if !data.agent}
		<p class="error">
			No se pudo conectar con spacetraders-api. ¿Está corriendo (npm run dev la arranca sola)?
		</p>
	{:else}
		{#if lastUpdated}
			<p class="refresh">actualizado {lastUpdated.toLocaleTimeString('es-MX')}</p>
		{/if}

		<h2>Tus naves</h2>
		{#if data.ships.length === 0}
			<p class="note">Sin naves.</p>
		{:else}
			<div class="ships-context">
				{#each data.ships as nave (nave.symbol)}
					<div class="ship-chip">
						<span class="ship-chip-symbol">{nave.symbol}</span>
						<span class="ship-chip-meta"
							>{ESTADO_NAVE[nave.nav.status] ?? nave.nav.status} en {withAlias(
								nave.nav.waypointSymbol,
								data.aliases as Aliases
							)}</span
						>
						<span class="ship-chip-meta">Bodega {nave.cargo.units}/{nave.cargo.capacity}</span>
					</div>
				{/each}
			</div>
		{/if}

		<h2>Negociar</h2>
		{#if navesAtracadas.length > 0}
			<button type="button" class="btn" onclick={negociarContrato} disabled={negociando}>
				{negociando ? 'Negociando…' : 'Negociar contrato nuevo'}
			</button>
			{#if errorNegociar}
				<p class="error action-error">{errorNegociar}</p>
			{/if}
		{:else}
			<p class="note">Necesitas una nave atracada para negociar un contrato nuevo.</p>
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
									{withAlias(entrega.destinationSymbol, data.aliases as Aliases)}
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
					{:else if !contrato.fulfilled}
						{@const pendiente = entregaPendiente(contrato)}
						{#if pendiente}
							{#if navesConBodega.length > 0}
								<div class="trabajo-row">
									<label class="ref-label">
										Usar nave
										<select class="ref-select" bind:value={naveTrabajo}>
											{#each navesConBodega as nave (nave.symbol)}
												<option value={nave.symbol}>{nave.symbol}</option>
											{/each}
										</select>
									</label>
									<button
										type="button"
										class="btn"
										onclick={() => comprarPara(contrato.id)}
										disabled={trabajandoId === contrato.id}
									>
										{trabajandoId === contrato.id ? 'Trabajando…' : 'Comprar'}
									</button>
									<button
										type="button"
										class="btn"
										onclick={() => entregarPara(contrato.id)}
										disabled={trabajandoId === contrato.id}
									>
										{trabajandoId === contrato.id ? 'Trabajando…' : 'Entregar'}
									</button>
								</div>
							{:else}
								<p class="note">Necesitas una nave con bodega para comprar y entregar.</p>
							{/if}
						{:else}
							<button
								type="button"
								class="btn"
								onclick={() => cumplirContrato(contrato.id)}
								disabled={trabajandoId === contrato.id}
							>
								{trabajandoId === contrato.id ? 'Cumpliendo…' : 'Cumplir contrato'}
							</button>
						{/if}
						{#if errorTrabajo && errorTrabajo.id === contrato.id}
							<p class="error action-error">{errorTrabajo.mensaje}</p>
						{/if}
					{/if}
				</div>
			{/each}
		{/if}
	{/if}
</div>

<style>
	.contracts-page {
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

	.refresh {
		margin: 0.5rem 0 0;
		font-size: 0.75rem;
		color: var(--sw-text-muted);
	}

	.ships-context {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}

	.ship-chip {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		background: var(--sw-panel-raised);
		border: 1px solid var(--sw-blue-dim);
		font-size: 0.8rem;
	}

	.ship-chip-symbol {
		font-weight: 700;
		color: var(--sw-blue);
	}

	.ship-chip-meta {
		color: var(--sw-text-muted);
	}

	.trabajo-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		margin-top: 0.5rem;
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
		background: var(--sw-panel);
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

	.card {
		padding: 0.85rem 1rem;
		margin-bottom: 0.6rem;
		border-radius: 6px;
		background: var(--sw-panel-raised);
		border: 1px solid var(--sw-blue-dim);
	}

	.card .btn {
		margin-top: 0.5rem;
	}

	.card .trabajo-row .btn {
		margin-top: 0;
	}

	.card .action-error {
		margin-bottom: 0;
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
