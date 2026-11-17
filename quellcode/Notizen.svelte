<script>
  import { Plus, Search, StickyNote, Pin, Paperclip } from '@lucide/svelte';
  import { app, oeffneNeu, oeffne } from './zustand.svelte.js';
  import { datumKurz } from './util.js';

  let suche = $state('');
  let liste = $derived.by(() => {
    const q = suche.trim().toLowerCase();
    return app.doc.notizen
      .filter((n) => !q || `${n.titel} ${n.inhalt}`.toLowerCase().includes(q))
      .sort((a, b) => (b.angeheftet - a.angeheftet) || (b.geaendert || '').localeCompare(a.geaendert || ''));
  });
</script>

<div class="spalte" style="gap:14px">
  <div class="zeile">
    <button class="knopf primaer" onclick={() => oeffneNeu('notiz')}><Plus size={16} /> Notiz</button>
    <div class="suchfeld" style="width:260px"><Search size={15} /><input bind:value={suche} placeholder="Notizen durchsuchen" /></div>
  </div>

  {#if liste.length}
    <div class="notizen">
      {#each liste as n (n.id)}
        <button class="kachel klickbar notiz" style="--c:{n.farbe}" onclick={() => oeffne('notiz', n.id)}>
          <div class="zeile" style="gap:6px">
            <strong class="wachsen titel">{n.titel || 'Notiz'}</strong>
            {#if n.anhaenge?.length}<span class="blass"><Paperclip size={13} /></span>{/if}
            {#if n.angeheftet}<span style="color:var(--c)"><Pin size={14} /></span>{/if}
          </div>
          <div class="text">{n.inhalt}</div>
          <div class="klein blass">{datumKurz(n.geaendert)}</div>
        </button>
      {/each}
    </div>
  {:else}
    <div class="kachel leer"><StickyNote size={30} /><div>{suche ? 'Nichts gefunden.' : 'Noch keine Notizen – z. B. Maße der neuen Wohnung, Einkaufsliste, Zugangsdaten für das Bürgeramt-Termin-Portal …'}</div></div>
  {/if}
</div>

<style>
  .notizen { columns: 260px; column-gap: 14px; }
  .notiz {
    width: 100%; break-inside: avoid; margin-bottom: 14px; text-align: left; font: inherit; color: inherit;
    display: flex; flex-direction: column; gap: 8px;
    background: linear-gradient(160deg, color-mix(in srgb, var(--c) 14%, transparent), var(--flaeche) 55%);
    border-top: 3px solid var(--c);
  }
  .titel { font-size: 15px; }
  .text { white-space: pre-wrap; color: var(--text-2); line-height: 1.5; max-height: 260px; overflow: hidden; word-break: break-word; }
</style>
