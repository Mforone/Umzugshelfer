<script>
  import { Truck, ListTodo, Wallet, CalendarClock, StickyNote, Package, Plus, ArrowRight, Sparkles, MapPin, AlertTriangle, Pin, ShoppingCart, Zap } from '@lucide/svelte';
  import AufgabeZeile from './AufgabeZeile.svelte';
  import { app, oeffneNeu, oeffne, toast } from './zustand.svelte.js';
  import { heute, tageBis, datumLang, datumMittel, euro, sortiereNachFaelligkeit, relativ } from './util.js';
  import { vorlageErzeugen } from './vorlage.js';

  let e = $derived(app.doc.einstellungen);
  let tage = $derived(e.umzugsdatum ? tageBis(e.umzugsdatum) : null);
  let alle = $derived(app.doc.aufgaben);
  let erledigt = $derived(alle.filter((a) => a.erledigt).length);
  let quote = $derived(alle.length ? erledigt / alle.length : 0);
  let h = $derived(heute());
  let naechste = $derived(alle.filter((a) => !a.erledigt).sort(sortiereNachFaelligkeit).slice(0, 7));
  let ueberfaellig = $derived(alle.filter((a) => !a.erledigt && a.faellig && a.faellig < h).length);
  let heuteFaellig = $derived(alle.filter((a) => !a.erledigt && a.faellig === h).length);
  let woche = $derived(alle.filter((a) => !a.erledigt && a.faellig && a.faellig >= h && tageBis(a.faellig) <= 7).length);

  let summe = $derived(app.doc.kosten.reduce((s, k) => s + (Number(k.betrag) || 0), 0));
  let bezahlt = $derived(app.doc.kosten.filter((k) => k.status === 'bezahlt').reduce((s, k) => s + (Number(k.betrag) || 0), 0));
  let termine = $derived(app.doc.termine.filter((t) => t.datum >= h).sort((a, b) => (a.datum + (a.von || '')).localeCompare(b.datum + (b.von || ''))).slice(0, 4));
  let notizen = $derived(app.doc.notizen.filter((n) => n.angeheftet).slice(0, 4));
  let kartons = $derived(app.doc.kartons);
  let einkauf = $derived((app.doc.einkaufen || []).filter((x) => !x.gekauft).sort((a, b) => b.dringend - a.dringend));

  const R = 46;
  const U = 2 * Math.PI * R;

  function vorlage() {
    const neu = vorlageErzeugen(e.umzugsdatum, e.standardErinnerung, e.standardErinnerungUhrzeit);
    app.doc.aufgaben.push(...neu);
    toast(`${neu.length} Aufgaben aus der Umzugs-Checkliste hinzugefügt`);
  }
</script>

