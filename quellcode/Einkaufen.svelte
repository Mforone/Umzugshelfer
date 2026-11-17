<script>
  import { Plus, Search, ShoppingCart, Check, ExternalLink, Wallet, Zap, Trash2 } from '@lucide/svelte';
  import { app, oeffne, oeffneNeu, einkaufUmschalten, einkaufAlsAusgabe, neuerEinkauf, loeschen, toast } from './zustand.svelte.js';
  import { api } from './api.js';
  import { RAEUME, euro, betragLesen } from './util.js';

  let name = $state('');
  let menge = $state('');
  let raum = $state('');
  let preis = $state('');
  let dringend = $state(false);
  let suche = $state('');
  let filter = $state('offen');
  let raumFilter = $state('');
  let feld = $state();

  let alle = $derived(app.doc.einkaufen);
  let raeume = $derived([...new Set(alle.map((e) => e.raum).filter(Boolean))].sort());
  let offen = $derived(alle.filter((e) => !e.gekauft));
  let schaetzung = $derived(offen.reduce((s, e) => s + (Number(e.preis) || 0), 0));
  let ohnePreis = $derived(offen.filter((e) => !Number(e.preis)).length);

  let liste = $derived.by(() => {
    const q = suche.trim().toLowerCase();
    return alle
      .filter((e) => (filter === 'offen' ? !e.gekauft : filter === 'gekauft' ? e.gekauft : true))
      .filter((e) => !raumFilter || e.raum === raumFilter)
      .filter((e) => !q || `${e.name} ${e.menge} ${e.raum} ${e.notiz}`.toLowerCase().includes(q))
      .sort((a, b) => (a.gekauft - b.gekauft) || (b.dringend - a.dringend) || (a.name || '').localeCompare(b.name || ''));
  });

  let gruppen = $derived.by(() => {
    const m = new Map();
    for (const e of liste) {
      const r = e.raum || 'Ohne Raum';
      if (!m.has(r)) m.set(r, []);
      m.get(r).push(e);
    }
    return [...m.entries()].sort((a, b) => (a[0] === 'Ohne Raum') - (b[0] === 'Ohne Raum') || a[0].localeCompare(b[0]));
  });

  function hinzu() {
    if (!name.trim()) return;
    app.doc.einkaufen.push(neuerEinkauf({ name: name.trim(), menge: menge.trim(), raum: raum.trim(), preis: preis ? betragLesen(preis) : null, dringend }));
    name = '';
    menge = '';
    preis = '';
    dringend = false;
    feld?.focus();
  }

  const hatKosten = (e) => e.kostenId && app.doc.kosten.some((k) => k.id === e.kostenId);

  function gekaufteEntfernen() {
    const weg = alle.filter((e) => e.gekauft);
    if (!weg.length) return;
    const kopie = $state.snapshot(weg);
    app.doc.einkaufen = alle.filter((e) => !e.gekauft);
    toast(`${weg.length} gekaufte Einträge entfernt`, { text: 'Rückgängig', fn: () => app.doc.einkaufen.push(...kopie) });
  }
</script>

