<script>
  import { ListTodo, Bell, Trash2, Check, Plus, X, Wallet, UserRound } from '@lucide/svelte';
  import Modal from './Modal.svelte';
  import AnhangListe from './AnhangListe.svelte';
  import { app, listeFuer, uebernehmen, loeschen, schliesseDialog, oeffneNeu, oeffne, standardErinnerung, neuerKontakt } from './zustand.svelte.js';
  import { AUFGABEN_KATEGORIEN, PRIORITAETEN, uid, plusTage, euro, datumKurz, heute, jetztIso } from './util.js';

  const d = app.dialog;
  const vorhanden = !d.neu;
  const original = d.neu || listeFuer('aufgabe').find((x) => x.id === d.id);
  let a = $state(original ? structuredClone($state.snapshot(original)) : null);
  if (!original) schliesseDialog();

  let neueUA = $state('');
  if (a && a.verantwortlich === undefined) a.verantwortlich = null;
  let wer = $state(a?.verantwortlich || '');
  let neuerName = $state('');
  let kontakte = $derived([...app.doc.kontakte].sort((x, y) => (x.name || '').localeCompare(y.name || '')));
  $effect(() => { if (wer !== '__neu') a.verantwortlich = wer || null; });

  function kontaktAnlegen() {
    const name = neuerName.trim();
    if (!name) return;
    const k = neuerKontakt({ name, rolle: 'Umzugshelfer' });
    app.doc.kontakte.push(k);
    wer = k.id;
    neuerName = '';
  }
  let kosten = $derived(app.doc.kosten.filter((k) => k.aufgabeId === a?.id));
  let titelFeld = $state();

  $effect(() => { if (!vorhanden) titelFeld?.focus(); });

  function speichern() {
    if (!a.titel.trim()) a.titel = 'Neue Aufgabe';
    if (a.erledigt && !a.erledigtAm) a.erledigtAm = jetztIso();
    if (!a.erledigt) a.erledigtAm = null;
    uebernehmen('aufgabe', a);
    schliesseDialog();
  }

  function faelligGeaendert() {
    if (a.faellig && !a.erinnerung && app.doc.einstellungen.standardErinnerung) a.erinnerung = standardErinnerung(a.faellig);
    if (!a.faellig) a.uhrzeit = null;
  }

  function erinnerungUmschalten() {
    if (a.erinnerung) a.erinnerung = null;
    else a.erinnerung = a.faellig ? standardErinnerung(a.faellig) : `${heute()}T${app.doc.einstellungen.standardErinnerungUhrzeit || '09:00'}`;
  }

  function schnell(tageVorher, uhr) {
    if (!a.faellig) return;
    a.erinnerung = `${plusTage(a.faellig, -tageVorher)}T${uhr}`;
  }

  function uaHinzu() {
    const t = neueUA.trim();
    if (!t) return;
    a.unteraufgaben.push({ id: uid('ua'), text: t, erledigt: false });
    neueUA = '';
  }

  function kostenNeu() {
    uebernehmen('aufgabe', a);
    oeffneNeu('kosten', { aufgabeId: a.id, titel: a.titel });
  }
</script>

