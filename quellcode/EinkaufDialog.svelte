<script>
  import { ShoppingCart, Trash2, Wallet } from '@lucide/svelte';
  import Modal from './Modal.svelte';
  import { app, listeFuer, uebernehmen, loeschen, schliesseDialog, einkaufKostenAbgleichen, oeffne } from './zustand.svelte.js';
  import { RAEUME, betragLesen, jetztIso } from './util.js';

  const d = app.dialog;
  const vorhanden = !d.neu;
  const original = d.neu || listeFuer('einkauf').find((x) => x.id === d.id);
  let e = $state(original ? $state.snapshot(original) : null);
  if (!original) schliesseDialog();
  let preisText = $state(e && Number(e.preis) ? String(e.preis).replace('.', ',') : '');
  let feld = $state();
  $effect(() => { if (!vorhanden) feld?.focus(); });

  let raeume = $derived([...new Set([...app.doc.einkaufen.map((x) => x.raum).filter(Boolean), ...RAEUME])]);
  let kosten = $derived(e?.kostenId ? app.doc.kosten.find((k) => k.id === e.kostenId) : null);

  function fertigmachen() {
    e.preis = preisText.trim() ? betragLesen(preisText) : null;
    if (!e.name.trim()) e.name = 'Artikel';
    e.gekauftAm = e.gekauft ? e.gekauftAm || jetztIso() : null;
  }
  function speichern() {
    fertigmachen();
    uebernehmen('einkauf', e);
    einkaufKostenAbgleichen(listeFuer('einkauf').find((x) => x.id === e.id), true);
    schliesseDialog();
  }
</script>

{#if e}
  <Modal titel={vorhanden ? 'Einkauf' : 'Neuer Einkauf'} icon={ShoppingCart} breite={600} onschliessen={schliesseDialog} onspeichern={speichern}>
    <input class="eingabe titel-eingabe" bind:this={feld} bind:value={e.name} placeholder="Was brauchst du?" />
    <div class="raster" style="grid-template-columns: 1fr 1.3fr 1fr">
      <label class="feld"><span>Menge</span><input class="eingabe" bind:value={e.menge} placeholder="z. B. 4 Stück" /></label>
      <label class="feld"><span>Raum</span>
        <input class="eingabe" bind:value={e.raum} list="einkauf-dlg-raeume" placeholder="Raum" />
        <datalist id="einkauf-dlg-raeume">{#each raeume as r}<option value={r}></option>{/each}</datalist>
      </label>
      <label class="feld"><span>Preis ca. (€)</span><input class="eingabe zahlen" bind:value={preisText} placeholder="0,00" /></label>
    </div>
    <label class="feld"><span>Link zum Produkt (optional)</span><input class="eingabe" bind:value={e.link} placeholder="https://…" /></label>
    <label class="feld"><span>Notiz</span><textarea class="eingabe" style="min-height:70px" bind:value={e.notiz} placeholder="Farbe, Maße, wo günstig …"></textarea></label>
    <div class="zeile umbruch" style="gap:22px">
      <label class="zeile schalter-zeile"><button class="schalter" class:an={e.dringend} onclick={() => (e.dringend = !e.dringend)} aria-label="dringend"></button> Dringend (vor dem Umzug nötig)</label>
      <label class="zeile schalter-zeile"><button class="schalter" class:an={e.gekauft} onclick={() => (e.gekauft = !e.gekauft)} aria-label="gekauft"></button> Gekauft (wird automatisch als Ausgabe erfasst)</label>
    </div>
    {#if kosten}
      <button class="eintrag" onclick={() => { speichern(); oeffne('kosten', kosten.id); }}>
        <Wallet size={15} style="color:var(--akzent)" /><span class="wachsen" style="text-align:left">In Kosten erfasst: {kosten.titel}</span>
      </button>
    {/if}

    {#snippet fuss()}
      {#if vorhanden}
        <button class="knopf geist gefahr" onclick={() => { loeschen('einkauf', e.id, 'Eintrag'); schliesseDialog(); }}><Trash2 size={15} /> Löschen</button>
      {/if}
      <div class="wachsen"></div>
      <button class="knopf" onclick={schliesseDialog}>Abbrechen</button>
      <button class="knopf primaer" onclick={speichern}>{vorhanden ? 'Speichern' : 'Hinzufügen'}</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .schalter-zeile { cursor: pointer; color: var(--text-2); }
</style>
