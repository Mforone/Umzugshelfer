<script>
  import { Truck, Palette, Bell, Monitor, Database, Sparkles, FolderOpen, Download, Info, Moon, Sun, Smartphone, Copy, RefreshCw, Send } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { app, toast, bestaetigen } from './zustand.svelte.js';
  import { api, imBrowser } from './api.js';
  import { AKZENTE, heute } from './util.js';
  import { vorlageErzeugen } from './vorlage.js';

  let e = $derived(app.doc.einstellungen);
  let ntfy = $state(null);
  let erweitert = $state(false);

  onMount(() => {
    api.ntfy?.status().then((x) => (ntfy = x));
    return api.ntfy?.beiStatus((x) => (ntfy = x));
  });

  async function ntfyTest() {
    const r = await api.ntfy.test();
    toast(r.ok ? 'Test ans Handy gesendet' : 'Fehler: ' + r.fehler, null, 6000);
  }
  async function ntfyJetzt() {
    ntfy = await api.ntfy.jetzt();
    toast(ntfy.fehler ? 'Fehler: ' + ntfy.fehler : `${ntfy.geplant} Erinnerung(en) vorgeplant`);
  }
  function kopieren() {
    navigator.clipboard.writeText(e.ntfyKanal);
    toast('Kanalname kopiert');
  }
  function neuerKanal() {
    const zufall = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
    e.ntfyKanal = 'umzug-' + zufall;
    toast('Neuer Kanal – am Handy neu abonnieren');
  }
  const uhr = (iso) => (iso ? new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '–');

  async function vorlage() {
    if (app.doc.aufgaben.length && !(await bestaetigen('Die Standard-Checkliste (~22 Aufgaben) zusätzlich zu deinen vorhandenen Aufgaben hinzufügen?', 'Hinzufügen'))) return;
    const neu = vorlageErzeugen(e.umzugsdatum, e.standardErinnerung, e.standardErinnerungUhrzeit);
    app.doc.aufgaben.push(...neu);
    toast(`${neu.length} Aufgaben hinzugefügt`);
  }

  async function sicherung() {
    const pfad = await api.exportSpeichern({
      dateiname: `Umzugsplaner-Sicherung-${heute()}.json`,
      inhalt: JSON.stringify($state.snapshot(app.doc), null, 2),
      filter: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (pfad) toast('Sicherung gespeichert');
  }

  async function test() {
    const ok = await api.testBenachrichtigung();
    toast(ok ? 'Test-Benachrichtigung gesendet – schau unten rechts' : 'Benachrichtigungen werden hier nicht unterstützt');
  }
</script>

<div class="einst">
  <div class="kachel">
    <div class="kachel-kopf"><Truck size={17} /> Umzug</div>
    <div class="raster" style="grid-template-columns: 200px 1fr 1fr">
      <label class="feld"><span>Umzugsdatum</span><input class="eingabe" type="date" bind:value={e.umzugsdatum} /></label>
      <label class="feld"><span>Alte Adresse</span><input class="eingabe" bind:value={e.alteAdresse} placeholder="Straße, Ort" /></label>
      <label class="feld"><span>Neue Adresse</span><input class="eingabe" bind:value={e.neueAdresse} placeholder="Straße, Ort" /></label>
    </div>
    <div class="zeile" style="margin-top:14px">
      <button class="knopf" onclick={vorlage}><Sparkles size={15} /> Standard-Umzugscheckliste hinzufügen</button>
      <span class="klein blass">Fristen werden aus dem Umzugsdatum berechnet.</span>
    </div>
  </div>

  <div class="kachel">
    <div class="kachel-kopf"><Palette size={17} /> Design</div>
    <div class="optionen">
      <div class="option">
        <div class="wachsen"><strong>Farbschema</strong></div>
        <div class="segment">
          <button class:an={e.thema !== 'hell'} onclick={() => (e.thema = 'dunkel')}><Moon size={13} /> Dunkel</button>
          <button class:an={e.thema === 'hell'} onclick={() => (e.thema = 'hell')}><Sun size={13} /> Hell</button>
        </div>
      </div>
      <div class="option">
        <div class="wachsen"><strong>Glas-Effekt</strong><div class="klein">Hintergrund schemenhaft durchscheinen lassen (Windows 11 Acrylic)</div></div>
        <button class="schalter" class:an={e.glas} onclick={() => (e.glas = !e.glas)} aria-label="Glas"></button>
      </div>
      <div class="option">
        <div class="wachsen"><strong>Deckkraft</strong><div class="klein">Weniger = mehr Durchblick, mehr = ruhiger und besser lesbar</div></div>
        <input type="range" min="0.1" max="0.85" step="0.01" bind:value={e.glasDeckkraft} style="width:220px" />
        <span class="klein zahlen" style="width:40px;text-align:right">{Math.round(e.glasDeckkraft * 100)}%</span>
      </div>
      <div class="option">
        <div class="wachsen"><strong>Akzentfarbe</strong></div>
        {#each AKZENTE as f (f)}
          <button class="farbe" class:an={e.akzent === f} style="--c:{f}" onclick={() => (e.akzent = f)} aria-label={f}></button>
        {/each}
      </div>
      <div class="option">
        <div class="wachsen"><strong>Feiertage im Kalender</strong><div class="klein">Gesetzliche Feiertage in Sachsen</div></div>
        <button class="schalter" class:an={e.feiertage} onclick={() => (e.feiertage = !e.feiertage)} aria-label="Feiertage"></button>
      </div>
    </div>
  </div>

  <div class="kachel">
    <div class="kachel-kopf"><Bell size={17} /> Erinnerungen</div>
    <div class="optionen">
      <div class="option">
        <div class="wachsen"><strong>Automatisch erinnern</strong><div class="klein">Neue Aufgaben mit Fälligkeit bekommen eine Erinnerung am Vortag</div></div>
        <input class="eingabe" type="time" style="width:110px" bind:value={e.standardErinnerungUhrzeit} disabled={!e.standardErinnerung} />
        <button class="schalter" class:an={e.standardErinnerung} onclick={() => (e.standardErinnerung = !e.standardErinnerung)} aria-label="Standard"></button>
      </div>
      <div class="option">
        <div class="wachsen"><strong>Morgendliche Zusammenfassung</strong><div class="klein">Einmal täglich: Was ist heute fällig, was ist überfällig</div></div>
        <input class="eingabe" type="time" style="width:110px" bind:value={e.zusammenfassungUhrzeit} disabled={!e.tageszusammenfassung} />
        <button class="schalter" class:an={e.tageszusammenfassung} onclick={() => (e.tageszusammenfassung = !e.tageszusammenfassung)} aria-label="Zusammenfassung"></button>
      </div>
      <div class="option">
        <div class="wachsen"><strong>Benachrichtigung testen</strong></div>
        <button class="knopf" onclick={test}><Bell size={15} /> Test senden</button>
      </div>
    </div>
  </div>

  <div class="kachel">
    <div class="kachel-kopf"><Smartphone size={17} /> Aufs Handy (ntfy)</div>
    <div class="optionen">
      <div class="option">
        <div class="wachsen"><strong>Erinnerungen ans Handy senden</strong><div class="klein">Werden bis zu 3 Tage im Voraus eingeplant – kommen auch an, wenn der Laptop aus ist</div></div>
        <button class="schalter" class:an={e.ntfyAktiv} onclick={() => (e.ntfyAktiv = !e.ntfyAktiv)} aria-label="ntfy"></button>
      </div>
      <div class="option">
        <div class="wachsen">
          <strong>Dein Kanal</strong><div class="klein">In der ntfy-App abonnieren (Server: {e.ntfyServer?.replace(/^https?:\/\//, '')})</div>
          <div class="kanal">{e.ntfyKanal}</div>
        </div>
        <button class="knopf klein" onclick={kopieren}><Copy size={14} /> Kopieren</button>
      </div>
      <div class="option">
        <div class="wachsen klein">
          {#if ntfy?.fehler}<span style="color:var(--rot)">Fehler: {ntfy.fehler}</span>
          {:else if e.ntfyAktiv}{ntfy?.geplant ?? 0} Nachricht(en) vorgeplant · zuletzt abgeglichen {uhr(ntfy?.letzteSync)}
          {:else}Aus{/if}
        </div>
        <button class="knopf klein" onclick={ntfyJetzt} disabled={!e.ntfyAktiv}><RefreshCw size={14} /> Abgleichen</button>
        <button class="knopf klein" onclick={ntfyTest}><Send size={14} /> Test senden</button>
      </div>
      {#if erweitert}
        <div class="option">
          <label class="feld wachsen"><span>Server</span><input class="eingabe" bind:value={e.ntfyServer} /></label>
          <label class="feld wachsen"><span>Kanalname</span><input class="eingabe" bind:value={e.ntfyKanal} /></label>
          <button class="knopf klein" style="align-self:end" onclick={neuerKanal}>Neu erzeugen</button>
        </div>
      {:else}
        <button class="knopf klein geist" style="align-self:flex-start" onclick={() => (erweitert = true)}>Erweitert …</button>
      {/if}
    </div>
  </div>

  <div class="kachel">
    <div class="kachel-kopf"><Monitor size={17} /> System</div>
    <div class="optionen">
      <div class="option">
        <div class="wachsen"><strong>Im Hintergrund weiterlaufen</strong><div class="klein">Beim Schließen ins Infobereich-Symbol (unten rechts) – nötig, damit Erinnerungen ankommen</div></div>
        <button class="schalter" class:an={e.hintergrund} onclick={() => (e.hintergrund = !e.hintergrund)} aria-label="Hintergrund"></button>
      </div>
      <div class="option">
        <div class="wachsen"><strong>Mit Windows starten</strong><div class="klein">Startet unsichtbar im Infobereich, damit keine Erinnerung verloren geht</div></div>
        <button class="schalter" class:an={e.autostart} onclick={() => (e.autostart = !e.autostart)} aria-label="Autostart"></button>
      </div>
    </div>
  </div>

  <div class="kachel">
    <div class="kachel-kopf"><Database size={17} /> Daten</div>
    <div class="klein" style="line-height:1.6">
      Alles wird lesbar im Projektordner gespeichert – Daten in <code>daten\umzug.json</code>, Dateien in <code>anhaenge\</code>.
      Täglich wird automatisch eine Sicherung angelegt (14 Tage). Änderungen an der Datei von außen werden sofort übernommen.
    </div>
    <div class="zeile umbruch" style="margin-top:12px">
      <button class="knopf" onclick={() => api.dateien.ordner('basis')}><FolderOpen size={15} /> Projektordner</button>
      <button class="knopf" onclick={() => api.dateien.ordner('daten')}><FolderOpen size={15} /> Datenordner</button>
      <button class="knopf" onclick={sicherung}><Download size={15} /> Sicherung exportieren</button>
    </div>
    {#if app.pfade}<div class="klein blass pfad">{app.pfade.basis}</div>{/if}
  </div>

  <div class="kachel">
    <div class="kachel-kopf"><Info size={17} /> Info</div>
    <div class="klein" style="line-height:1.7">
      Umzugsplaner {app.version}{imBrowser ? ' (Vorschau)' : ''} · Design by Mforone · Entwicklung Mforone mit Claude<br />
      Tastenkürzel: <code>Strg+N</code> neue Aufgabe · <code>Strg+K</code> Suche · <code>Strg+1…9</code> Seiten · <code>Strg+Enter</code> im Dialog speichern · <code>Esc</code> schließen
    </div>
  </div>
</div>

<style>
  .einst { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
  .einst > .kachel:first-child { grid-column: span 2; }
  .optionen { display: flex; flex-direction: column; gap: 4px; }
  .option { display: flex; align-items: center; gap: 12px; padding: 9px 6px; border-radius: 12px; }
  .option + .option { border-top: 1px solid var(--rand); border-radius: 0; }
  .farbe { width: 24px; height: 24px; border-radius: 99px; border: 2px solid transparent; background: var(--c); cursor: pointer; }
  .farbe.an { border-color: var(--text); }
  .kanal { font-family: 'Cascadia Code', Consolas, monospace; font-size: 15px; margin-top: 6px; padding: 6px 12px; border-radius: 10px; background: var(--eingabe); display: inline-block; user-select: all; }
  code { background: var(--flaeche-2); padding: 1px 6px; border-radius: 6px; font-size: 12px; }
  .pfad { margin-top: 10px; word-break: break-all; }
  input[type='range'] { accent-color: var(--akzent); }
  @media (max-width: 1150px) { .einst { grid-template-columns: 1fr; } .einst > .kachel:first-child { grid-column: auto; } }
</style>
