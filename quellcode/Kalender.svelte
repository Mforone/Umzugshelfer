<script>
  import { ChevronLeft, ChevronRight, Plus, CalendarClock, ListTodo, Truck, PartyPopper } from '@lucide/svelte';
  import AufgabeZeile from './AufgabeZeile.svelte';
  import { app, oeffneNeu, oeffne, toast, standardErinnerung } from './zustand.svelte.js';
  import { tagString, heute, lokal, feiertage, aufgabenKategorie, datumLang } from './util.js';

  const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  let e = $derived(app.doc.einstellungen);
  const startMonat = lokal(heute());
  let jahr = $state(startMonat.getFullYear());
  let monat = $state(startMonat.getMonth());
  let gewaehlt = $state(heute());
  let dropZiel = $state(null);

  let tage = $derived.by(() => {
    const erster = new Date(jahr, monat, 1);
    const versatz = (erster.getDay() + 6) % 7;
    const start = new Date(jahr, monat, 1 - versatz);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { datum: tagString(d), tag: d.getDate(), imMonat: d.getMonth() === monat, wochenende: d.getDay() === 0 || d.getDay() === 6 };
    });
  });

  let ft = $derived(e.feiertage ? { ...feiertage(jahr - 1), ...feiertage(jahr), ...feiertage(jahr + 1) } : {});
  let aufgabenNachTag = $derived.by(() => {
    const m = {};
    for (const a of app.doc.aufgaben) if (a.faellig) (m[a.faellig] ||= []).push(a);
    return m;
  });
  let termineNachTag = $derived.by(() => {
    const m = {};
    for (const t of app.doc.termine) if (t.datum) (m[t.datum] ||= []).push(t);
    for (const k in m) m[k].sort((a, b) => (a.von || '').localeCompare(b.von || ''));
    return m;
  });

  let titel = $derived(new Date(jahr, monat, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }));

  function blaettern(n) {
    const d = new Date(jahr, monat + n, 1);
    jahr = d.getFullYear();
    monat = d.getMonth();
  }
  function heuteZeigen() {
    const d = new Date();
    jahr = d.getFullYear();
    monat = d.getMonth();
    gewaehlt = heute();
  }

  function drop(ev, datum) {
    ev.preventDefault();
    dropZiel = null;
    const id = ev.dataTransfer.getData('text/aufgabe');
    const a = app.doc.aufgaben.find((x) => x.id === id);
    if (!a || a.faellig === datum) return;
    const vorher = a.faellig;
    a.faellig = datum;
    if (a.erinnerung && e.standardErinnerung) a.erinnerung = standardErinnerung(datum);
    toast(`„${a.titel}“ auf ${lokal(datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} verschoben`, { text: 'Rückgängig', fn: () => (a.faellig = vorher) });
  }

  let tagAufgaben = $derived(aufgabenNachTag[gewaehlt] || []);
  let tagTermine = $derived(termineNachTag[gewaehlt] || []);
</script>

