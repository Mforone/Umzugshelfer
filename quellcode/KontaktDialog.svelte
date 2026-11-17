<script>
  import { Users, Trash2 } from '@lucide/svelte';
  import Modal from './Modal.svelte';
  import { app, listeFuer, uebernehmen, loeschen, schliesseDialog } from './zustand.svelte.js';

  const d = app.dialog;
  const vorhanden = !d.neu;
  const original = d.neu || listeFuer('kontakt').find((x) => x.id === d.id);
  let k = $state(original ? $state.snapshot(original) : null);
  if (!original) schliesseDialog();
  let feld = $state();
  $effect(() => { if (!vorhanden) feld?.focus(); });

  function speichern() {
    if (!k.name.trim()) k.name = 'Kontakt';
    uebernehmen('kontakt', k);
    schliesseDialog();
  }
</script>

{#if k}
  <Modal titel={vorhanden ? 'Kontakt' : 'Neuer Kontakt'} icon={Users} breite={560} onschliessen={schliesseDialog} onspeichern={speichern}>
    <input class="eingabe titel-eingabe" bind:this={feld} bind:value={k.name} placeholder="Name" />
    <label class="feld"><span>Rolle</span>
      <input class="eingabe" bind:value={k.rolle} list="rollen" placeholder="z. B. Vermieter, Umzugshelfer, Hausmeister" />
      <datalist id="rollen">
        <option value="Vermieter (alt)"></option><option value="Vermieter (neu)"></option><option value="Hausverwaltung"></option>
        <option value="Hausmeister"></option><option value="Umzugshelfer"></option><option value="Umzugsfirma"></option>
        <option value="Autovermietung"></option><option value="Nachbar"></option>
      </datalist>
    </label>
    <div class="raster" style="grid-template-columns:1fr 1fr">
      <label class="feld"><span>Telefon</span><input class="eingabe" bind:value={k.telefon} /></label>
      <label class="feld"><span>E-Mail</span><input class="eingabe" type="email" bind:value={k.email} /></label>
    </div>
    <label class="feld"><span>Notiz</span><textarea class="eingabe" style="min-height:70px" bind:value={k.notiz}></textarea></label>
    {#snippet fuss()}
      {#if vorhanden}
        <button class="knopf geist gefahr" onclick={() => { loeschen('kontakt', k.id, 'Kontakt'); schliesseDialog(); }}><Trash2 size={15} /> Löschen</button>
      {/if}
      <div class="wachsen"></div>
      <button class="knopf" onclick={schliesseDialog}>Abbrechen</button>
      <button class="knopf primaer" onclick={speichern}>{vorhanden ? 'Speichern' : 'Hinzufügen'}</button>
    {/snippet}
  </Modal>
{/if}
