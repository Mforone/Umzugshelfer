<script>
  import { Plus, Search, ListTodo, Sparkles, UserRound } from '@lucide/svelte';
  import AufgabeZeile from './AufgabeZeile.svelte';
  import { app, neueAufgabe, toast, person } from './zustand.svelte.js';
  import { AUFGABEN_KATEGORIEN, aufgabenKategorie, heute, tageBis, sortiereNachFaelligkeit } from './util.js';
  import { vorlageErzeugen } from './vorlage.js';

  let schnell = $state('');
  let suche = $state('');
  let filter = $state('offen');
  let ansicht = $state('datum');
  let kats = $state([]);
  let kontakte = $derived([...app.doc.kontakte].sort((x, y) => (x.name || '').localeCompare(y.name || '')));

  function passtPerson(a) {
    const f = app.aufgabenPerson;
    if (!f) return true;
    if (f === 'keiner') return !person(a.verantwortlich);
    return a.verantwortlich === f;
  }

  let liste = $derived.by(() => {
    const q = suche.trim().toLowerCase();
    return app.doc.aufgaben
      .filter((a) => (filter === 'offen' ? !a.erledigt : filter === 'erledigt' ? a.erledigt : true))
      .filter((a) => !kats.length || kats.includes(a.kategorie))
      .filter(passtPerson)
      .filter((a) => !q || [a.titel, person(a.verantwortlich)?.name || '', a.beschreibung, ...(a.unteraufgaben || []).map((u) => u.text), ...(a.anhaenge || [])].join(' ').toLowerCase().includes(q))
      .sort(sortiereNachFaelligkeit);
  });

  let gruppen = $derived.by(() => {
    if (ansicht === 'person') {
      const gr = [{ id: 'ich', titel: 'Ich' }, ...kontakte.map((k) => ({ id: k.id, titel: k.name }))]
        .map((p) => ({ titel: p.titel, farbe: 'var(--akzent)', items: liste.filter((a) => a.verantwortlich === p.id) }));
      gr.push({ titel: 'Nicht zugewiesen', items: liste.filter((a) => !person(a.verantwortlich)) });
      return gr.filter((g) => g.items.length);
    }
    if (ansicht === 'kategorie') {
      return AUFGABEN_KATEGORIEN.map((k) => ({ titel: k.name, farbe: k.farbe, items: liste.filter((a) => aufgabenKategorie(a.kategorie).id === k.id) })).filter((g) => g.items.length);
    }
    const h = heute();
    const g = [
      { titel: 'Überfällig', farbe: 'var(--rot)', items: [] },
      { titel: 'Heute', farbe: 'var(--gelb)', items: [] },
      { titel: 'Morgen', items: [] },
      { titel: 'Nächste 7 Tage', items: [] },
      { titel: 'Später', items: [] },
      { titel: 'Ohne Datum', items: [] },
      { titel: 'Erledigt', farbe: 'var(--gruen)', items: [] },
    ];
    for (const a of liste) {
      if (a.erledigt) g[6].items.push(a);
      else if (!a.faellig) g[5].items.push(a);
      else if (a.faellig < h) g[0].items.push(a);
      else {
        const t = tageBis(a.faellig);
        g[t === 0 ? 1 : t === 1 ? 2 : t <= 7 ? 3 : 4].items.push(a);
      }
    }
    return g.filter((x) => x.items.length);
  });

  function hinzufuegen() {
    const titel = schnell.trim();
    if (!titel) return;
    const p = app.aufgabenPerson;
    const a = neueAufgabe({ titel, kategorie: kats.length === 1 ? kats[0] : 'sonstiges', verantwortlich: p && p !== 'keiner' ? p : null });
    app.doc.aufgaben.push(a);
    schnell = '';
    toast(`„${titel}“ hinzugefügt – klicken zum Bearbeiten`);
  }

  function katUmschalten(id) {
    kats = kats.includes(id) ? kats.filter((k) => k !== id) : [...kats, id];
  }

  function vorlage() {
    const e = app.doc.einstellungen;
    const neu = vorlageErzeugen(e.umzugsdatum, e.standardErinnerung, e.standardErinnerungUhrzeit);
    app.doc.aufgaben.push(...neu);
    toast(`${neu.length} Aufgaben aus der Umzugs-Checkliste hinzugefügt`);
  }
