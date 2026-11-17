<script>
  import { Wallet, Trash2 } from '@lucide/svelte';
  import Modal from './Modal.svelte';
  import AnhangListe from './AnhangListe.svelte';
  import { app, listeFuer, uebernehmen, loeschen, schliesseDialog } from './zustand.svelte.js';
  import { KOSTEN_KATEGORIEN, ZAHLUNGSARTEN, betragLesen } from './util.js';

  const d = app.dialog;
  const vorhanden = !d.neu;
  const original = d.neu || listeFuer('kosten').find((x) => x.id === d.id);
  let k = $state(original ? $state.snapshot(original) : null);
  if (!original) schliesseDialog();

  let betragText = $state(k && k.betrag ? String(k.betrag).replace('.', ',') : '');
  let titelFeld = $state();
  $effect(() => { if (!vorhanden) titelFeld?.focus(); });

  let aufgaben = $derived([...app.doc.aufgaben].sort((x, y) => (x.titel || '').localeCompare(y.titel || '')));

  function speichern() {
    k.betrag = betragLesen(betragText);
    if (!k.titel.trim()) k.titel = 'Ausgabe';
    uebernehmen('kosten', k);
    schliesseDialog();
  }
</script>

{#if k}
  <Modal titel={vorhanden ? 'Ausgabe' : 'Neue Ausgabe'} icon={Wallet} breite={640} onschliessen={schliesseDialog} onspeichern={speichern}>
    <div class="raster" style="grid-template-columns: 1fr 170px">
      <input class="eingabe titel-eingabe" bind:this={titelFeld} bind:value={k.titel} placeholder="Wofür? (z. B. Transporter, Kaution …)" />
      <div class="betrag">
        <input class="eingabe titel-eingabe zahlen" bind:value={betragText} placeholder="0,00" inputmode="decimal" />
        <span>€</span>
      </div>
    </div>

    <div class="raster" style="grid-template-columns: repeat(3, 1fr)">
      <label class="feld"><span>Datum</span>
        <input class="eingabe" type="date" bind:value={k.datum} />
      </label>
      <label class="feld"><span>Bezahlt mit</span>
        <select class="eingabe" bind:value={k.zahlungsart}>
          {#each ZAHLUNGSARTEN as z (z.id)}<option value={z.id}>{z.name}</option>{/each}
        </select>
      </label>
      <label class="feld"><span>Kategorie</span>
        <select class="eingabe" bind:value={k.kategorie}>
          {#each KOSTEN_KATEGORIEN as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
        </select>
      </label>
    </div>

    <div class="raster" style="grid-template-columns: auto 1fr">
      <div class="feld"><span>Status</span>
        <div class="segment">
          <button class:an={k.status === 'bezahlt'} onclick={() => (k.status = 'bezahlt')}>Bezahlt</button>
          <button class:an={k.status === 'offen'} onclick={() => (k.status = 'offen')}>Noch offen</button>
        </div>
      </div>
      <label class="feld"><span>Bezahlt von (optional)</span>
        <input class="eingabe" bind:value={k.bezahltVon} placeholder="z. B. ich, Eltern, WG-Kasse" />
      </label>
    </div>

    <div class="zeile umbruch" style="gap:22px">
      <label class="zeile"><button class="schalter" class:an={k.erstattbar} onclick={() => (k.erstattbar = !k.erstattbar)} aria-label="erstattbar"></button> Bekomme ich zurück (z. B. Kaution)</label>
      <label class="zeile"><button class="schalter" class:an={k.steuerrelevant} onclick={() => (k.steuerrelevant = !k.steuerrelevant)} aria-label="steuer"></button> Für die Steuer merken</label>
    </div>

    <label class="feld"><span>Gehört zu Aufgabe (optional)</span>
      <select class="eingabe" bind:value={k.aufgabeId}>
        <option value={null}>– keine –</option>
        {#each aufgaben as a (a.id)}<option value={a.id}>{a.titel}</option>{/each}
      </select>
    </label>

    <label class="feld"><span>Notiz</span>
      <textarea class="eingabe" style="min-height:60px" bind:value={k.notiz} placeholder="Rechnungsnummer, Details …"></textarea>
    </label>

    <div class="feld"><span>Belege / Rechnungen</span>
      <AnhangListe bind:anhaenge={k.anhaenge} />
    </div>

    {#snippet fuss()}
      {#if vorhanden}
        <button class="knopf geist gefahr" onclick={() => { loeschen('kosten', k.id, 'Ausgabe'); schliesseDialog(); }}><Trash2 size={15} /> Löschen</button>
      {/if}
      <div class="wachsen"></div>
      <button class="knopf" onclick={schliesseDialog}>Abbrechen</button>
      <button class="knopf primaer" onclick={speichern}>{vorhanden ? 'Speichern' : 'Hinzufügen'}</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .betrag { position: relative; }
  .betrag input { text-align: right; padding-right: 34px; }
  .betrag span { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: var(--text-2); font-weight: 600; }
  label.zeile { cursor: pointer; color: var(--text-2); }
</style>
