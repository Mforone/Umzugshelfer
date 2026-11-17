<script>
  import { Plus, Search, Package, Trash2, Check, Wine } from '@lucide/svelte';
  import { app, loeschen } from './zustand.svelte.js';
  import { uid } from './util.js';

  const RAEUME = ['Küche', 'Wohnzimmer', 'Schlafzimmer', 'Bad', 'Flur', 'Arbeitszimmer', 'Keller', 'Balkon'];
  let raum = $state('');
  let inhalt = $state('');
  let zerbrechlich = $state(false);
  let suche = $state('');
  let raumFilter = $state('');

  let kartons = $derived(app.doc.kartons);
  let raeume = $derived([...new Set([...kartons.map((k) => k.raum).filter(Boolean)])].sort());
  let liste = $derived.by(() => {
    const q = suche.trim().toLowerCase();
    return kartons
      .filter((k) => !raumFilter || k.raum === raumFilter)
      .filter((k) => !q || `${k.nummer} ${k.raum} ${k.inhalt}`.toLowerCase().includes(q))
      .sort((a, b) => a.nummer - b.nummer);
  });
  let gepackt = $derived(kartons.filter((k) => k.gepackt).length);

  function hinzu() {
    if (!inhalt.trim() && !raum.trim()) return;
    const nummer = Math.max(0, ...kartons.map((k) => Number(k.nummer) || 0)) + 1;
    app.doc.kartons.push({ id: uid('ka'), nummer, raum: raum.trim(), inhalt: inhalt.trim(), zerbrechlich, gepackt: false });
    inhalt = '';
    zerbrechlich = false;
  }
</script>

<div class="spalte" style="gap:14px">
  <div class="kachel">
    <div class="kachel-kopf"><Package size={17} /> Karton hinzufügen
      <span class="rechts klein">{gepackt} von {kartons.length} gepackt</span>
    </div>
    <div class="zeile">
      <input class="eingabe" style="width:190px" bind:value={raum} list="raeume" placeholder="Zielraum" />
      <datalist id="raeume">{#each [...new Set([...raeume, ...RAEUME])] as r}<option value={r}></option>{/each}</datalist>
      <input class="eingabe wachsen" bind:value={inhalt} placeholder="Was ist drin? (z. B. Wasserkocher, Tassen, Toaster)" onkeydown={(e) => e.key === 'Enter' && hinzu()} />
      <button class="knopf" class:primaer={zerbrechlich} onclick={() => (zerbrechlich = !zerbrechlich)} title="Zerbrechlich"><Wine size={15} /> Zerbrechlich</button>
      <button class="knopf primaer" onclick={hinzu}><Plus size={16} /> Hinzufügen</button>
    </div>
    {#if kartons.length}
      <div class="fortschritt" style="margin-top:14px"><div style="width:{(gepackt / kartons.length) * 100}%"></div></div>
    {/if}
  </div>

  <div class="zeile umbruch">
    <div class="suchfeld" style="width:280px"><Search size={15} /><input bind:value={suche} placeholder="Wo ist … ? (Inhalt suchen)" /></div>
    <button class="chip klickbar" class:an={!raumFilter} onclick={() => (raumFilter = '')}>Alle Räume</button>
    {#each raeume as r (r)}
      <button class="chip klickbar" class:an={raumFilter === r} onclick={() => (raumFilter = raumFilter === r ? '' : r)}>{r} · {kartons.filter((k) => k.raum === r).length}</button>
    {/each}
  </div>

  {#if liste.length}
    <div class="kartons">
      {#each liste as k (k.id)}
        <div class="kachel karton" class:fertig={k.gepackt}>
          <div class="zeile">
            <div class="nr">#{k.nummer}</div>
            <input class="eingabe raum" bind:value={k.raum} placeholder="Raum" />
            {#if k.zerbrechlich}<span class="chip rot" title="Zerbrechlich"><Wine size={12} /></span>{/if}
            <button class="haken" class:an={k.gepackt} title="Gepackt" onclick={() => (k.gepackt = !k.gepackt)}><Check size={13} strokeWidth={3} /></button>
          </div>
          <textarea class="eingabe inhalt" bind:value={k.inhalt} placeholder="Inhalt"></textarea>
          <div class="zeile">
            <button class="chip klickbar" class:an={k.zerbrechlich} onclick={() => (k.zerbrechlich = !k.zerbrechlich)}>zerbrechlich</button>
            <div class="wachsen"></div>
            <button class="rund-knopf" title="Löschen" onclick={() => loeschen('karton', k.id, `Karton #${k.nummer}`)}><Trash2 size={14} /></button>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="kachel leer"><Package size={30} /><div>{kartons.length ? 'Nichts gefunden.' : 'Nummeriere deine Kartons und notiere, was drin ist – dann findest du beim Auspacken alles sofort.'}</div></div>
  {/if}
</div>

<style>
  .kartons { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .karton { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
  .karton.fertig { opacity: 0.7; }
  .nr { font-size: 20px; font-weight: 750; color: var(--akzent); min-width: 44px; }
  .raum { padding: 6px 10px; }
  .inhalt { min-height: 64px; padding: 8px 10px; }
</style>
