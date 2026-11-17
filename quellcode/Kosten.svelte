<script>
  import { Plus, Download, Wallet, CheckCircle2, Clock, RotateCcw, PiggyBank, Paperclip, Receipt, Search } from '@lucide/svelte';
  import { app, oeffneNeu, oeffne, toast } from './zustand.svelte.js';
  import { api } from './api.js';
  import { KOSTEN_KATEGORIEN, ZAHLUNGSARTEN, kostenKategorie, zahlungsart, euro, datumKurz, betragLesen, csvZelle, heute } from './util.js';

  let e = $derived(app.doc.einstellungen);
  let fStatus = $state('alle');
  let fKat = $state('');
  let fZahl = $state('');
  let suche = $state('');
  const startBudget = app.doc.einstellungen.budget;
  let budgetText = $state(startBudget ? String(startBudget).replace('.', ',') : '');

  const betrag = (k) => Number(k.betrag) || 0;
  const summe = (l) => l.reduce((s, k) => s + betrag(k), 0);

  let alle = $derived(app.doc.kosten);
  let gesamt = $derived(summe(alle));
  let bezahlt = $derived(summe(alle.filter((k) => k.status === 'bezahlt')));
  let offen = $derived(gesamt - bezahlt);
  let erstattbar = $derived(summe(alle.filter((k) => k.erstattbar)));
  let steuer = $derived(summe(alle.filter((k) => k.steuerrelevant)));

  let nachKat = $derived(KOSTEN_KATEGORIEN.map((c) => ({ ...c, summe: summe(alle.filter((k) => kostenKategorie(k.kategorie).id === c.id)) })).filter((c) => c.summe > 0).sort((a, b) => b.summe - a.summe));
  let nachZahl = $derived(ZAHLUNGSARTEN.map((z) => ({ ...z, summe: summe(alle.filter((k) => zahlungsart(k.zahlungsart).id === z.id)) })).filter((z) => z.summe > 0).sort((a, b) => b.summe - a.summe));
  let maxKat = $derived(Math.max(1, ...nachKat.map((c) => c.summe)));
  let maxZahl = $derived(Math.max(1, ...nachZahl.map((c) => c.summe)));

  let gefiltert = $derived.by(() => {
    const q = suche.trim().toLowerCase();
    return alle
      .filter((k) => fStatus === 'alle' || k.status === fStatus)
      .filter((k) => !fKat || kostenKategorie(k.kategorie).id === fKat)
      .filter((k) => !fZahl || zahlungsart(k.zahlungsart).id === fZahl)
      .filter((k) => !q || `${k.titel} ${k.notiz} ${k.bezahltVon}`.toLowerCase().includes(q))
      .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  });
  let gefiltertSumme = $derived(summe(gefiltert));

  function budgetSetzen() {
    e.budget = betragLesen(budgetText);
    budgetText = e.budget ? String(e.budget).replace('.', ',') : '';
  }

  async function exportieren() {
    const kopf = ['Datum', 'Titel', 'Kategorie', 'Zahlungsart', 'Status', 'Betrag (EUR)', 'Bezahlt von', 'Erstattbar', 'Steuerrelevant', 'Belege', 'Notiz'];
    const zeilen = [...alle].sort((a, b) => (a.datum || '').localeCompare(b.datum || '')).map((k) => [
      datumKurz(k.datum), k.titel, kostenKategorie(k.kategorie).name, zahlungsart(k.zahlungsart).name, k.status === 'bezahlt' ? 'bezahlt' : 'offen',
      betrag(k).toFixed(2).replace('.', ','), k.bezahltVon, k.erstattbar ? 'ja' : '', k.steuerrelevant ? 'ja' : '', (k.anhaenge || []).join(', '), k.notiz,
    ]);
    zeilen.push([], ['', 'Summe', '', '', '', gesamt.toFixed(2).replace('.', ',')]);
    const csv = '﻿' + [kopf, ...zeilen].map((z) => z.map(csvZelle).join(';')).join('\r\n');
    const pfad = await api.exportSpeichern({ dateiname: `Umzugskosten-${heute()}.csv`, inhalt: csv, filter: [{ name: 'CSV (Excel)', extensions: ['csv'] }] });
    if (pfad) toast('Kosten exportiert', { text: 'Öffnen', fn: () => api.extern('file:///' + pfad) });
  }
