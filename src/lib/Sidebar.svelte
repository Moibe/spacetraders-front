<script lang="ts">
  // Barra lateral estilo "panel de computadora de nave" -- sin tilt de vidrio
  // (ver TopNav.svelte). Sigue vacia (nada que poner ahi todavia), publica su
  // ancho real a --sidebar-width para que el panel de contenido se ajuste solo.
  let {
    collapsed = false,
    toggleCollapsed
  }: {
    collapsed?: boolean;
    toggleCollapsed: () => void;
  } = $props();

  let sidebarWidth = $state(240);

  $effect(() => {
    if (typeof document !== 'undefined' && !collapsed) {
      document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    }
  });
</script>

{#if !collapsed}
  <aside class="sidebar" bind:clientWidth={sidebarWidth}>
    <nav></nav>

    <div class="sidebar-footer">
      <button
        type="button"
        class="collapse-btn"
        onclick={toggleCollapsed}
        aria-label="Replegar barra"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
    </div>
  </aside>
{:else}
  <button
    type="button"
    class="reveal-handle"
    onclick={toggleCollapsed}
    aria-label="Mostrar barra"
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  </button>
{/if}

<style>
  .sidebar {
    position: fixed;
    top: calc(2rem + var(--topnav-height, 64px));
    left: 1rem;
    bottom: 1rem;
    box-sizing: border-box;
    width: max-content;
    min-width: 240px;
    max-width: 380px;
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    background: var(--sw-panel);
    border: 1px solid var(--sw-blue-dim);
    border-radius: 6px;
    box-shadow:
      inset 0 0 0 1px rgba(90, 200, 250, 0.06),
      0 0 20px rgba(90, 200, 250, 0.1);
    user-select: none;
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  nav::-webkit-scrollbar {
    display: none;
  }

  .sidebar-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid var(--sw-blue-dim);
  }

  .collapse-btn,
  .reveal-handle {
    background: var(--sw-panel-raised);
    border: 1px solid var(--sw-blue-dim);
    border-radius: 4px;
    padding: 0.4rem 0.5rem;
    color: var(--sw-text-muted);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: inherit;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }

  .collapse-btn:hover,
  .reveal-handle:hover {
    background: var(--sw-blue-faint);
    border-color: var(--sw-blue);
    color: var(--sw-blue);
  }

  /* Cuando la barra esta replegada, queda solo este handle flotante. */
  .reveal-handle {
    position: fixed;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    padding: 0.55rem 0.45rem;
    border-radius: 4px;
    box-shadow: 0 0 12px rgba(90, 200, 250, 0.12);
    z-index: 10;
  }
</style>
