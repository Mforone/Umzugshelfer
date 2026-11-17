<script>
  import { Upload, FolderOpen, FileText, Image, FileSpreadsheet, File, Trash2, Pencil, Link, Search } from '@lucide/svelte';
  import { app, dropDateien, dateienAuswaehlen, dateienLaden, bildUrl, verwendungen, verweiseUmbenennen, verweiseEntfernen, oeffne, toast, bestaetigen } from './zustand.svelte.js';
  import { api } from './api.js';
  import { dateityp, dateigroesse } from './util.js';

  const ICONS = { bild: Image, pdf: FileText, text: FileText, tabelle: FileSpreadsheet, archiv: File, datei: File };
  let ueber = $state(false);
  let filter = $state('alle');
  let suche = $state('');
  let umbenennen = $state(null);
  let neuerName = $state('');
  let verknuepfen = $state(null);

  let liste = $derived.by(() => {
    const q = suche.trim().toLowerCase();
    return [...app.dateien]
      .map((d) => ({ ...d, typ: dateityp(d.name), nutzung: verwendungen(d.name) }))
      .filter((d) => filter === 'alle' || (filter === 'frei' ? !d.nutzung.length : filter === d.typ))
      .filter((d) => !q || d.name.toLowerCase().includes(q))
      .sort((a, b) => b.geaendert - a.geaendert);
  });

  async function drop(ev) {
    ev.preventDefault();
    ueber = false;
    const namen = await dropDateien(ev);
    if (namen.length) toast(`${namen.length} Datei${namen.length > 1 ? 'en' : ''} hinzugefügt`);
  }

  async function umbenennenFertig(alt) {
    const n = neuerName.trim();
    umbenennen = null;
    if (!n || n === alt) return;
    const neu = await api.dateien.umbenennen(alt, n);
    verweiseUmbenennen(alt, neu);
    await dateienLaden();
  }

  async function entfernen(d) {
    const nutz = d.nutzung.length ? ` Sie ist mit ${d.nutzung.length} Eintrag/Einträgen verknüpft.` : '';
    if (!(await bestaetigen(`„${d.name}“ in den Papierkorb verschieben?${nutz}`, 'In den Papierkorb'))) return;
    await api.dateien.loeschen(d.name);
    verweiseEntfernen(d.name);
    await dateienLaden();
    toast('Datei in den Papierkorb verschoben');
  }

  function anAufgabe(name, id) {
    const a = app.doc.aufgaben.find((x) => x.id === id);
    if (!a) return;
    a.anhaenge = [...new Set([...(a.anhaenge || []), name])];
    verknuepfen = null;
    toast(`An „${a.titel}“ angehängt`);
  }
</script>

<div class="spalte" style="gap:14px">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="kachel dropzone" class:drop-aktiv={ueber}
    ondragover={(e) => { e.preventDefault(); ueber = true; }}
    ondragleave={() => (ueber = false)}
    ondrop={drop}>
    <Upload size={26} style="color:var(--akzent)" />
    <div class="wachsen">
      <strong>Dateien hierher ziehen</strong>
      <div class="klein">Verträge, Rechnungen, Fotos, Grundrisse … Sie werden in den Projektordner „anhaenge“ kopiert und können an Aufgaben, Kosten, Termine und Notizen gehängt werden.</div>
    </div>
    <button class="knopf primaer" onclick={async () => { const n = await dateienAuswaehlen(); if (n.length) toast(`${n.length} Datei(en) hinzugefügt`); }}><Upload size={15} /> Auswählen</button>
    <button class="knopf" onclick={() => api.dateien.ordner('anhaenge')}><FolderOpen size={15} /> Ordner öffnen</button>
  </div>

  <div class="zeile umbruch">
    <div class="segment">
      <button class:an={filter === 'alle'} onclick={() => (filter = 'alle')}>Alle</button>
      <button class:an={filter === 'pdf'} onclick={() => (filter = 'pdf')}>PDFs</button>
      <button class:an={filter === 'bild'} onclick={() => (filter = 'bild')}>Bilder</button>
      <button class:an={filter === 'frei'} onclick={() => (filter = 'frei')}>Nicht verknüpft</button>
    </div>
    <div class="suchfeld" style="width:240px"><Search size={15} /><input bind:value={suche} placeholder="Dateien durchsuchen" /></div>
    <span class="klein blass">{app.dateien.length} Dateien</span>
  </div>

  {#if liste.length}
    <div class="dateiraster">
      {#each liste as d (d.name)}
        {@const I = ICONS[d.typ]}
        <div class="kachel datei">
          <button class="vorschau" onclick={() => api.dateien.oeffnen(d.name)} title="Öffnen">
            {#if d.typ === 'bild'}
              {#await bildUrl(d.name) then url}{#if url}<img src={url} alt="" />{:else}<I size={34} />{/if}{/await}
            {:else}
              <I size={34} />
            {/if}
          </button>
          {#if umbenennen === d.name}
            <!-- svelte-ignore a11y_autofocus -->
            <input class="eingabe" autofocus bind:value={neuerName} onblur={() => umbenennenFertig(d.name)}
              onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') umbenennen = null; }} />
          {:else}
            <div class="name" title={d.name}>{d.name}</div>
          {/if}
          <div class="klein blass">{dateigroesse(d.groesse)} · {new Date(d.geaendert).toLocaleDateString('de-DE')}</div>
          <div class="zeile umbruch nutzung">
            {#each d.nutzung as n (n.typ + n.id)}
              <button class="chip klickbar" onclick={() => oeffne(n.typ, n.id)} title="Öffnen">{n.titel}</button>
            {:else}
              <span class="chip">nicht verknüpft</span>
            {/each}
          </div>
          {#if verknuepfen === d.name}
            <select class="eingabe" onchange={(e) => anAufgabe(d.name, e.currentTarget.value)}>
              <option value="">An Aufgabe hängen …</option>
              {#each app.doc.aufgaben.filter((a) => !a.erledigt) as a (a.id)}<option value={a.id}>{a.titel}</option>{/each}
            </select>
          {/if}
          <div class="zeile aktionen">
            <button class="rund-knopf" title="Im Ordner zeigen" onclick={() => api.dateien.zeigen(d.name)}><FolderOpen size={15} /></button>
            <button class="rund-knopf" title="Umbenennen" onclick={() => { umbenennen = d.name; neuerName = d.name; }}><Pencil size={15} /></button>
            <button class="rund-knopf" title="An Aufgabe hängen" onclick={() => (verknuepfen = verknuepfen === d.name ? null : d.name)}><Link size={15} /></button>
            <div class="wachsen"></div>
            <button class="rund-knopf" title="Löschen (Papierkorb)" onclick={() => entfernen(d)}><Trash2 size={15} /></button>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="kachel leer"><File size={28} /><div>Keine Dateien{filter !== 'alle' || suche ? ' für diesen Filter' : ''}.</div></div>
  {/if}
</div>

<style>
  .dropzone { display: flex; align-items: center; gap: 16px; border-style: dashed; border-width: 2px; padding: 20px 22px; }
  .dateiraster { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
  .datei { display: flex; flex-direction: column; gap: 6px; padding: 10px; }
  .vorschau {
    height: 120px; border-radius: 12px; border: 0; background: var(--flaeche-2); color: var(--akzent);
    display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; padding: 0;
  }
  .vorschau img { width: 100%; height: 100%; object-fit: cover; }
  .name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 2px; }
  .nutzung { gap: 4px; }
  .nutzung .chip { max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  .aktionen { gap: 2px; margin-top: auto; }
</style>