<div class="spalte" style="gap:14px">
  <div class="raster oben">
    <div class="kachel">
      <div class="kachel-kopf"><ShoppingCart size={17} /> Was brauchst du noch?</div>
      <input class="eingabe gross-feld" bind:this={feld} bind:value={name} placeholder="z. B. Handtücher, Duschvorhang, Mehrfachstecker …" onkeydown={(e) => e.key === 'Enter' && hinzu()} />
      <div class="zeile" style="margin-top:8px">
        <input class="eingabe" style="width:130px" bind:value={menge} placeholder="Menge" onkeydown={(e) => e.key === 'Enter' && hinzu()} />
        <input class="eingabe wachsen" bind:value={raum} list="einkauf-raeume" placeholder="Raum" onkeydown={(e) => e.key === 'Enter' && hinzu()} />
        <datalist id="einkauf-raeume">{#each [...new Set([...raeume, ...RAEUME])] as r}<option value={r}></option>{/each}</datalist>
        <input class="eingabe zahlen" style="width:110px" bind:value={preis} placeholder="ca. €" onkeydown={(e) => e.key === 'Enter' && hinzu()} />
        <button class="knopf" class:primaer={dringend} onclick={() => (dringend = !dringend)} title="Vor dem Umzug nötig"><Zap size={15} /> Dringend</button>
        <button class="knopf primaer" onclick={hinzu}><Plus size={16} /> Hinzufügen</button>
      </div>
    </div>
    <div class="kachel">
      <div class="kachel-kopf"><Wallet size={17} /> Noch zu kaufen</div>
      <div class="gross">{offen.length} <span class="klein">Dinge</span></div>
      <div class="klein">ca. {euro(schaetzung)}{ohnePreis ? ` · ${ohnePreis} ohne Preis` : ''}</div>
    </div>
  </div>

  <div class="zeile umbruch">
    <div class="segment">
      <button class:an={filter === 'offen'} onclick={() => (filter = 'offen')}>Zu kaufen</button>
      <button class:an={filter === 'gekauft'} onclick={() => (filter = 'gekauft')}>Gekauft</button>
      <button class:an={filter === 'alle'} onclick={() => (filter = 'alle')}>Alle</button>
    </div>
    <div class="suchfeld" style="width:240px"><Search size={15} /><input bind:value={suche} placeholder="Liste durchsuchen" /></div>
    <button class="chip klickbar" class:an={!raumFilter} onclick={() => (raumFilter = '')}>Alle Räume</button>
    {#each raeume as r (r)}
      <button class="chip klickbar" class:an={raumFilter === r} onclick={() => (raumFilter = raumFilter === r ? '' : r)}>{r}</button>
    {/each}
    <div class="wachsen"></div>
    {#if alle.some((e) => e.gekauft)}
      <button class="knopf klein geist" onclick={gekaufteEntfernen}><Trash2 size={14} /> Gekaufte entfernen</button>
    {/if}
  </div>

  {#if gruppen.length}
    {#each gruppen as [r, items] (r)}
      <section>
        <div class="abschnitt-titel">{r} <span class="blass">· {items.length}</span></div>
        <div class="liste">
          {#each items as e (e.id)}
            <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
            <div class="eintrag" class:erledigt={e.gekauft} onclick={() => oeffne('einkauf', e.id)}>
              <button class="haken" class:an={e.gekauft} title={e.gekauft ? 'Doch nicht gekauft' : 'Gekauft'}
                onclick={(ev) => { ev.stopPropagation(); einkaufUmschalten(e); }}><Check size={13} strokeWidth={3} /></button>
              <div class="wachsen">
                <div class="eintrag-titel">{e.name}</div>
                {#if e.menge || e.notiz || e.dringend}
                  <div class="eintrag-meta">
                    {#if e.dringend && !e.gekauft}<span class="chip gelb"><Zap size={11} />dringend</span>{/if}
                    {#if e.menge}<span class="chip">{e.menge}</span>{/if}
                    {#if e.notiz}<span class="klein notiz">{e.notiz}</span>{/if}
                  </div>
                {/if}
              </div>
              {#if e.link}
                <button class="rund-knopf" title="Link öffnen" onclick={(ev) => { ev.stopPropagation(); api.extern(e.link); }}><ExternalLink size={15} /></button>
              {/if}
              {#if e.gekauft && !hatKosten(e)}
                <button class="knopf klein" onclick={(ev) => { ev.stopPropagation(); einkaufAlsAusgabe(e); }}><Wallet size={13} /> Ausgabe erfassen</button>
              {:else if hatKosten(e)}
                <button class="chip klickbar" onclick={(ev) => { ev.stopPropagation(); oeffne('kosten', e.kostenId); }}><Wallet size={11} /> in Kosten</button>
              {/if}
              {#if Number(e.preis)}<span class="zahlen preis">{euro(e.preis)}</span>{/if}
            </div>
          {/each}
        </div>
      </section>
    {/each}
  {:else}
    <div class="kachel leer">
      <ShoppingCart size={30} />
      <div>{alle.length ? 'Nichts für diesen Filter.' : 'Noch nichts auf der Liste. Tipp oben ein, was du für die neue Wohnung brauchst.'}</div>
    </div>
  {/if}
</div>

<style>
  .oben { grid-template-columns: 1fr 220px; }
  .gross-feld { font-size: 15px; padding: 10px 14px; }
  .liste { display: flex; flex-direction: column; gap: 7px; }
  .preis { font-weight: 650; min-width: 80px; text-align: right; }
  .notiz { max-width: 420px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @media (max-width: 1250px) { .oben { grid-template-columns: 1fr; } }
</style>