</script>

<div class="spalte" style="gap:14px">
  <div class="raster kpis">
    <div class="kachel"><div class="kachel-kopf"><Wallet size={16} /> Gesamt</div><div class="gross zahlen">{euro(gesamt)}</div><div class="klein">{alle.length} Ausgaben</div></div>
    <div class="kachel"><div class="kachel-kopf"><CheckCircle2 size={16} /> Bezahlt</div><div class="gross zahlen">{euro(bezahlt)}</div><div class="klein">{alle.filter((k) => k.status === 'bezahlt').length} Posten</div></div>
    <div class="kachel"><div class="kachel-kopf"><Clock size={16} /> Noch offen</div><div class="gross zahlen" style:color={offen > 0 ? 'var(--gelb)' : null}>{euro(offen)}</div><div class="klein">{alle.filter((k) => k.status !== 'bezahlt').length} Posten</div></div>
    <div class="kachel"><div class="kachel-kopf"><RotateCcw size={16} /> Bekomme ich zurück</div><div class="gross zahlen">{euro(erstattbar)}</div><div class="klein">z. B. Kaution · Steuer: {euro(steuer)}</div></div>
    <div class="kachel">
      <div class="kachel-kopf"><PiggyBank size={16} /> Budget</div>
      <div class="betrag-feld">
        <input class="eingabe zahlen" bind:value={budgetText} placeholder="z. B. 2000" onblur={budgetSetzen} onkeydown={(ev) => ev.key === 'Enter' && ev.currentTarget.blur()} />
        <span>€</span>
      </div>
      {#if e.budget > 0}
        <div class="fortschritt" style="margin-top:10px; --c:{gesamt > e.budget ? 'var(--rot)' : 'var(--akzent)'}"><div style="width:{Math.min(100, (gesamt / e.budget) * 100)}%"></div></div>
        <div class="klein" style="margin-top:5px">{gesamt > e.budget ? euro(gesamt - e.budget) + ' drüber' : euro(e.budget - gesamt) + ' übrig'}</div>
      {/if}
    </div>
  </div>

  {#if alle.length}
    <div class="raster" style="grid-template-columns: 1fr 1fr">
      <div class="kachel">
        <div class="kachel-kopf">Nach Kategorie</div>
        <div class="spalte" style="gap:8px">
          {#each nachKat as c (c.id)}
            <button class="balken-zeile" class:an={fKat === c.id} onclick={() => (fKat = fKat === c.id ? '' : c.id)}>
              <span class="b-name">{c.name}</span>
              <span class="fortschritt wachsen" style="--c:{c.farbe}"><div style="width:{(c.summe / maxKat) * 100}%"></div></span>
              <span class="b-wert zahlen">{euro(c.summe)}</span>
            </button>
          {/each}
        </div>
      </div>
      <div class="kachel">
        <div class="kachel-kopf">Nach Zahlungsart</div>
        <div class="spalte" style="gap:8px">
          {#each nachZahl as z (z.id)}
            <button class="balken-zeile" class:an={fZahl === z.id} onclick={() => (fZahl = fZahl === z.id ? '' : z.id)}>
              <span class="b-name">{z.name}</span>
              <span class="fortschritt wachsen"><div style="width:{(z.summe / maxZahl) * 100}%"></div></span>
              <span class="b-wert zahlen">{euro(z.summe)}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <div class="kachel" style="padding:14px">
    <div class="zeile umbruch">
      <button class="knopf primaer" onclick={() => oeffneNeu('kosten')}><Plus size={16} /> Ausgabe</button>
      <div class="segment">
        <button class:an={fStatus === 'alle'} onclick={() => (fStatus = 'alle')}>Alle</button>
        <button class:an={fStatus === 'bezahlt'} onclick={() => (fStatus = 'bezahlt')}>Bezahlt</button>
        <button class:an={fStatus === 'offen'} onclick={() => (fStatus = 'offen')}>Offen</button>
      </div>
      <select class="eingabe" style="width:auto" bind:value={fKat}>
        <option value="">Alle Kategorien</option>
        {#each KOSTEN_KATEGORIEN as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
      </select>
      <select class="eingabe" style="width:auto" bind:value={fZahl}>
        <option value="">Alle Zahlungsarten</option>
        {#each ZAHLUNGSARTEN as z (z.id)}<option value={z.id}>{z.name}</option>{/each}
      </select>
      <div class="suchfeld" style="width:200px"><Search size={15} /><input bind:value={suche} placeholder="Suchen" /></div>
      <div class="wachsen"></div>
      <button class="knopf" onclick={exportieren} disabled={!alle.length}><Download size={15} /> CSV für Excel</button>
    </div>

    {#if gefiltert.length}
      <table class="tabelle" style="margin-top:8px">
        <thead><tr><th>Datum</th><th>Wofür</th><th>Kategorie</th><th>Bezahlt mit</th><th>Status</th><th class="rechts">Betrag</th></tr></thead>
        <tbody>
          {#each gefiltert as k (k.id)}
            {@const c = kostenKategorie(k.kategorie)}
            <tr class="klickbar" onclick={() => oeffne('kosten', k.id)}>
              <td class="klein zahlen">{datumKurz(k.datum)}</td>
              <td>
                <div class="zeile" style="gap:6px">
                  <strong style="font-weight:550">{k.titel}</strong>
                  {#if k.anhaenge?.length}<span class="blass" title="Beleg vorhanden"><Paperclip size={13} /></span>{/if}
                  {#if k.erstattbar}<span class="chip" title="Wird erstattet"><RotateCcw size={11} /></span>{/if}
                  {#if k.steuerrelevant}<span class="chip" title="Für die Steuer"><Receipt size={11} /></span>{/if}
                </div>
                {#if k.bezahltVon}<div class="klein">von {k.bezahltVon}</div>{/if}
              </td>
              <td><span class="chip farbig" style="--c:{c.farbe}">{c.name}</span></td>
              <td class="klein">{zahlungsart(k.zahlungsart).name}</td>
              <td>{#if k.status === 'bezahlt'}<span class="chip gruen">bezahlt</span>{:else}<span class="chip gelb">offen</span>{/if}</td>
              <td class="rechts zahlen"><strong>{euro(k.betrag)}</strong></td>
            </tr>
          {/each}
        </tbody>
        <tfoot><tr><td colspan="5" class="klein">Summe{gefiltert.length !== alle.length ? ' (gefiltert)' : ''}</td><td class="rechts zahlen"><strong>{euro(gefiltertSumme)}</strong></td></tr></tfoot>
      </table>
    {:else}
      <div class="leer"><Wallet size={28} /><div>{alle.length ? 'Keine Ausgaben für diesen Filter.' : 'Noch keine Ausgaben erfasst.'}</div></div>
    {/if}
  </div>
</div>

<style>
  .kpis { grid-template-columns: repeat(5, 1fr); }
  .kpis .gross { font-size: 24px; }
  .betrag-feld { position: relative; }
  .betrag-feld input { padding-right: 30px; font-size: 18px; font-weight: 650; }
  .betrag-feld span { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-2); }
  .balken-zeile { display: flex; align-items: center; gap: 12px; border: 0; background: transparent; cursor: pointer; padding: 4px 6px; border-radius: 10px; }
  .balken-zeile:hover, .balken-zeile.an { background: var(--flaeche-2); }
  .b-name { width: 170px; text-align: left; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .b-wert { width: 100px; text-align: right; font-size: 13px; font-weight: 600; }
  tfoot td { background: transparent !important; border: 0 !important; padding-top: 4px; }
  @media (max-width: 1250px) { .kpis { grid-template-columns: repeat(3, 1fr); } }
</style>
