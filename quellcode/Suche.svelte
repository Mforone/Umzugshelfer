<script>
  import { Search, ListTodo, Wallet, CalendarClock, StickyNote, Users, Package, Paperclip, ShoppingCart } from '@lucide/svelte';
  import { app, oeffne, person } from './zustand.svelte.js';
  import { api } from './api.js';
  import { euro, datumKurz } from './util.js';

  let q = $state('');
  let index = $state(0);
  let feld;
  $effect(() => feld?.focus());

  let treffer = $derived.by(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const passt = (...t) => t.join(' ').toLowerCase().includes(s);
    const d = app.doc;
    const out = [];
    for (const a of d.aufgaben) if (passt(a.titel, a.beschreibung, person(a.verantwortlich)?.name || '', ...(a.unteraufgaben || []).map((u) => u.text))) out.push({ icon: ListTodo, titel: a.titel, info: a.erledigt ? 'erledigt' : a.faellig ? 'fällig ' + datumKurz(a.faellig) : 'Aufgabe', los: () => oeffne('aufgabe', a.id) });
    for (const t of d.termine) if (passt(t.titel, t.ort, t.beschreibung)) out.push({ icon: CalendarClock, titel: t.titel, info: datumKurz(t.datum), los: () => { app.seite = 'kalender'; oeffne('termin', t.id); } });
    for (const k of d.kosten) if (passt(k.titel, k.notiz, k.bezahltVon)) out.push({ icon: Wallet, titel: k.titel, info: euro(k.betrag), los: () => oeffne('kosten', k.id) });
    for (const n of d.notizen) if (passt(n.titel, n.inhalt)) out.push({ icon: StickyNote, titel: n.titel || 'Notiz', info: 'Notiz', los: () => oeffne('notiz', n.id) });
    for (const k of d.kontakte) if (passt(k.name, k.rolle, k.telefon, k.email)) out.push({ icon: Users, titel: k.name, info: k.rolle || 'Kontakt', los: () => oeffne('kontakt', k.id) });
    for (const k of d.kartons) if (passt(k.raum, k.inhalt, '#' + k.nummer)) out.push({ icon: Package, titel: `Karton #${k.nummer} – ${k.raum || ''}`, info: k.inhalt.slice(0, 40), los: () => (app.seite = 'kartons') });
    for (const e of d.einkaufen || []) if (passt(e.name, e.raum, e.notiz)) out.push({ icon: ShoppingCart, titel: e.name, info: e.gekauft ? 'gekauft' : 'Einkaufsliste', los: () => { app.seite = 'einkaufen'; oeffne('einkauf', e.id); } });
    for (const f of app.dateien) if (passt(f.name)) out.push({ icon: Paperclip, titel: f.name, info: 'Datei öffnen', los: () => api.dateien.oeffnen(f.name) });
    return out.slice(0, 40);
  });

  function waehlen(t) {
    app.suche = false;
    t?.los();
  }
  function tasten(e) {
    if (e.key === 'Escape') { e.stopPropagation(); app.suche = false; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); index = Math.min(treffer.length - 1, index + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); index = Math.max(0, index - 1); }
    else if (e.key === 'Enter') waehlen(treffer[index]);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div class="overlay oben" onclick={(e) => e.target === e.currentTarget && (app.suche = false)}>
  <div class="dialog suche">
    <div class="suchfeld gross-such">
      <Search size={18} />
      <input bind:this={feld} bind:value={q} oninput={() => (index = 0)} onkeydown={tasten} placeholder="Aufgaben, Kosten, Notizen, Kartons, Dateien …" />
    </div>
    {#if q.trim()}
      <div class="ergebnisse scroll">
        {#each treffer as t, i}
          <button class="treffer" class:an={i === index} onmouseenter={() => (index = i)} onclick={() => waehlen(t)}>
            <t.icon size={16} />
            <span class="wachsen">{t.titel}</span>
            <span class="klein">{t.info}</span>
          </button>
        {:else}
          <div class="klein blass" style="padding:14px">Nichts gefunden.</div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .oben { align-items: flex-start; padding-top: 12vh; }
  .suche { width: min(620px, 100%); padding: 10px; gap: 6px; }
  .gross-such { height: 48px; font-size: 16px; border-radius: 16px; }
  .ergebnisse { max-height: 50vh; overflow: auto; display: flex; flex-direction: column; gap: 2px; }
  .treffer { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; border: 0; background: transparent; cursor: pointer; text-align: left; }
  .treffer.an { background: var(--flaeche-2); }
  .treffer :global(svg) { color: var(--akzent); flex: none; }
</style>
