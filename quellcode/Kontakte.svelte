<script>
  import { Plus, Phone, Mail, Users, Search, Copy, ListTodo } from '@lucide/svelte';
  import { app, oeffneNeu, oeffne, toast } from './zustand.svelte.js';
  import { api } from './api.js';

  let suche = $state('');
  let liste = $derived.by(() => {
    const q = suche.trim().toLowerCase();
    return app.doc.kontakte
      .filter((k) => !q || `${k.name} ${k.rolle} ${k.telefon} ${k.email} ${k.notiz}`.toLowerCase().includes(q))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  });
  const offene = (id) => app.doc.aufgaben.filter((a) => a.verantwortlich === id && !a.erledigt).length;
  function aufgabenZeigen(id) {
    app.aufgabenPerson = id;
    app.seite = 'aufgaben';
  }
  const initialen = (n) => (n || '?').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  function kopieren(text) {
    navigator.clipboard.writeText(text);
    toast('Kopiert');
  }
</script>

<div class="spalte" style="gap:14px">
  <div class="zeile">
    <button class="knopf primaer" onclick={() => oeffneNeu('kontakt')}><Plus size={16} /> Kontakt</button>
    <div class="suchfeld" style="width:260px"><Search size={15} /><input bind:value={suche} placeholder="Kontakte durchsuchen" /></div>
  </div>
  {#if liste.length}
    <div class="kontakte">
      {#each liste as k (k.id)}
        <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
        <div class="kachel klickbar kontakt" onclick={() => oeffne('kontakt', k.id)}>
          <div class="zeile">
            <div class="avatar">{initialen(k.name)}</div>
            <div class="wachsen">
              <div style="font-weight:600">{k.name}</div>
              {#if k.rolle}<div class="klein">{k.rolle}</div>{/if}
            </div>
          </div>
          <div class="spalte" style="gap:4px;margin-top:10px">
            {#if k.telefon}
              <div class="zeile wert"><Phone size={14} /><span class="wachsen">{k.telefon}</span>
                <button class="rund-knopf" title="Kopieren" onclick={(e) => { e.stopPropagation(); kopieren(k.telefon); }}><Copy size={13} /></button></div>
            {/if}
            {#if k.email}
              <div class="zeile wert"><Mail size={14} /><span class="wachsen">{k.email}</span>
                <button class="rund-knopf" title="E-Mail schreiben" onclick={(e) => { e.stopPropagation(); api.extern('mailto:' + k.email); }}><Mail size={13} /></button></div>
            {/if}
            {#if k.notiz}<div class="klein notiz">{k.notiz}</div>{/if}
            {#if offene(k.id)}
              <div><button class="chip klickbar aufg" onclick={(e) => { e.stopPropagation(); aufgabenZeigen(k.id); }}>
                <ListTodo size={12} /> {offene(k.id)} offene Aufgabe{offene(k.id) > 1 ? 'n' : ''}
              </button></div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="kachel leer"><Users size={30} /><div>Vermieter, Hausverwaltung, Umzugshelfer, Autovermietung … alle wichtigen Nummern an einem Ort.</div></div>
  {/if}
</div>

<style>
  .kontakte { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
  .avatar {
    width: 42px; height: 42px; border-radius: 99px; display: flex; align-items: center; justify-content: center; font-weight: 700;
    background: color-mix(in srgb, var(--akzent) 30%, transparent); color: var(--text); flex: none;
  }
  .wert { gap: 8px; color: var(--text-2); font-size: 13px; }
  .wert .rund-knopf { width: 26px; height: 26px; }
  .notiz { white-space: pre-wrap; margin-top: 4px; }
  .aufg { margin-top: 6px; }
</style>
