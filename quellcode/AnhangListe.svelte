<script>
  import { Paperclip, FileText, Image, FileSpreadsheet, File, FolderOpen, X, Upload, Link } from '@lucide/svelte';
  import { app, dropDateien, dateienAuswaehlen, bildUrl } from './zustand.svelte.js';
  import { api } from './api.js';
  import { dateityp, dateigroesse } from './util.js';

  let { anhaenge = $bindable([]) } = $props();
  let ueber = $state(false);
  let auswahl = $state(false);

  const ICONS = { bild: Image, pdf: FileText, text: FileText, tabelle: FileSpreadsheet, archiv: File, datei: File };
  let info = $derived(Object.fromEntries(app.dateien.map((d) => [d.name, d])));
  let verfuegbar = $derived(app.dateien.filter((d) => !anhaenge.includes(d.name)).sort((a, b) => b.geaendert - a.geaendert));

  function hinzu(namen) {
    const neu = namen.filter((n) => !anhaenge.includes(n));
    if (neu.length) anhaenge = [...anhaenge, ...neu];
  }
  async function drop(ev) {
    ev.preventDefault();
    ueber = false;
    hinzu(await dropDateien(ev));
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="anhaenge"
  class:drop-aktiv={ueber}
  ondragover={(e) => { e.preventDefault(); ueber = true; }}
  ondragleave={() => (ueber = false)}
  ondrop={drop}
>
  {#each anhaenge as name (name)}
    {@const typ = dateityp(name)}
    {@const I = ICONS[typ]}
    <div class="datei" title={name}>
      <button class="datei-haupt" onclick={() => api.dateien.oeffnen(name)}>
        {#if typ === 'bild'}
          {#await bildUrl(name) then url}
            {#if url}<img src={url} alt="" />{:else}<span class="ic"><I size={18} /></span>{/if}
          {/await}
        {:else}
          <span class="ic"><I size={18} /></span>
        {/if}
        <span class="dname">
          <span class="nm">{name}</span>
          <span class="klein">{info[name] ? dateigroesse(info[name].groesse) : 'Datei fehlt'}</span>
        </span>
      </button>
      <button class="rund-knopf" title="Im Ordner zeigen" onclick={() => api.dateien.zeigen(name)}><FolderOpen size={15} /></button>
      <button class="rund-knopf" title="Verknüpfung entfernen" onclick={() => (anhaenge = anhaenge.filter((n) => n !== name))}><X size={15} /></button>
    </div>
  {/each}

  <div class="zeile umbruch aktionen">
    <button class="knopf klein" onclick={async () => hinzu(await dateienAuswaehlen())}><Upload size={14} /> Datei anhängen</button>
    {#if verfuegbar.length}
      <button class="knopf klein geist" onclick={() => (auswahl = !auswahl)}><Link size={14} /> Vorhandene verknüpfen</button>
    {/if}
    <span class="klein blass"><Paperclip size={12} /> oder Dateien hierher ziehen</span>
  </div>
  {#if auswahl}
    <div class="auswahl scroll">
      {#each verfuegbar as d (d.name)}
        <button class="chip klickbar" onclick={() => { hinzu([d.name]); }}>{d.name}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .anhaenge {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-radius: 16px;
    padding: 8px;
    background: var(--flaeche);
    border: 1px solid var(--rand);
  }
  .datei { display: flex; align-items: center; gap: 4px; border-radius: 12px; padding: 2px 4px 2px 2px; }
  .datei:hover { background: var(--flaeche-2); }
  .datei-haupt {
    flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px;
    border: 0; background: transparent; cursor: pointer; padding: 4px; text-align: left; border-radius: 10px;
  }
  .ic, img {
    width: 36px; height: 36px; border-radius: 10px; flex: none;
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--flaeche-2); color: var(--akzent); object-fit: cover;
  }
  .dname { display: flex; flex-direction: column; min-width: 0; }
  .nm { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .aktionen { padding: 4px; }
  .aktionen .klein { display: inline-flex; align-items: center; gap: 4px; }
  .auswahl { display: flex; flex-wrap: wrap; gap: 6px; max-height: 120px; overflow: auto; padding: 4px; }
</style>
