<script>
  import { onMount } from 'svelte';
  import {
    LayoutDashboard, ListTodo, CalendarDays, Wallet, StickyNote, Paperclip, Users, Package, Settings, Search, Plus, Truck, ShoppingCart,
  } from '@lucide/svelte';
  import { app, start, speichernPlanen, oeffne, oeffneNeu, schliesseToast } from './zustand.svelte.js';
  import { imBrowser } from './api.js';
  import { heute, tageBis } from './util.js';
  import logo from './icon-klein.png';

  import Uebersicht from './Uebersicht.svelte';
  import Aufgaben from './Aufgaben.svelte';
  import Kalender from './Kalender.svelte';
  import Kosten from './Kosten.svelte';
  import Notizen from './Notizen.svelte';
  import Dateien from './Dateien.svelte';
  import Kontakte from './Kontakte.svelte';
  import Kartons from './Kartons.svelte';
  import Einkaufen from './Einkaufen.svelte';
  import EinkaufDialog from './EinkaufDialog.svelte';
  import Einstellungen from './Einstellungen.svelte';
  import AufgabeDialog from './AufgabeDialog.svelte';
  import KostenDialog from './KostenDialog.svelte';
  import TerminDialog from './TerminDialog.svelte';
  import NotizDialog from './NotizDialog.svelte';
  import KontaktDialog from './KontaktDialog.svelte';
  import Suche from './Suche.svelte';
  import Modal from './Modal.svelte';

  const SEITEN = [
    { id: 'uebersicht', name: 'Übersicht', icon: LayoutDashboard, komp: Uebersicht },
    { id: 'aufgaben', name: 'Aufgaben', icon: ListTodo, komp: Aufgaben },
    { id: 'kalender', name: 'Kalender', icon: CalendarDays, komp: Kalender },
    { id: 'kosten', name: 'Kosten', icon: Wallet, komp: Kosten },
    { id: 'einkaufen', name: 'Einkaufsliste', icon: ShoppingCart, komp: Einkaufen },
    { id: 'notizen', name: 'Notizen', icon: StickyNote, komp: Notizen },
    { id: 'dateien', name: 'Dateien', icon: Paperclip, komp: Dateien },
    { id: 'kontakte', name: 'Kontakte', icon: Users, komp: Kontakte },
    { id: 'kartons', name: 'Kartons', icon: Package, komp: Kartons },
  ];
  const EINST = { id: 'einstellungen', name: 'Einstellungen', icon: Settings, komp: Einstellungen };

  const DIALOGE = { aufgabe: AufgabeDialog, kosten: KostenDialog, termin: TerminDialog, notiz: NotizDialog, kontakt: KontaktDialog, einkauf: EinkaufDialog };

  onMount(async () => {
    if (imBrowser) document.body.classList.add('vorschau');
    await start();
    window.umzug?.beiNavigation?.(navigieren);
  });

  function navigieren(ziel) {
    if (!ziel) return;
    if (ziel.seite) app.seite = ziel.seite;
    if (ziel.typ && ziel.id) {
      app.seite = ziel.typ === 'termin' ? 'kalender' : 'aufgaben';
      oeffne(ziel.typ, ziel.id);
    }
    if (ziel.aktion === 'neueAufgabe') oeffneNeu('aufgabe');
    if (ziel.aktion === 'neueKosten') { app.seite = 'kosten'; oeffneNeu('kosten'); }
  }

  // Automatisch speichern bei jeder Änderung
  $effect(() => {
    if (!app.doc) return;
    $state.snapshot(app.doc);
    speichernPlanen();
  });

  let e = $derived(app.doc?.einstellungen);
  let aktuelleSeite = $derived([...SEITEN, EINST].find((s) => s.id === app.seite) || SEITEN[0]);
  let Dialog = $derived(app.dialog ? DIALOGE[app.dialog.typ] : null);

  let zaehler = $derived.by(() => {
    if (!app.doc) return {};
    const h = heute();
    const offen = app.doc.aufgaben.filter((a) => !a.erledigt);
    return {
      aufgaben: offen.length,
      ueberfaellig: offen.filter((a) => a.faellig && a.faellig < h).length,
      einkaufen: (app.doc.einkaufen || []).filter((e) => !e.gekauft).length,
    };
  });
  let tage = $derived(e?.umzugsdatum ? tageBis(e.umzugsdatum) : null);

  function tasten(ev) {
    const strg = ev.ctrlKey || ev.metaKey;
    if (strg && ev.key.toLowerCase() === 'k') { ev.preventDefault(); app.suche = true; }
    else if (strg && ev.key.toLowerCase() === 'n' && !app.dialog) { ev.preventDefault(); oeffneNeu('aufgabe'); }
    else if (strg && /^[1-9]$/.test(ev.key) && !app.dialog) {
      const s = [...SEITEN, EINST][+ev.key - 1];
      if (s) { ev.preventDefault(); app.seite = s.id; }
    }
  }