</script>

<div class="spalte" style="gap:12px">
  <div class="kachel werkzeug">
    <div class="zeile">
      <div class="suchfeld wachsen schnell">
        <Plus size={16} />
        <input bind:value={schnell} placeholder="Neue Aufgabe eingeben und Enter drücken …" onkeydown={(e) => e.key === 'Enter' && hinzufuegen()} />
      </div>
      <div class="suchfeld" style="width:240px">
        <Search size={15} />
        <input bind:value={suche} placeholder="Aufgaben durchsuchen" />
      </div>
    </div>
    <div class="zeile umbruch" style="margin-top:12px">
      <div class="segment">
        <button class:an={filter === 'offen'} onclick={() => (filter = 'offen')}>Offen</button>
        <button class:an={filter === 'alle'} onclick={() => (filter = 'alle')}>Alle</button>
        <button class:an={filter === 'erledigt'} onclick={() => (filter = 'erledigt')}>Erledigt</button>
      </div>
      <div class="segment">
        <button class:an={ansicht === 'datum'} onclick={() => (ansicht = 'datum')}>Nach Datum</button>
        <button class:an={ansicht === 'kategorie'} onclick={() => (ansicht = 'kategorie')}>Nach Kategorie</button>
        <button class:an={ansicht === 'person'} onclick={() => (ansicht = 'person')}>Nach Person</button>
      </div>
      <label class="personfilter" class:an={!!app.aufgabenPerson} title="Nach zuständiger Person filtern">
        <UserRound size={15} />
        <select bind:value={app.aufgabenPerson}>
          <option value="">Alle Personen</option>
          <option value="ich">Ich</option>
          {#each kontakte as k (k.id)}<option value={k.id}>{k.name}</option>{/each}
          <option value="keiner">Nicht zugewiesen</option>
        </select>
      </label>
      <div class="wachsen"></div>
      {#each AUFGABEN_KATEGORIEN as k (k.id)}
        <button class="chip klickbar" class:an={kats.includes(k.id)} onclick={() => katUmschalten(k.id)}>
          <span class="punkt" style="--c:{k.farbe}"></span>{k.name}
        </button>
      {/each}
    </div>
  </div>

  {#if !app.doc.aufgaben.length}
    <div class="kachel leer">
      <Sparkles size={30} />
      <div style="color:var(--text);font-weight:600;margin-bottom:6px">Noch keine Aufgaben</div>
      <div class="klein" style="margin-bottom:14px">Tippe oben eine Aufgabe ein oder übernimm die Umzugs-Checkliste mit ~20 typischen Punkten.</div>
      <button class="knopf primaer" onclick={vorlage}><Sparkles size={15} /> Checkliste übernehmen</button>
    </div>
  {:else if !gruppen.length}
    <div class="kachel leer"><ListTodo size={28} /><div>Keine Aufgaben für diesen Filter.</div></div>
  {/if}

  {#each gruppen as g (g.titel)}
    <section>
      <div class="abschnitt-titel zeile" style="gap:8px">
        {#if g.farbe}<span class="punkt" style="--c:{g.farbe}"></span>{/if}
        {g.titel} <span class="blass">· {g.items.length}</span>
      </div>
      <div class="spalte" style="gap:7px">
        {#each g.items as a (a.id)}<AufgabeZeile aufgabe={a} ziehbar />{/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .werkzeug { padding: 14px; }
  .schnell { height: 40px; }
  .personfilter {
    display: inline-flex; align-items: center; gap: 6px; padding: 0 4px 0 12px; height: 34px;
    border-radius: 99px; background: var(--eingabe); border: 1px solid var(--rand); color: var(--text-2);
  }
  .personfilter.an { border-color: color-mix(in srgb, var(--akzent) 60%, transparent); background: color-mix(in srgb, var(--akzent) 18%, transparent); color: var(--text); }
  .personfilter select { border: 0; background: transparent; outline: none; padding: 6px 8px 6px 0; cursor: pointer; color: var(--text); }
  .personfilter option { background: #1d2232; color: #eef2ff; }
  :global(.hell) .personfilter option { background: #fff; color: #182033; }
</style>