{#if a}
  <Modal titel={vorhanden ? 'Aufgabe' : 'Neue Aufgabe'} icon={ListTodo} breite={780} onschliessen={schliesseDialog} onspeichern={speichern}>
    <input class="eingabe titel-eingabe" bind:this={titelFeld} bind:value={a.titel} placeholder="Was ist zu tun?" />

    <div class="raster vier">
      <label class="feld"><span>Fällig am</span>
        <input class="eingabe" type="date" bind:value={a.faellig} onchange={faelligGeaendert} />
      </label>
      <label class="feld"><span>Uhrzeit (optional)</span>
        <input class="eingabe" type="time" bind:value={a.uhrzeit} disabled={!a.faellig} />
      </label>
      <label class="feld"><span>Kategorie</span>
        <select class="eingabe" bind:value={a.kategorie}>
          {#each AUFGABEN_KATEGORIEN as k (k.id)}<option value={k.id}>{k.name}</option>{/each}
        </select>
      </label>
      <div class="feld"><span>Priorität</span>
        <div class="segment">
          {#each PRIORITAETEN as p (p.id)}
            <button class:an={a.prioritaet === p.id} onclick={() => (a.prioritaet = p.id)}>{p.name}</button>
          {/each}
        </div>
      </div>
    </div>

    <div class="raster" style="grid-template-columns: 1fr 1fr; align-items:end">
      <label class="feld"><span>Zuständig</span>
        <select class="eingabe" bind:value={wer}>
          <option value="">– niemand –</option>
          <option value="ich">Ich</option>
          {#each kontakte as k (k.id)}<option value={k.id}>{k.name}{k.rolle ? ' · ' + k.rolle : ''}</option>{/each}
          <option value="__neu">+ Neuen Kontakt anlegen …</option>
        </select>
      </label>
      {#if wer === '__neu'}
        <div class="zeile">
          <!-- svelte-ignore a11y_autofocus -->
          <input class="eingabe" autofocus bind:value={neuerName} placeholder="Name der Person"
            onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); kontaktAnlegen(); } }} />
          <button class="knopf" onclick={kontaktAnlegen}><UserRound size={15} /> Anlegen</button>
        </div>
      {/if}
    </div>

    <div class="kachel erinnerung">
      <div class="zeile umbruch">
        <Bell size={16} style="color:var(--akzent)" />
        <strong class="wachsen">Erinnerung</strong>
        <button class="schalter" class:an={!!a.erinnerung} onclick={erinnerungUmschalten} aria-label="Erinnerung an/aus"></button>
      </div>
      {#if a.erinnerung}
        <div class="zeile umbruch" style="margin-top:10px">
          <input class="eingabe" type="datetime-local" style="width:230px" bind:value={a.erinnerung} />
          {#if a.faellig}
            <button class="chip klickbar" onclick={() => schnell(0, '08:00')}>Am Tag, 8 Uhr</button>
            <button class="chip klickbar" onclick={() => schnell(1, '09:00')}>1 Tag vorher</button>
            <button class="chip klickbar" onclick={() => schnell(3, '09:00')}>3 Tage vorher</button>
            <button class="chip klickbar" onclick={() => schnell(7, '09:00')}>1 Woche vorher</button>
          {/if}
        </div>
      {/if}
    </div>

    <label class="feld"><span>Notizen / Beschreibung</span>
      <textarea class="eingabe" bind:value={a.beschreibung} placeholder="Details, Telefonnummern, Links, was mitzunehmen ist …"></textarea>
    </label>

    <div class="feld"><span>Teilschritte</span>
      <div class="spalte" style="gap:6px">
        {#each a.unteraufgaben as u, i (u.id)}
          <div class="zeile ua">
            <button class="haken klein" class:an={u.erledigt} onclick={() => (u.erledigt = !u.erledigt)}><Check size={11} strokeWidth={3} /></button>
            <input class="eingabe ua-text" class:durch={u.erledigt} bind:value={u.text} />
            <button class="rund-knopf" onclick={() => a.unteraufgaben.splice(i, 1)} title="Entfernen"><X size={14} /></button>
          </div>
        {/each}
        <div class="zeile">
          <input class="eingabe" bind:value={neueUA} placeholder="Teilschritt hinzufügen und Enter drücken"
            onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); uaHinzu(); } }} />
          <button class="knopf klein" onclick={uaHinzu}><Plus size={14} /></button>
        </div>
      </div>
    </div>

    <div class="feld"><span>Anhänge</span>
      <AnhangListe bind:anhaenge={a.anhaenge} />
    </div>

    <div class="feld"><span>Kosten zu dieser Aufgabe</span>
      <div class="spalte" style="gap:6px">
        {#each kosten as k (k.id)}
          <button class="eintrag" onclick={() => { uebernehmen('aufgabe', a); oeffne('kosten', k.id); }}>
            <Wallet size={15} style="color:var(--akzent)" />
            <span class="wachsen" style="text-align:left">{k.titel}</span>
            <span class="klein">{datumKurz(k.datum)}</span>
            <strong class="zahlen">{euro(k.betrag)}</strong>
          </button>
        {/each}
        <div><button class="knopf klein" onclick={kostenNeu}><Plus size={14} /> Ausgabe erfassen</button></div>
      </div>
    </div>

    {#snippet fuss()}
      {#if vorhanden}
        <button class="knopf geist gefahr" onclick={() => { loeschen('aufgabe', a.id, 'Aufgabe'); schliesseDialog(); }}><Trash2 size={15} /> Löschen</button>
      {/if}
      <button class="knopf geist" onclick={() => (a.erledigt = !a.erledigt)}>
        <span class="haken klein" class:an={a.erledigt}><Check size={11} strokeWidth={3} /></span>
        {a.erledigt ? 'Erledigt' : 'Als erledigt markieren'}
      </button>
      <div class="wachsen"></div>
      <button class="knopf" onclick={schliesseDialog}>Abbrechen</button>
      <button class="knopf primaer" onclick={speichern}>{vorhanden ? 'Speichern' : 'Hinzufügen'}</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .vier { grid-template-columns: 150px 120px 1fr auto; align-items: end; }
  .erinnerung { padding: 12px 14px; }
  .ua-text { padding: 6px 10px; }
  .durch { text-decoration: line-through; color: var(--text-3); }
</style>