</script>

<svelte:window onkeydown={tasten} />

{#if app.doc}
  <div
    class="app"
    class:hell={e.thema === 'hell'}
    class:glas={e.glas}
    class:ohne-glas={!e.glas}
    style="--akzent:{e.akzent}; --tint:{e.glasDeckkraft}"
  >
    <aside class="seitenleiste">
      <div class="logo"><img src={logo} alt="" />Umzugsplaner</div>
      {#each SEITEN as s (s.id)}
        <button class="nav-knopf" class:aktiv={app.seite === s.id} onclick={() => (app.seite = s.id)}>
          <s.icon size={18} />
          {s.name}
          {#if s.id === 'aufgaben' && zaehler.aufgaben}
            <span class="zahl" class:warn={zaehler.ueberfaellig}>{zaehler.ueberfaellig || zaehler.aufgaben}</span>
          {/if}
          {#if s.id === 'einkaufen' && zaehler.einkaufen}
            <span class="zahl">{zaehler.einkaufen}</span>
          {/if}
        </button>
      {/each}

      <div class="leiste-unten spalte">
        {#if tage !== null && tage >= 0}
          <button class="kachel klickbar countdown" onclick={() => (app.seite = 'uebersicht')}>
            <Truck size={18} />
            <div>
              <div class="cd-zahl">{tage === 0 ? 'Heute!' : tage}</div>
              <div class="klein">{tage === 0 ? 'Umzugstag' : tage === 1 ? 'Tag bis zum Umzug' : 'Tage bis zum Umzug'}</div>
            </div>
          </button>
        {/if}
        <button class="nav-knopf" class:aktiv={app.seite === 'einstellungen'} onclick={() => (app.seite = 'einstellungen')}>
          <Settings size={18} /> Einstellungen
        </button>
      </div>
    </aside>

    <main class="haupt">
      <header class="kopfzeile">
        <h1>{aktuelleSeite.name}</h1>
        <div class="platz"></div>
        <button class="suchfeld such-knopf" onclick={() => (app.suche = true)}>
          <Search size={15} /> <span>Suchen …</span> <kbd>Strg K</kbd>
        </button>
        <button class="knopf primaer" onclick={() => oeffneNeu('aufgabe')} title="Neue Aufgabe (Strg+N)">
          <Plus size={16} /> Aufgabe
        </button>
      </header>
      <section class="inhalt">
        {#key app.seite}
          <aktuelleSeite.komp />
        {/key}
      </section>
    </main>

    {#if Dialog}
      {#key app.dialog}
        <Dialog />
      {/key}
    {/if}

    {#if app.suche}
      <Suche />
    {/if}

    {#if app.frage}
      {@const f = app.frage}
      <Modal titel="Bitte bestätigen" breite={440} onschliessen={() => { app.frage = null; f.fn(false); }} onspeichern={() => { app.frage = null; f.fn(true); }}>
        <div style="line-height:1.5">{f.text}</div>
        {#snippet fuss()}
          <div class="wachsen"></div>
          <button class="knopf" onclick={() => { app.frage = null; f.fn(false); }}>Abbrechen</button>
          <button class="knopf primaer" onclick={() => { app.frage = null; f.fn(true); }}>{f.ok}</button>
        {/snippet}
      </Modal>
    {/if}

    <div class="toasts">
      {#each app.toasts as t (t.id)}
        <div class="toast">
          <span>{t.text}</span>
          {#if t.aktion}
            <button class="knopf klein" onclick={() => { t.aktion.fn(); schliesseToast(t.id); }}>{t.aktion.text}</button>
          {:else}
            <span style="width:6px"></span>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .countdown {
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
    padding: 12px 14px;
    margin-bottom: 6px;
    color: var(--text);
    font: inherit;
  }
  .countdown :global(svg) { color: var(--akzent); flex: none; }
  .cd-zahl { font-size: 22px; font-weight: 700; line-height: 1.1; }
  .such-knopf { cursor: pointer; width: 230px; font: inherit; }
  .such-knopf span { flex: 1; text-align: left; }
</style>
