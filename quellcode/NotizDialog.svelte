<script>
  import { StickyNote, Trash2, Pin } from '@lucide/svelte';
  import Modal from './Modal.svelte';
  import AnhangListe from './AnhangListe.svelte';
  import { app, listeFuer, uebernehmen, loeschen, schliesseDialog } from './zustand.svelte.js';
  import { NOTIZ_FARBEN } from './util.js';

  const d = app.dialog;
  const vorhanden = !d.neu;
  const original = d.neu || listeFuer('notiz').find((x) => x.id === d.id);
  let n = $state(original ? $state.snapshot(original) : null);
  if (!original) schliesseDialog();
  let feld = $state();
  $effect(() => { if (!vorhanden) feld?.focus(); });

  function speichern() {
    if (!n.titel.trim() && !n.inhalt.trim() && !n.anhaenge.length) { schliesseDialog(); return; }
    uebernehmen('notiz', n);
    schliesseDialog();
  }
</script>

{#if n}
  <Modal titel={vorhanden ? 'Notiz' : 'Neue Notiz'} icon={StickyNote} breite={680} onschliessen={speichern} onspeichern={speichern}>
    {#snippet kopfRechts()}
      <button class="rund-knopf" class:an={n.angeheftet} title="Anheften" onclick={() => (n.angeheftet = !n.angeheftet)}><Pin size={17} /></button>
    {/snippet}
    <input class="eingabe titel-eingabe" bind:value={n.titel} placeholder="Titel" />
    <textarea class="eingabe inhalt" bind:this={feld} bind:value={n.inhalt} placeholder="Notiz schreiben …"></textarea>
    <div class="zeile">
      {#each NOTIZ_FARBEN as f (f)}
        <button class="farbe" class:an={n.farbe === f} style="--c:{f}" onclick={() => (n.farbe = f)} aria-label={f}></button>
      {/each}
    </div>
    <div class="feld"><span>Anhänge</span><AnhangListe bind:anhaenge={n.anhaenge} /></div>

    {#snippet fuss()}
      {#if vorhanden}
        <button class="knopf geist gefahr" onclick={() => { loeschen('notiz', n.id, 'Notiz'); schliesseDialog(); }}><Trash2 size={15} /> Löschen</button>
      {/if}
      <span class="klein blass">Wird beim Schließen gespeichert</span>
      <div class="wachsen"></div>
      <button class="knopf primaer" onclick={speichern}>Fertig</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .inhalt { min-height: 260px; font-size: 14.5px; }
  .farbe { width: 24px; height: 24px; border-radius: 99px; border: 2px solid transparent; background: var(--c); cursor: pointer; }
  .farbe.an { border-color: var(--text); }
</style>
