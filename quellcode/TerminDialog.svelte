<script>
  import { CalendarClock, Bell, Trash2 } from '@lucide/svelte';
  import Modal from './Modal.svelte';
  import AnhangListe from './AnhangListe.svelte';
  import { app, listeFuer, uebernehmen, loeschen, schliesseDialog } from './zustand.svelte.js';
  import { NOTIZ_FARBEN, plusTage, lokal, tagString } from './util.js';

  const d = app.dialog;
  const vorhanden = !d.neu;
  const original = d.neu || listeFuer('termin').find((x) => x.id === d.id);
  let t = $state(original ? $state.snapshot(original) : null);
  if (!original) schliesseDialog();
  let titelFeld = $state();
  $effect(() => { if (!vorhanden) titelFeld?.focus(); });

  function speichern() {
    if (!t.titel.trim()) t.titel = 'Termin';
    uebernehmen('termin', t);
    schliesseDialog();
  }

  function minutenVorher(min) {
    const basis = lokal(`${t.datum}T${t.von || '09:00'}`);
    basis.setMinutes(basis.getMinutes() - min);
    const z = (n) => String(n).padStart(2, '0');
    t.erinnerung = `${tagString(basis)}T${z(basis.getHours())}:${z(basis.getMinutes())}`;
  }
  function umschalten() {
    if (t.erinnerung) t.erinnerung = null;
    else if (t.von) minutenVorher(60);
    else t.erinnerung = `${plusTage(t.datum, -1)}T18:00`;
  }
</script>

{#if t}
  <Modal titel={vorhanden ? 'Termin' : 'Neuer Termin'} icon={CalendarClock} breite={600} onschliessen={schliesseDialog} onspeichern={speichern}>
    <input class="eingabe titel-eingabe" bind:this={titelFeld} bind:value={t.titel} placeholder="z. B. Wohnungsübergabe, Bürgeramt …" />
    <div class="raster" style="grid-template-columns: 1.3fr 1fr 1fr">
      <label class="feld"><span>Datum</span><input class="eingabe" type="date" bind:value={t.datum} /></label>
      <label class="feld"><span>Von</span><input class="eingabe" type="time" bind:value={t.von} /></label>
      <label class="feld"><span>Bis</span><input class="eingabe" type="time" bind:value={t.bis} /></label>
    </div>
    <label class="feld"><span>Ort</span><input class="eingabe" bind:value={t.ort} placeholder="Adresse oder Treffpunkt" /></label>

    <div class="kachel" style="padding:12px 14px">
      <div class="zeile">
        <Bell size={16} style="color:var(--akzent)" />
        <strong class="wachsen">Erinnerung</strong>
        <button class="schalter" class:an={!!t.erinnerung} onclick={umschalten} aria-label="Erinnerung"></button>
      </div>
      {#if t.erinnerung}
        <div class="zeile umbruch" style="margin-top:10px">
          <input class="eingabe" type="datetime-local" style="width:230px" bind:value={t.erinnerung} />
          <button class="chip klickbar" onclick={() => minutenVorher(30)}>30 Min. vorher</button>
          <button class="chip klickbar" onclick={() => minutenVorher(120)}>2 Std. vorher</button>
          <button class="chip klickbar" onclick={() => minutenVorher(24 * 60)}>1 Tag vorher</button>
        </div>
      {/if}
    </div>

    <div class="feld"><span>Farbe</span>
      <div class="zeile">
        {#each NOTIZ_FARBEN as f (f)}
          <button class="farbe" class:an={t.farbe === f} style="--c:{f}" onclick={() => (t.farbe = f)} aria-label={f}></button>
        {/each}
      </div>
    </div>
    <label class="feld"><span>Beschreibung</span>
      <textarea class="eingabe" style="min-height:70px" bind:value={t.beschreibung}></textarea>
    </label>
    <div class="feld"><span>Anhänge</span><AnhangListe bind:anhaenge={t.anhaenge} /></div>

    {#snippet fuss()}
      {#if vorhanden}
        <button class="knopf geist gefahr" onclick={() => { loeschen('termin', t.id, 'Termin'); schliesseDialog(); }}><Trash2 size={15} /> Löschen</button>
      {/if}
      <div class="wachsen"></div>
      <button class="knopf" onclick={schliesseDialog}>Abbrechen</button>
      <button class="knopf primaer" onclick={speichern}>{vorhanden ? 'Speichern' : 'Hinzufügen'}</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .farbe { width: 26px; height: 26px; border-radius: 99px; border: 2px solid transparent; background: var(--c); cursor: pointer; }
  .farbe.an { border-color: var(--text); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 40%, transparent); }
</style>
