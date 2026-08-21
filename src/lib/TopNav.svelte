<script lang="ts">
  // Barra superior estilo "panel de computadora de nave": sin el tilt de vidrio
  // (no tiene sentido en un HUD de hardware) -- el feedback de hover/activo es
  // brillo, no movimiento. Ver memoria ref_star_wars_ui_displays: variante
  // "azul, planos tecnicos imperiales".
  import { page } from '$app/state';

  const isActive = (href: string) => page.url.pathname === href;
</script>

<header class="topnav">
  <a href="/" class="brand" aria-label="Inicio">
    <span class="brand-mark" aria-hidden="true"><span class="brand-dot"></span></span>
    <span class="brand-title">APP</span>
  </a>

  <nav>
    <a href="/agent" class="nav-item" aria-current={isActive('/agent') ? 'page' : undefined}>
      Agente
    </a>
    <a
      href="/contracts"
      class="nav-item"
      aria-current={isActive('/contracts') ? 'page' : undefined}
    >
      Contratos
    </a>
    <a
      href="/leaderboards"
      class="nav-item"
      aria-current={isActive('/leaderboards') ? 'page' : undefined}
    >
      Leaderboards
    </a>
    <a
      href="/waypoints"
      class="nav-item"
      aria-current={isActive('/waypoints') ? 'page' : undefined}
    >
      Ubicaciones
    </a>
    <a href="/map" class="nav-item" aria-current={isActive('/map') ? 'page' : undefined}>
      Mapa
    </a>
  </nav>

  <div class="spacer"></div>
</header>

<style>
  .topnav {
    position: fixed;
    top: 1rem;
    left: 1rem;
    right: 1rem;
    height: var(--topnav-height, 64px);
    padding: 0 1.25rem;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    background: var(--sw-panel);
    border: 1px solid var(--sw-blue-dim);
    border-radius: 6px;
    box-shadow:
      inset 0 0 0 1px rgba(90, 200, 250, 0.06),
      0 0 20px rgba(90, 200, 250, 0.1);
    user-select: none;
    z-index: 9;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    color: var(--sw-text);
    text-decoration: none;
    border-radius: 4px;
    padding: 0.25rem 0.4rem;
    transition: background 0.15s ease;
  }

  .brand:hover {
    background: var(--sw-blue-faint);
  }

  .brand-mark {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--sw-blue);
    border-radius: 3px;
    box-shadow: 0 0 6px rgba(90, 200, 250, 0.5);
  }

  .brand-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--sw-blue);
    box-shadow: 0 0 4px var(--sw-blue);
  }

  .brand-title {
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: var(--sw-blue);
    text-shadow: 0 0 6px rgba(90, 200, 250, 0.45);
  }

  nav {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-left: 1.25rem;
    padding-left: 1.25rem;
    border-left: 1px solid var(--sw-blue-dim);
    height: 60%;
  }

  .nav-item {
    display: inline-flex;
    align-items: center;
    padding: 0.45rem 0.95rem;
    color: var(--sw-text-muted);
    text-decoration: none;
    font-size: 0.85rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border-radius: 4px;
    border: 1px solid transparent;
    transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  }

  .nav-item:hover {
    color: var(--sw-text);
    border-color: var(--sw-blue-dim);
    background: var(--sw-blue-faint);
  }

  .nav-item[aria-current='page'] {
    color: var(--sw-blue);
    background: var(--sw-blue-faint);
    border-color: var(--sw-blue);
    text-shadow: 0 0 6px rgba(90, 200, 250, 0.45);
  }

  .spacer {
    flex: 1;
  }
</style>
