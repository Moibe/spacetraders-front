<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import Sidebar from '$lib/Sidebar.svelte';
  import TopNav from '$lib/TopNav.svelte';

  let { children } = $props();
  let collapsed = $state(false);

  // Usa View Transitions cuando el browser las soporta para animar el repliegue
  // de la barra; si no, hace el cambio directo.
  function withTransition(fn: () => void) {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(fn);
    } else {
      fn();
    }
  }

  function toggleCollapsed() {
    withTransition(() => {
      collapsed = !collapsed;
    });
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<TopNav />
<Sidebar {collapsed} {toggleCollapsed} />
<main class={collapsed ? 'collapsed' : ''}>
  <div class="work-scroll">
    {@render children()}
  </div>
</main>

<style>
  /* Sistema de color "plano tecnico imperial": azul como identidad principal
     (chrome, bordes, tipografia), ambar/verde/rojo reservados como acentos de
     estado -- nunca como color de chrome. Ver memoria de referencias Star Wars
     (ref_star_wars_ui_displays) para las 5 variantes que inspiraron esto. */
  :global(:root) {
    --topnav-height: 64px;

    --sw-bg: #050a10;
    --sw-panel: #0a1420;
    --sw-panel-raised: #0e1c2c;
    --sw-blue: #5ac8fa;
    --sw-blue-dim: #1b6ea8;
    --sw-blue-faint: rgba(90, 200, 250, 0.14);
    --sw-text: #d6ecfb;
    --sw-text-muted: #7fa8c9;

    /* Acentos de estado -- se usan por significado (ok/advertencia/error),
       nunca como un cuarto color de chrome. */
    --sw-green: #3ddc72;
    --sw-amber: #ffb000;
    --sw-red: #ff5555;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
  }

  :global(body) {
    min-height: 100vh;
    background: var(--sw-bg);
    background-image:
      radial-gradient(ellipse 900px 500px at 20% -10%, rgba(90, 200, 250, 0.08), transparent 60%),
      radial-gradient(ellipse 700px 500px at 100% 110%, rgba(90, 200, 250, 0.06), transparent 60%);
    background-attachment: fixed;
    color: var(--sw-text);
    font-family: 'SF Mono', 'Consolas', 'Liberation Mono', Menlo, monospace;
  }

  /* Rejilla tenue + scanlines sobre todo el fondo -- textura de CRT, siempre
     detras del contenido (z-index -1) y sin interceptar clicks. */
  :global(body)::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background-image:
      repeating-linear-gradient(
        0deg,
        rgba(90, 200, 250, 0.05) 0px,
        rgba(90, 200, 250, 0.05) 1px,
        transparent 1px,
        transparent 3px
      ),
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 63px,
        rgba(90, 200, 250, 0.05) 63px,
        rgba(90, 200, 250, 0.05) 64px
      ),
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        transparent 63px,
        rgba(90, 200, 250, 0.05) 63px,
        rgba(90, 200, 250, 0.05) 64px
      );
  }

  main {
    position: fixed;
    top: calc(2rem + var(--topnav-height));
    right: 1rem;
    bottom: 1rem;
    box-sizing: border-box;
    background: var(--sw-panel);
    border: 1px solid var(--sw-blue-dim);
    border-radius: 6px;
    box-shadow:
      inset 0 0 0 1px rgba(90, 200, 250, 0.06),
      0 0 24px rgba(90, 200, 250, 0.1);
    overflow: hidden;
    transition: left 0.22s ease-out;
    left: calc(var(--sidebar-width, 240px) + 2rem);
  }

  main.collapsed {
    left: 2rem;
  }

  .work-scroll {
    position: absolute;
    top: 16px;
    bottom: 16px;
    left: 0;
    right: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0 16px;
  }
</style>