<div class="kalender-layout">
  <div class="kachel monat">
    <div class="zeile monat-kopf">
      <button class="rund-knopf" onclick={() => blaettern(-1)} title="Vorheriger Monat"><ChevronLeft size={18} /></button>
      <h2>{titel}</h2>
      <button class="rund-knopf" onclick={() => blaettern(1)} title="Nächster Monat"><ChevronRight size={18} /></button>
      <button class="knopf klein" onclick={heuteZeigen}>Heute</button>
      {#if e.umzugsdatum}
        <button class="knopf klein geist" onclick={() => { const d = lokal(e.umzugsdatum); jahr = d.getFullYear(); monat = d.getMonth(); gewaehlt = e.umzugsdatum; }}><Truck size={14} /> Umzugstag</button>
      {/if}
      <div class="wachsen"></div>
      <span class="klein blass">Ziehen = verschieben · Doppelklick = neu</span>
    </div>

    <div class="wochentage">{#each WOCHENTAGE as w}<div>{w}</div>{/each}</div>
    <div class="gitter">
      {#each tage as t (t.datum)}
        {@const aufg = aufgabenNachTag[t.datum] || []}
        {@const term = termineNachTag[t.datum] || []}
        {@const eintraege = [...term.map((x) => ({ typ: 'termin', x })), ...aufg.map((x) => ({ typ: 'aufgabe', x }))]}
        <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
        <div
          class="tag"
          class:fremd={!t.imMonat}
          class:wochenende={t.wochenende}
          class:heute={t.datum === heute()}
          class:gewaehlt={t.datum === gewaehlt}
          class:umzug={t.datum === e.umzugsdatum}
          class:drop-aktiv={dropZiel === t.datum}
          onclick={() => (gewaehlt = t.datum)}
          ondblclick={() => oeffneNeu('aufgabe', { faellig: t.datum })}
          ondragover={(ev) => { if (ev.dataTransfer.types.includes('text/aufgabe')) { ev.preventDefault(); dropZiel = t.datum; } }}
          ondragleave={() => (dropZiel = null)}
          ondrop={(ev) => drop(ev, t.datum)}
        >
          <div class="tag-kopf">
            <span class="nr">{t.tag}</span>
            {#if t.datum === e.umzugsdatum}<span class="umzug-chip"><Truck size={11} /> Umzug</span>
            {:else if ft[t.datum]}<span class="feiertag">{ft[t.datum]}</span>{/if}
          </div>
          {#each eintraege.slice(0, 3) as en (en.x.id)}
            {#if en.typ === 'termin'}
              <button class="mini termin" style="--c:{en.x.farbe}" onclick={(ev) => { ev.stopPropagation(); oeffne('termin', en.x.id); }}>
                {en.x.von ? en.x.von + ' ' : ''}{en.x.titel}
              </button>
            {:else}
              <button
                class="mini"
                class:fertig={en.x.erledigt}
                style="--c:{aufgabenKategorie(en.x.kategorie).farbe}"
                draggable="true"
                ondragstart={(ev) => { ev.dataTransfer.setData('text/aufgabe', en.x.id); }}
                onclick={(ev) => { ev.stopPropagation(); oeffne('aufgabe', en.x.id); }}
              >{en.x.titel}</button>
            {/if}
          {/each}
          {#if eintraege.length > 3}<div class="mehr">+{eintraege.length - 3} weitere</div>{/if}
        </div>
      {/each}
    </div>
  </div>

  <div class="kachel tagesansicht">
    <div class="kachel-kopf" style="margin-bottom:4px"><CalendarClock size={17} /> {datumLang(gewaehlt)}</div>
    {#if ft[gewaehlt]}<div class="chip gelb" style="align-self:flex-start"><PartyPopper size={12} />{ft[gewaehlt]}</div>{/if}
    {#if gewaehlt === e.umzugsdatum}<div class="chip farbig" style="--c:var(--akzent);align-self:flex-start"><Truck size={12} /> Umzugstag</div>{/if}
    <div class="zeile" style="margin:10px 0 6px">
      <button class="knopf klein" onclick={() => oeffneNeu('aufgabe', { faellig: gewaehlt })}><Plus size={14} /> Aufgabe</button>
      <button class="knopf klein" onclick={() => oeffneNeu('termin', { datum: gewaehlt })}><Plus size={14} /> Termin</button>
    </div>

    {#if tagTermine.length}
      <div class="abschnitt-titel">Termine</div>
      <div class="spalte" style="gap:6px">
        {#each tagTermine as t (t.id)}
          <button class="eintrag" onclick={() => oeffne('termin', t.id)}>
            <span class="punkt" style="--c:{t.farbe}"></span>
            <span class="wachsen" style="text-align:left">
              <div class="eintrag-titel">{t.titel}</div>
              <div class="klein">{t.von || 'ganztägig'}{t.bis ? '–' + t.bis : ''}{t.ort ? ' · ' + t.ort : ''}</div>
            </span>
          </button>
        {/each}
      </div>
    {/if}
    {#if tagAufgaben.length}
      <div class="abschnitt-titel">Aufgaben</div>
      <div class="spalte" style="gap:6px">
        {#each tagAufgaben as a (a.id)}<AufgabeZeile aufgabe={a} kompakt ziehbar />{/each}
      </div>
    {/if}
    {#if !tagTermine.length && !tagAufgaben.length}
      <div class="leer klein"><ListTodo size={24} /><div>Nichts geplant.</div></div>
    {/if}
  </div>
</div>

<style>
  .kalender-layout { display: grid; grid-template-columns: 1fr 300px; gap: 14px; align-items: start; }
  .monat { padding: 14px; }
  .monat-kopf { margin-bottom: 10px; }
  .monat-kopf h2 { margin: 0; font-size: 17px; font-weight: 650; min-width: 150px; text-align: center; }
  .wochentage { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-bottom: 6px; }
  .wochentage div { text-align: center; font-size: 12px; color: var(--text-3); font-weight: 600; }
  .gitter { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
  .tag {
    min-height: 96px; border-radius: 14px; padding: 6px; background: var(--flaeche);
    border: 1px solid var(--rand); cursor: pointer; display: flex; flex-direction: column; gap: 3px; min-width: 0;
    transition: background .12s, border-color .12s;
  }
  .tag:hover { background: var(--flaeche-2); }
  .tag.wochenende { background: color-mix(in srgb, var(--flaeche) 60%, transparent); }
  .tag.fremd { opacity: 0.45; }
  .tag.gewaehlt { border-color: color-mix(in srgb, var(--akzent) 70%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--akzent) 50%, transparent); }
  .tag.heute .nr { background: var(--akzent); color: #0b1020; }
  .tag.umzug { background: color-mix(in srgb, var(--akzent) 18%, var(--flaeche)); }
  .tag-kopf { display: flex; align-items: center; gap: 4px; min-width: 0; }
  .nr { width: 24px; height: 24px; border-radius: 99px; display: inline-flex; align-items: center; justify-content: center; font-size: 12.5px; font-weight: 600; flex: none; }
  .feiertag { font-size: 10.5px; color: var(--gelb); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .umzug-chip { font-size: 10.5px; color: var(--akzent); display: inline-flex; gap: 3px; align-items: center; font-weight: 600; }
  .mini {
    font-size: 11.5px; text-align: left; border: 0; border-radius: 8px; padding: 2px 7px; cursor: pointer;
    background: color-mix(in srgb, var(--c) 22%, transparent); color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-left: 3px solid var(--c);
  }
  .mini.termin { border-radius: 99px; border-left: 0; background: color-mix(in srgb, var(--c) 35%, transparent); }
  .mini.fertig { text-decoration: line-through; opacity: .55; }
  .mehr { font-size: 11px; color: var(--text-3); padding-left: 4px; }
  .tagesansicht { display: flex; flex-direction: column; position: sticky; top: 0; }
  @media (max-width: 1150px) { .kalender-layout { grid-template-columns: 1fr; } .tagesansicht { position: static; } }
</style>
