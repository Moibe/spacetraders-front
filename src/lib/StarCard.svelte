<script lang="ts">
	// La estrella nunca es un waypoint (no hay tipo "STAR" en la API): vive en
	// el objeto del sistema mismo, en el campo `type`. Se usa en /waypoints y
	// /mapa -- compartido aca para no duplicar las traducciones y el color.
	type SystemInfo = {
		type: string;
		name?: string | null;
		constellation?: string | null;
		sectorSymbol: string;
		x: number;
		y: number;
	};

	let { system, systemInfo }: { system: string; systemInfo: SystemInfo | null } = $props();

	// Traduccion corta para alguien que no conoce los 10 valores posibles del
	// enum SystemType.
	const ESTRELLA: Record<string, string> = {
		NEUTRON_STAR: 'estrella de neutrones',
		RED_STAR: 'estrella roja',
		ORANGE_STAR: 'estrella naranja',
		BLUE_STAR: 'estrella azul',
		YOUNG_STAR: 'estrella joven',
		WHITE_DWARF: 'enana blanca',
		BLACK_HOLE: 'agujero negro',
		HYPERGIANT: 'hipergigante',
		NEBULA: 'nebulosa',
		UNSTABLE: 'estrella inestable'
	};

	// Color decorativo del punto que representa la estrella -- no es una
	// paleta categorica que se compare lado a lado (por eso no pasa por el
	// validador de la skill dataviz), es un solo swatch describiendo un solo
	// valor a la vez.
	const COLOR_ESTRELLA: Record<string, string> = {
		NEUTRON_STAR: '#b388ff',
		RED_STAR: '#ff5555',
		ORANGE_STAR: '#ff8c3d',
		BLUE_STAR: '#5ac8fa',
		YOUNG_STAR: '#eaf6ff',
		WHITE_DWARF: '#f5f5f5',
		BLACK_HOLE: '#4b3d66',
		HYPERGIANT: '#ff4d4d',
		NEBULA: '#d966ff',
		UNSTABLE: '#d4ff4d'
	};
</script>

{#if systemInfo}
	<div class="star-card">
		<span
			class="star-dot"
			style="background:{COLOR_ESTRELLA[systemInfo.type] ??
				'var(--sw-text-muted)'}; color:{COLOR_ESTRELLA[systemInfo.type] ?? 'var(--sw-text-muted)'}"
		></span>
		<div class="star-info">
			<span class="star-name"
				>{system}{#if systemInfo.name}{' · '}"{systemInfo.name}"{/if} · {ESTRELLA[
					systemInfo.type
				] ?? systemInfo.type}</span
			>
			<span class="star-meta"
				>{#if systemInfo.constellation}Constelación {systemInfo.constellation}{' · '}{/if}Sector {systemInfo.sectorSymbol}
				· posición galáctica ({systemInfo.x}, {systemInfo.y})</span
			>
		</div>
	</div>
	<p class="note">
		Esa posición es la del sistema completo dentro de la galaxia -- no tiene relación con las
		coordenadas que ya ves abajo, que son locales a este sistema.
	</p>
{/if}

<style>
	.star-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.65rem 0.9rem;
		margin-bottom: 0.4rem;
		border-radius: 6px;
		background: var(--sw-panel-raised);
		border: 1px solid var(--sw-blue-dim);
	}

	.star-dot {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
		border-radius: 50%;
		box-shadow: 0 0 10px 2px currentColor;
	}

	.star-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.star-name {
		font-weight: 700;
		color: var(--sw-text);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		font-size: 0.9rem;
	}

	.star-meta {
		font-size: 0.78rem;
		color: var(--sw-text-muted);
	}

	.note {
		margin: 0 0 0.75rem;
		font-size: 0.8rem;
		color: var(--sw-text-muted);
	}
</style>