<div class="raster dash">
  <!-- Hero -->
  <div class="kachel hero">
    <div class="hero-links">
      <div class="kachel-kopf"><Truck size={17} /> Dein Umzug</div>
      {#if e.umzugsdatum}
        <div class="gross riesig">
          {#if tage > 1}Noch {tage} Tage{:else if tage === 1}Morgen geht's los!{:else if tage === 0}Heute ist Umzugstag!{:else}Geschafft – seit {-tage} Tagen{/if}
        </div>
        <div class="klein" style="margin-top:4px">{datumLang(e.umzugsdatum)}</div>
      {:else}
        <div class="gross" style="font-size:22px">Wann ziehst du um?</div>
        <div class="zeile" style="margin-top:12px">
          <input class="eingabe" type="date" style="width:200px" bind:value={e.umzugsdatum} />
          <span class="klein">Damit werden Countdown & Fristen berechnet.</span>
        </div>
      {/if}
      {#if e.alteAdresse || e.neueAdresse}
        <div class="adressen">
          <span class="chip"><MapPin size={12} />{e.alteAdresse || '…'}</span>
          <ArrowRight size={14} style="color:var(--text-3)" />
          <span class="chip farbig" style="--c:var(--akzent)"><MapPin size={12} />{e.neueAdresse || '…'}</span>
        </div>
      {/if}
      <div class="zeile umbruch statuszeile">
        {#if ueberfaellig}<span class="chip rot"><AlertTriangle size={12} />{ueberfaellig} überfällig</span>{/if}
        {#if heuteFaellig}<span class="chip gelb">{heuteFaellig} heute fällig</span>{/if}
        <span class="chip">{woche} in den nächsten 7 Tagen</span>
      </div>
    </div>
    <div class="ring">
      <svg viewBox="0 0 120 120" width="132" height="132">
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--flaeche-2)" stroke-width="11" />
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--akzent)" stroke-width="11" stroke-linecap="round"
          stroke-dasharray={U} stroke-dashoffset={U * (1 - quote)} transform="rotate(-90 60 60)" style="transition: stroke-dashoffset .6s" />
      </svg>
      <div class="ring-text">
        <strong>{Math.round(quote * 100)}%</strong>
        <span class="klein">{erledigt}/{alle.length} erledigt</span>
      </div>
    </div>
  </div>

  <!-- Schnellaktionen -->
  <div class="kachel aktionen">
    <div class="kachel-kopf"><Plus size={17} /> Schnell hinzufügen</div>
    <div class="aktions-raster">
      <button class="aktion" onclick={() => oeffneNeu('aufgabe')}><ListTodo size={20} />Aufgabe</button>
      <button class="aktion" onclick={() => oeffneNeu('kosten')}><Wallet size={20} />Ausgabe</button>
      <button class="aktion" onclick={() => oeffneNeu('termin')}><CalendarClock size={20} />Termin</button>
      <button class="aktion" onclick={() => oeffneNeu('notiz')}><StickyNote size={20} />Notiz</button>
    </div>
  </div>

  <!-- Als Nächstes -->
  <div class="kachel naechste">
    <div class="kachel-kopf"><ListTodo size={17} /> Als Nächstes
      <button class="knopf klein geist rechts" onclick={() => (app.seite = 'aufgaben')}>Alle <ArrowRight size={13} /></button>
    </div>
    {#if !alle.length}
      <div class="leer">
        <Sparkles size={28} />
        <div style="color:var(--text);font-weight:600;margin-bottom:4px">Noch keine Aufgaben</div>
        <div class="klein" style="margin-bottom:14px">Starte mit einer fertigen Umzugs-Checkliste (Kündigung, Ummeldung, Adressänderungen, Zählerstände …).<br />Fristen werden {e.umzugsdatum ? 'automatisch aus deinem Umzugsdatum berechnet' : 'berechnet, sobald du ein Umzugsdatum eingibst'}.</div>
        <button class="knopf primaer" onclick={vorlage}><Sparkles size={15} /> Checkliste übernehmen</button>
      </div>
    {:else if !naechste.length}
      <div class="leer"><Sparkles size={28} /><div>Alles erledigt. Stark! 🎉</div></div>
    {:else}
      <div class="spalte" style="gap:7px">
        {#each naechste as a (a.id)}<AufgabeZeile aufgabe={a} />{/each}
      </div>
    {/if}
  </div>

  <div class="spalte rechts-spalte">
    <!-- Kosten -->
    <button class="kachel klickbar karte" onclick={() => (app.seite = 'kosten')}>
      <div class="kachel-kopf"><Wallet size={17} /> Kosten</div>
      <div class="gross zahlen">{euro(summe)}</div>
      <div class="klein" style="margin:2px 0 12px">{euro(bezahlt)} bezahlt · {euro(summe - bezahlt)} offen</div>
      {#if e.budget > 0}
        <div class="fortschritt" style="--c:{summe > e.budget ? 'var(--rot)' : 'var(--akzent)'}"><div style="width:{Math.min(100, (summe / e.budget) * 100)}%"></div></div>
        <div class="klein" style="margin-top:6px">{summe > e.budget ? `${euro(summe - e.budget)} über Budget` : `${euro(e.budget - summe)} vom Budget übrig`}</div>
      {/if}
    </button>

    <!-- Einkaufsliste -->
    {#if einkauf.length}
      <button class="kachel klickbar karte" onclick={() => (app.seite = 'einkaufen')}>
        <div class="kachel-kopf"><ShoppingCart size={17} /> Noch kaufen <span class="rechts klein">{einkauf.length}</span></div>
        <div class="zeile umbruch" style="gap:6px">
          {#each einkauf.slice(0, 8) as x (x.id)}
            <span class="chip" class:gelb={x.dringend}>{#if x.dringend}<Zap size={11} />{/if}{x.name}</span>
          {/each}
          {#if einkauf.length > 8}<span class="chip">+{einkauf.length - 8}</span>{/if}
        </div>
      </button>
    {/if}

    <!-- Termine -->
    <div class="kachel">
      <div class="kachel-kopf"><CalendarClock size={17} /> Nächste Termine
        <button class="knopf klein geist rechts" onclick={() => (app.seite = 'kalender')}>Kalender <ArrowRight size={13} /></button>
      </div>
      {#if termine.length}
        <div class="spalte" style="gap:6px">
          {#each termine as t (t.id)}
            <button class="eintrag termin" onclick={() => oeffne('termin', t.id)}>
              <span class="punkt" style="--c:{t.farbe}"></span>
              <span class="wachsen eintrag-titel" style="text-align:left">{t.titel}</span>
              <span class="klein">{relativ(t.datum) === datumMittel(t.datum) ? datumMittel(t.datum) : relativ(t.datum)}{t.von ? ', ' + t.von : ''}</span>
            </button>
          {/each}
        </div>
      {:else}
        <div class="klein blass">Keine anstehenden Termine.</div>
      {/if}
    </div>
  </div>

  {#if notizen.length}
    <div class="kachel naechste">
      <div class="kachel-kopf"><Pin size={17} /> Angeheftete Notizen</div>
      <div class="notiz-raster">
        {#each notizen as n (n.id)}
          <button class="kachel klickbar notiz" style="--c:{n.farbe}" onclick={() => oeffne('notiz', n.id)}>
            <strong>{n.titel || 'Notiz'}</strong>
            <div class="klein vorschau">{n.inhalt}</div>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if kartons.length}
    <button class="kachel klickbar karte rechts-spalte" onclick={() => (app.seite = 'kartons')}>
      <div class="kachel-kopf"><Package size={17} /> Kartons</div>
      <div class="gross">{kartons.filter((k) => k.gepackt).length} <span class="klein">von {kartons.length} gepackt</span></div>
      <div class="fortschritt" style="margin-top:10px"><div style="width:{(kartons.filter((k) => k.gepackt).length / kartons.length) * 100}%"></div></div>
    </button>
  {/if}
</div>

<style>
  .dash { grid-template-columns: repeat(12, 1fr); align-items: start; }
  .hero { grid-column: span 8; display: flex; gap: 20px; align-items: center; min-height: 190px;
    background: linear-gradient(135deg, color-mix(in srgb, var(--akzent) 16%, transparent), var(--flaeche) 60%); }
  .hero-links { flex: 1; min-width: 0; }
  .riesig { font-size: 34px; }
  .adressen { display: flex; align-items: center; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
  .statuszeile { margin-top: 12px; }
  .ring { position: relative; flex: none; }
  .ring-text { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .ring-text strong { font-size: 24px; }
  .aktionen { grid-column: span 4; align-self: stretch; }
  .aktions-raster { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .aktion {
    display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px;
    border-radius: 14px; border: 1px solid var(--rand); background: var(--flaeche); cursor: pointer; font-weight: 550;
    transition: background .15s;
  }
  .aktion:hover { background: var(--flaeche-3); }
  .aktion :global(svg) { color: var(--akzent); }
  .naechste { grid-column: span 7; }
  .rechts-spalte { grid-column: span 5; }
  .karte { text-align: left; font: inherit; color: inherit; display: block; width: 100%; }
  .termin { padding: 9px 12px; }
  .notiz-raster { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
  .notiz { text-align: left; font: inherit; color: inherit; border-top: 3px solid var(--c); padding: 12px 14px; }
  .vorschau { white-space: pre-line; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; margin-top: 4px; }
  @media (max-width: 1150px) {
    .hero { grid-column: span 12; }
    .aktionen { grid-column: span 12; }
    .aktions-raster { grid-template-columns: repeat(4, 1fr); }
  }
</style>
