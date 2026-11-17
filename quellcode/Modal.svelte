<script>
  import { X } from '@lucide/svelte';
  let { titel = '', icon = null, breite = 720, onschliessen, onspeichern = null, kopfRechts, children, fuss } = $props();
  let start = null;

  function tasten(ev) {
    if (ev.key === 'Escape') { ev.stopPropagation(); onschliessen?.(); }
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey) && onspeichern) { ev.preventDefault(); onspeichern(); }
  }
</script>

<svelte:window onkeydown={tasten} />

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div
  class="overlay"
  onmousedown={(e) => (start = e.target)}
  onclick={(e) => { if (e.target === e.currentTarget && start === e.currentTarget) onschliessen?.(); }}
>
  <div class="dialog" style="width:min({breite}px, 100%)" role="dialog" aria-modal="true">
    <div class="dialog-kopf">
      {#if icon}{@const I = icon}<I size={18} style="color:var(--akzent)" />{/if}
      <h2>{titel}</h2>
      <div class="wachsen"></div>
      {@render kopfRechts?.()}
      <button class="rund-knopf" onclick={onschliessen} title="Schließen (Esc)"><X size={18} /></button>
    </div>
    <div class="dialog-inhalt scroll">
      {@render children?.()}
    </div>
    {#if fuss}
      <div class="dialog-fuss">{@render fuss()}</div>
    {/if}
  </div>
</div>
