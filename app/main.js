'use strict';
/*
 * Umzugsplaner – Hauptprozess (Electron)
 *
 * Aufgaben dieses Prozesses:
 *  - Daten laden/speichern (daten\umzug.json, lesbares JSON, atomar geschrieben)
 *  - Datei-Überwachung: Änderungen von außen (z. B. durch Claude) werden live übernommen
 *  - Anhänge verwalten (Ordner anhaenge\, flach)
 *  - Erinnerungen / Benachrichtigungen, Tageszusammenfassung
 *  - Infobereich-Symbol (Tray), Autostart, Fenster mit Windows-Acrylic (Glas)
 *
 * Wird von resources\app.asar (Bootstrap) geladen. Änderungen hier wirken nach Neustart.
 */
const {
  app, BrowserWindow, ipcMain, Notification, Tray, Menu, shell, dialog,
  screen, nativeImage, nativeTheme
} = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const APP_ID = 'de.mforone.umzugsplaner';
const APP_NAME = 'Umzugsplaner';
const VERSION = '1.0.0';

// Basisordner = Ordner der Umzugsplaner.exe (oder per Umgebungsvariable für Tests)
const BASIS = process.env.UMZUG_BASIS || path.dirname(process.execPath);
const PFADE = {
  basis: BASIS,
  app: __dirname,
  daten: path.join(BASIS, 'daten'),
  anhaenge: path.join(BASIS, 'anhaenge'),
};
PFADE.datei = path.join(PFADE.daten, 'umzug.json');
PFADE.status = path.join(PFADE.daten, 'status.json');
const ICON = path.join(__dirname, 'icon.ico');
const ICON_PNG = path.join(__dirname, 'icon.png');
const TRAY_ICON = path.join(__dirname, 'tray.png');

const istWindows = process.platform === 'win32';
const versteckt = process.argv.includes('--versteckt');

app.setName(APP_NAME);
if (istWindows) app.setAppUserModelId(APP_ID);

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let fenster = null;
let tray = null;
let beenden = false;
let doc = null;
let status = { gesendet: {}, letzteZusammenfassung: null, fenster: null, hintergrundHinweis: false, ntfy: {} };
let ntfyInfo = { letzteSync: null, fehler: null };
let letzterHash = null;
const benachrichtigungen = new Set();

// ---------------------------------------------------------------- Daten

function jetztIso() { return new Date().toISOString(); }
function hash(text) { return crypto.createHash('sha1').update(text).digest('hex'); }

function standardDaten() {
  return {
    version: 1,
    einstellungen: {
      umzugsdatum: null,
      alteAdresse: '',
      neueAdresse: '',
      budget: 0,
      thema: 'dunkel',
      glas: true,
      glasDeckkraft: 0.42,
      akzent: '#8ab4ff',
      standardErinnerung: true,
      standardErinnerungUhrzeit: '09:00',
      tageszusammenfassung: true,
      zusammenfassungUhrzeit: '08:00',
      hintergrund: true,
      autostart: true,
      feiertage: true,
      ntfyAktiv: false,
      ntfyServer: 'https://ntfy.sh',
      ntfyKanal: '',
    },
    aufgaben: [],
    termine: [],
    kosten: [],
    notizen: [],
    kontakte: [],
    kartons: [],
    einkaufen: [],
  };
}

function normalisieren(d) {
  const s = standardDaten();
  if (!d || typeof d !== 'object') return s;
  const out = { ...s, ...d };
  out.einstellungen = { ...s.einstellungen, ...(d.einstellungen || {}) };
  if (!out.einstellungen.ntfyKanal) out.einstellungen.ntfyKanal = 'umzug-' + crypto.randomBytes(8).toString('hex');
  for (const k of ['aufgaben', 'termine', 'kosten', 'notizen', 'kontakte', 'kartons', 'einkaufen']) {
    out[k] = Array.isArray(d[k]) ? d[k].filter((x) => x && typeof x === 'object') : [];
    for (const item of out[k]) {
      if (!item.id) item.id = k.slice(0, 2) + '_' + crypto.randomBytes(5).toString('hex');
      if (['aufgaben', 'kosten', 'notizen', 'termine'].includes(k) && !Array.isArray(item.anhaenge)) item.anhaenge = [];
      if (k === 'aufgaben' && !Array.isArray(item.unteraufgaben)) item.unteraufgaben = [];
    }
  }
  return out;
}

function ordnerAnlegen() {
  for (const p of [PFADE.daten, PFADE.anhaenge]) fs.mkdirSync(p, { recursive: true });
}

function laden() {
  ordnerAnlegen();
  if (fs.existsSync(PFADE.datei)) {
    const text = fs.readFileSync(PFADE.datei, 'utf8');
    try {
      doc = normalisieren(JSON.parse(text.replace(/^﻿/, '')));
      letzterHash = hash(text);
    } catch (e) {
      // Defekte Datei sichern und letztes Backup verwenden
      const ziel = path.join(PFADE.daten, `umzug.defekt-${Date.now()}.json`);
      fs.copyFileSync(PFADE.datei, ziel);
      const backup = backups()[0];
      doc = backup ? normalisieren(JSON.parse(fs.readFileSync(path.join(PFADE.daten, backup), 'utf8'))) : standardDaten();
      schreiben();
    }
  } else {
    doc = standardDaten();
    schreiben();
  }
  try {
    if (fs.existsSync(PFADE.status)) status = { ...status, ...JSON.parse(fs.readFileSync(PFADE.status, 'utf8')) };
  } catch { /* Status ist nur Komfort */ }
}

function schreiben() {
  const text = JSON.stringify(doc, null, 2);
  const tmp = PFADE.datei + '.tmp';
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, PFADE.datei);
  letzterHash = hash(text);
}

function statusSchreiben() {
  try { fs.writeFileSync(PFADE.status, JSON.stringify(status, null, 2), 'utf8'); } catch { /* egal */ }
}

function backups() {
  try {
    return fs.readdirSync(PFADE.daten).filter((f) => /^backup-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse();
  } catch { return []; }
}

function backupAnlegen() {
  const name = `backup-${tagString(new Date())}.json`;
  const ziel = path.join(PFADE.daten, name);
  if (!fs.existsSync(ziel) && fs.existsSync(PFADE.datei)) fs.copyFileSync(PFADE.datei, ziel);
  for (const alt of backups().slice(14)) fs.rmSync(path.join(PFADE.daten, alt), { force: true });
}

// Änderungen von außen erkennen (Editor, Claude, OneDrive-Sync …)
let watchTimer = null;
function datenUeberwachen() {
  try {
    fs.watch(PFADE.daten, (ereignis, datei) => {
      if (datei && datei !== 'umzug.json') return;
      clearTimeout(watchTimer);
      watchTimer = setTimeout(() => externNeuLaden(0), 300);
    });
  } catch (e) { console.error('Überwachung daten fehlgeschlagen', e); }
  try {
    let t = null;
    fs.watch(PFADE.anhaenge, () => {
      clearTimeout(t);
      t = setTimeout(() => senden('dateien:geaendert'), 300);
    });
  } catch (e) { console.error('Überwachung anhaenge fehlgeschlagen', e); }
  // Neue Oberfläche (ui.js/ui.css/index.html) automatisch laden, z. B. nach einem Update durch Claude
  try {
    let t = null;
    fs.watch(__dirname, (_ereignis, datei) => {
      if (!datei || !/^(ui\.js|ui\.css|index\.html)$/.test(datei)) return;
      clearTimeout(t);
      t = setTimeout(() => { if (fenster && !fenster.isDestroyed()) fenster.webContents.reloadIgnoringCache(); }, 1500);
    });
  } catch (e) { console.error('Überwachung app fehlgeschlagen', e); }
}

function externNeuLaden(versuch) {
  let text;
  try { text = fs.readFileSync(PFADE.datei, 'utf8'); } catch { return; }
  const h = hash(text);
  if (h === letzterHash) return;
  try {
    doc = normalisieren(JSON.parse(text.replace(/^﻿/, '')));
    letzterHash = h;
    senden('daten:extern', doc);
    ntfyPlanen();
  } catch {
    // evtl. noch im Schreibvorgang – später erneut versuchen
    if (versuch < 6) setTimeout(() => externNeuLaden(versuch + 1), 800);
  }
}

function senden(kanal, daten) {
  if (fenster && !fenster.isDestroyed()) fenster.webContents.send(kanal, daten);
}

// ---------------------------------------------------------------- Anhänge

function sichererName(name) {
  const bereinigt = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, ' ').trim() || 'datei';
  return bereinigt.slice(0, 150);
}

function freierName(name) {
  const ext = path.extname(name);
  const stamm = path.basename(name, ext);
  let kandidat = name;
  let i = 2;
  while (fs.existsSync(path.join(PFADE.anhaenge, kandidat))) kandidat = `${stamm} (${i++})${ext}`;
  return kandidat;
}

function dateienKopieren(quellen) {
  const namen = [];
  for (const q of quellen) {
    try {
      if (!q || !fs.statSync(q).isFile()) continue;
      // Liegt die Datei schon im Anhang-Ordner? Dann nur verknüpfen.
      if (path.resolve(path.dirname(q)).toLowerCase() === path.resolve(PFADE.anhaenge).toLowerCase()) {
        namen.push(path.basename(q));
        continue;
      }
      const name = freierName(sichererName(path.basename(q)));
      fs.copyFileSync(q, path.join(PFADE.anhaenge, name));
      namen.push(name);
    } catch (e) { console.error('Kopieren fehlgeschlagen', q, e); }
  }
  return namen;
}

function anhangPfad(name) {
  const p = path.join(PFADE.anhaenge, path.basename(String(name)));
  return p;
}

function dateiListe() {
  try {
    return fs.readdirSync(PFADE.anhaenge, { withFileTypes: true })
      .filter((e) => e.isFile() && !e.name.startsWith('.') && e.name !== 'desktop.ini')
      .map((e) => {
        const st = fs.statSync(path.join(PFADE.anhaenge, e.name));
        return { name: e.name, groesse: st.size, geaendert: st.mtimeMs };
      });
  } catch { return []; }
}

// ---------------------------------------------------------------- Erinnerungen

function tagString(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function uhrString(d) {
  const z = (n) => String(n).padStart(2, '0');
  return `${z(d.getHours())}:${z(d.getMinutes())}`;
}
function lokalesDatum(s) {
  // "2027-01-14T09:00" oder "2027-01-14" -> lokale Zeit
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(s || ''));
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
}
function datumDeutsch(s) {
  const d = lokalesDatum(s);
  if (!d) return '';
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

function benachrichtigen(titel, text, ziel) {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title: titel, body: text, icon: ICON_PNG, silent: false });
  benachrichtigungen.add(n);
  n.on('click', () => {
    fensterZeigen();
    if (ziel) setTimeout(() => senden('navigiere', ziel), 350);
    benachrichtigungen.delete(n);
  });
  n.on('close', () => benachrichtigungen.delete(n));
  n.show();
}

function erinnerungenPruefen() {
  if (!doc) return;
  const jetzt = new Date();
  const faellig = [];
  for (const a of doc.aufgaben) {
    if (a.erledigt || !a.erinnerung) continue;
    const t = lokalesDatum(a.erinnerung);
    const key = `a:${a.id}|${a.erinnerung}`;
    if (t && t <= jetzt && !status.gesendet[key]) faellig.push({ key, typ: 'aufgabe', item: a });
  }
  for (const t of doc.termine) {
    if (!t.erinnerung) continue;
    const zeit = lokalesDatum(t.erinnerung);
    const key = `t:${t.id}|${t.erinnerung}`;
    if (zeit && zeit <= jetzt && !status.gesendet[key]) faellig.push({ key, typ: 'termin', item: t });
  }
  if (faellig.length) {
    if (faellig.length > 3) {
      benachrichtigen(`${faellig.length} Erinnerungen`, faellig.slice(0, 5).map((f) => '• ' + f.item.titel).join('\n'), { seite: 'aufgaben' });
    } else {
      for (const f of faellig) {
        if (f.typ === 'aufgabe') {
          const wann = f.item.faellig ? `Fällig: ${datumDeutsch(f.item.faellig)}${f.item.uhrzeit ? ', ' + f.item.uhrzeit + ' Uhr' : ''}` : 'Erinnerung';
          benachrichtigen(f.item.titel || 'Aufgabe', wann + (f.item.beschreibung ? '\n' + String(f.item.beschreibung).slice(0, 120) : ''), { typ: 'aufgabe', id: f.item.id });
        } else {
          const wann = `${datumDeutsch(f.item.datum)}${f.item.von ? ', ' + f.item.von + ' Uhr' : ''}${f.item.ort ? ' · ' + f.item.ort : ''}`;
          benachrichtigen('Termin: ' + (f.item.titel || ''), wann, { typ: 'termin', id: f.item.id });
        }
      }
    }
    for (const f of faellig) status.gesendet[f.key] = jetztIso();
    statusSchreiben();
  }

  // Tageszusammenfassung
  const e = doc.einstellungen;
  const heute = tagString(jetzt);
  if (e.tageszusammenfassung && status.letzteZusammenfassung !== heute && uhrString(jetzt) >= (e.zusammenfassungUhrzeit || '08:00')) {
    status.letzteZusammenfassung = heute;
    statusSchreiben();
    const offen = doc.aufgaben.filter((a) => !a.erledigt && a.faellig);
    const ueber = offen.filter((a) => a.faellig < heute);
    const heuteF = offen.filter((a) => a.faellig === heute);
    const termineHeute = doc.termine.filter((t) => t.datum === heute);
    const teile = [];
    if (heuteF.length) teile.push(`${heuteF.length} Aufgabe${heuteF.length > 1 ? 'n' : ''} heute fällig`);
    if (ueber.length) teile.push(`${ueber.length} überfällig`);
    if (termineHeute.length) teile.push(`${termineHeute.length} Termin${termineHeute.length > 1 ? 'e' : ''} heute`);
    let text = teile.join(' · ');
    if (e.umzugsdatum) {
      const tage = Math.round((lokalesDatum(e.umzugsdatum) - lokalesDatum(heute)) / 86400000);
      if (tage > 0) text = `Noch ${tage} Tag${tage === 1 ? '' : 'e'} bis zum Umzug. ` + text;
      else if (tage === 0) text = 'Heute ist Umzugstag! ' + text;
    }
    if (teile.length) benachrichtigen('Guten Morgen – dein Umzugsplan', text, { seite: 'uebersicht' });
  }
}


// ---------------------------------------------------------------- Handy (ntfy)
// Erinnerungen werden bis zu ~3 Tage im Voraus bei ntfy eingeplant (Zustellung per "At").
// So kommen sie aufs Handy, auch wenn der Laptop aus ist. Jede Erinnerung hat eine feste
// Sequenz-ID: erneutes Senden ersetzt die geplante Nachricht, DELETE storniert sie.
const NTFY_HORIZONT = (3 * 24 - 1) * 3600 * 1000; // knapp unter dem 3-Tage-Limit

function ntfyBasis() {
  const e = doc.einstellungen;
  const server = String(e.ntfyServer || 'https://ntfy.sh').replace(/\/+$/, '');
  const kanal = String(e.ntfyKanal || '').trim();
  if (!/^[-_A-Za-z0-9]{1,64}$/.test(kanal)) return null;
  return `${server}/${encodeURIComponent(kanal)}`;
}

function kopf(text) {
  return '=?UTF-8?B?' + Buffer.from(String(text), 'utf8').toString('base64') + '?=';
}

async function ntfyPost(seq, { titel, text, zeit, tags, prio }) {
  const basis = ntfyBasis();
  if (!basis) throw new Error('Ungültiger Kanalname');
  const headers = { Title: kopf(titel || 'Umzugsplaner'), Tags: tags || 'package', Priority: String(prio || 3) };
  if (zeit && zeit.getTime() - Date.now() > 15000) headers.At = String(Math.floor(zeit.getTime() / 1000));
  const r = await fetch(seq ? `${basis}/${seq}` : basis, { method: 'POST', headers, body: Buffer.from(text || ' ', 'utf8') });
  if (!r.ok) throw new Error(`ntfy antwortet ${r.status}: ${(await r.text()).slice(0, 160)}`);
}

async function ntfyLoeschen(seq) {
  const basis = ntfyBasis();
  if (!basis) return;
  const r = await fetch(`${basis}/${seq}`, { method: 'DELETE' });
  if (!r.ok && r.status !== 404) throw new Error(`ntfy antwortet ${r.status}`);
}

function ntfyGewuenscht() {
  const liste = [];
  const jetzt = Date.now();
  for (const a of doc.aufgaben) {
    if (a.erledigt || !a.erinnerung) continue;
    const t = lokalesDatum(a.erinnerung);
    if (!t) continue;
    const wann = a.faellig ? `Fällig: ${datumDeutsch(a.faellig)}${a.uhrzeit ? ', ' + a.uhrzeit + ' Uhr' : ''}` : 'Erinnerung';
    liste.push({
      seq: 'a-' + String(a.id).replace(/[^-_A-Za-z0-9]/g, ''), zeit: t, titel: a.titel || 'Aufgabe',
      text: wann + (a.beschreibung ? '\n' + String(a.beschreibung).slice(0, 300) : ''),
      tags: a.prioritaet === 'hoch' ? 'package,warning' : 'package', prio: a.prioritaet === 'hoch' ? 4 : 3,
    });
  }
  for (const te of doc.termine) {
    if (!te.erinnerung) continue;
    const t = lokalesDatum(te.erinnerung);
    if (!t) continue;
    liste.push({
      seq: 't-' + String(te.id).replace(/[^-_A-Za-z0-9]/g, ''), zeit: t, titel: 'Termin: ' + (te.titel || ''),
      text: `${datumDeutsch(te.datum)}${te.von ? ', ' + te.von + ' Uhr' : ''}${te.ort ? ' · ' + te.ort : ''}`, tags: 'calendar', prio: 4,
    });
  }
  // Nächste Morgen-Zusammenfassung (Inhalt nach aktuellem Stand, wird bei jeder Änderung erneuert)
  const e = doc.einstellungen;
  if (e.tageszusammenfassung) {
    const [hh, mm] = String(e.zusammenfassungUhrzeit || '08:00').split(':').map(Number);
    const tag = new Date(); tag.setHours(hh || 0, mm || 0, 0, 0);
    if (tag.getTime() <= jetzt) tag.setDate(tag.getDate() + 1);
    const ts = tagString(tag);
    const offen = doc.aufgaben.filter((a) => !a.erledigt && a.faellig);
    const heuteF = offen.filter((a) => a.faellig === ts);
    const ueber = offen.filter((a) => a.faellig < ts);
    const termine = doc.termine.filter((t) => t.datum === ts);
    const zeilen = [];
    if (e.umzugsdatum) {
      const tage = Math.round((lokalesDatum(e.umzugsdatum) - lokalesDatum(ts)) / 86400000);
      if (tage > 0) zeilen.push(`Noch ${tage} Tag${tage === 1 ? '' : 'e'} bis zum Umzug.`);
      else if (tage === 0) zeilen.push('Heute ist Umzugstag! 🚚');
    }
    for (const a of heuteF.slice(0, 6)) zeilen.push('• ' + a.titel);
    if (ueber.length) zeilen.push(`⚠ ${ueber.length} überfällig`);
    for (const t of termine.slice(0, 3)) zeilen.push(`📅 ${t.von ? t.von + ' ' : ''}${t.titel}`);
    if (heuteF.length || ueber.length || termine.length) {
      liste.push({ seq: 'morgen-' + ts, zeit: tag, titel: 'Guten Morgen – dein Umzugsplan', text: zeilen.join('\n'), tags: 'sunrise', prio: 3 });
    }
  }
  return liste;
}

let ntfyLaeuft = false;
let ntfyNochmal = false;
let ntfyTimer = null;
function ntfyPlanen() {
  clearTimeout(ntfyTimer);
  ntfyTimer = setTimeout(ntfySync, 2500);
}

async function ntfySync() {
  if (!doc) return;
  if (ntfyLaeuft) { ntfyNochmal = true; return; }
  ntfyLaeuft = true;
  const plan = status.ntfy || (status.ntfy = {});
  const jetzt = Date.now();
  try {
    if (!doc.einstellungen.ntfyAktiv) {
      // Abgeschaltet: noch ausstehende Nachrichten stornieren
      for (const [seq, info] of Object.entries(plan)) {
        if (info.zeit > jetzt) { try { await ntfyLoeschen(seq); } catch { /* egal */ } }
        delete plan[seq];
      }
      ntfyInfo.fehler = null;
      return;
    }
    const gewuenscht = ntfyGewuenscht();
    const seqs = new Set(gewuenscht.map((g) => g.seq));
    for (const g of gewuenscht) {
      const t = g.zeit.getTime();
      const h = hash(`${t}|${g.titel}|${g.text}|${g.prio}`);
      const alt = plan[g.seq];
      if (alt && alt.hash === h) continue;
      if (t > jetzt + NTFY_HORIZONT) {
        // Noch zu weit weg – evtl. alte Planung stornieren, später erneut einplanen
        if (alt && alt.zeit > jetzt) { await ntfyLoeschen(g.seq); delete plan[g.seq]; }
        continue;
      }
      if (t < jetzt - 12 * 3600 * 1000) continue; // zu alt fürs Handy
      if (alt && alt.zeit <= jetzt && t <= jetzt) continue; // schon zugestellt, nur Text geändert
      await ntfyPost(g.seq, { ...g, zeit: g.zeit });
      plan[g.seq] = { zeit: t, hash: h };
    }
    for (const [seq, info] of Object.entries(plan)) {
      if (seqs.has(seq)) continue;
      if (info.zeit > jetzt) await ntfyLoeschen(seq); // erledigt, gelöscht oder Erinnerung entfernt
      if (info.zeit > jetzt || info.zeit < jetzt - 7 * 86400000) delete plan[seq];
    }
    ntfyInfo.fehler = null;
  } catch (e) {
    ntfyInfo.fehler = String(e.message || e);
  } finally {
    ntfyInfo.letzteSync = new Date().toISOString();
    statusSchreiben();
    ntfyLaeuft = false;
    senden('ntfy:status', ntfyStatus());
    if (ntfyNochmal) { ntfyNochmal = false; ntfyPlanen(); }
  }
}

function ntfyStatus() {
  const jetzt = Date.now();
  const geplant = Object.values(status.ntfy || {}).filter((i) => i.zeit > jetzt).length;
  return { ...ntfyInfo, geplant };
}

function gesendeteAufraeumen() {
  const grenze = Date.now() - 1000 * 60 * 60 * 24 * 120;
  for (const [k, v] of Object.entries(status.gesendet)) if (Date.parse(v) < grenze) delete status.gesendet[k];
}

// ---------------------------------------------------------------- System

function autostartSetzen(an) {
  if (!istWindows || !app.isPackaged) return;
  app.setLoginItemSettings({ openAtLogin: !!an, path: process.execPath, args: ['--versteckt'] });
}

function startmenueVerknuepfung() {
  // Für Windows-Benachrichtigungen braucht die App eine Startmenü-Verknüpfung mit AppUserModelID
  if (!istWindows) return;
  try {
    const lnk = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', `${APP_NAME}.lnk`);
    const opts = { target: process.execPath, cwd: BASIS, icon: ICON, iconIndex: 0, appUserModelId: APP_ID, description: 'Umzug planen: Aufgaben, Kalender, Kosten' };
    shell.writeShortcutLink(lnk, fs.existsSync(lnk) ? 'replace' : 'create', opts);
    // Vorhandene Desktop-Verknüpfung mit Windows-eigenen Mitteln sauber neu schreiben
    const desktop = path.join(app.getPath('desktop'), `${APP_NAME}.lnk`);
    if (fs.existsSync(desktop)) shell.writeShortcutLink(desktop, 'replace', opts);
  } catch (e) { console.error('Startmenü-Verknüpfung', e); }
}

function designAnwenden() {
  if (!doc) return;
  const e = doc.einstellungen;
  nativeTheme.themeSource = e.thema === 'hell' ? 'light' : 'dark';
  if (fenster && !fenster.isDestroyed() && istWindows) {
    try { fenster.setBackgroundMaterial(e.glas ? 'acrylic' : 'none'); } catch { /* ältere Windows-Version */ }
    try {
      fenster.setTitleBarOverlay({ color: '#00000000', symbolColor: e.thema === 'hell' ? '#1d2433' : '#f2f5ff', height: 44 });
    } catch { /* egal */ }
  }
}

function fensterErstellen() {
  const wa = screen.getPrimaryDisplay().workAreaSize;
  let breite = Math.min(1440, Math.max(1060, Math.round(wa.width * 0.72)));
  let hoehe = Math.min(920, Math.max(700, Math.round(wa.height * 0.82)));
  breite = Math.min(breite, wa.width);
  hoehe = Math.min(hoehe, wa.height);
  const gespeichert = status.fenster;
  const e = doc.einstellungen;

  fenster = new BrowserWindow({
    width: gespeichert?.width || breite,
    height: gespeichert?.height || hoehe,
    x: gespeichert?.x,
    y: gespeichert?.y,
    minWidth: 980,
    minHeight: 640,
    show: false,
    title: APP_NAME,
    icon: ICON,
    backgroundColor: '#00000000',
    backgroundMaterial: istWindows && e.glas ? 'acrylic' : undefined,
    titleBarStyle: 'hidden',
    titleBarOverlay: istWindows ? { color: '#00000000', symbolColor: e.thema === 'hell' ? '#1d2433' : '#f2f5ff', height: 44 } : false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
      spellcheck: true,
    },
  });
  if (gespeichert && !sichtbarAufBildschirm(gespeichert)) fenster.center();
  if (gespeichert?.maximiert) fenster.maximize();
  fenster.setMenuBarVisibility(false);
  fenster.loadFile(path.join(__dirname, 'index.html'));
  fenster.once('ready-to-show', () => { if (!versteckt) fenster.show(); });

  // Strg+R / F5: Oberfläche neu laden
  fenster.webContents.on('before-input-event', (ev, input) => {
    if (input.type === 'keyDown' && (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r'))) {
      ev.preventDefault();
      fenster.webContents.reloadIgnoringCache();
    }
  });
  fenster.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  fenster.webContents.on('will-navigate', (ev, url) => {
    if (!url.startsWith('file:')) { ev.preventDefault(); shell.openExternal(url); }
  });

  const merken = () => {
    if (!fenster || fenster.isDestroyed()) return;
    const max = fenster.isMaximized();
    const b = max ? (status.fenster || fenster.getNormalBounds()) : fenster.getBounds();
    status.fenster = { ...b, maximiert: max };
  };
  fenster.on('resize', merken);
  fenster.on('move', merken);

  fenster.on('close', (ev) => {
    merken();
    statusSchreiben();
    if (!beenden && doc.einstellungen.hintergrund) {
      ev.preventDefault();
      fenster.hide();
      if (!status.hintergrundHinweis) {
        status.hintergrundHinweis = true;
        statusSchreiben();
        benachrichtigen('Umzugsplaner läuft weiter', 'Damit Erinnerungen ankommen, bleibt die App unten rechts im Infobereich. Beenden über das Symbol dort.', null);
      }
    }
  });
  fenster.on('closed', () => { fenster = null; });
}

function sichtbarAufBildschirm(b) {
  return screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return b.x + 100 > a.x && b.y + 50 > a.y && b.x < a.x + a.width - 100 && b.y < a.y + a.height - 50;
  });
}

function fensterZeigen() {
  if (!fenster) fensterErstellen();
  if (fenster.isMinimized()) fenster.restore();
  fenster.show();
  fenster.focus();
}

function trayErstellen() {
  let bild = nativeImage.createFromPath(TRAY_ICON);
  if (bild.isEmpty()) bild = nativeImage.createFromPath(ICON_PNG).resize({ width: 16, height: 16 });
  tray = new Tray(bild);
  tray.setToolTip(APP_NAME);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Umzugsplaner öffnen', click: fensterZeigen },
    { label: 'Neue Aufgabe …', click: () => { fensterZeigen(); setTimeout(() => senden('navigiere', { aktion: 'neueAufgabe' }), 300); } },
    { label: 'Neue Ausgabe …', click: () => { fensterZeigen(); setTimeout(() => senden('navigiere', { aktion: 'neueKosten' }), 300); } },
    { type: 'separator' },
    { label: 'Beenden', click: () => { beenden = true; app.quit(); } },
  ]));
  tray.on('click', fensterZeigen);
  tray.on('double-click', fensterZeigen);
}

// ---------------------------------------------------------------- IPC

ipcMain.handle('daten:laden', () => ({
  doc,
  pfade: PFADE,
  version: VERSION,
  plattform: process.platform,
}));

ipcMain.handle('daten:speichern', (_e, neu) => {
  const vorher = doc.einstellungen;
  doc = normalisieren(neu);
  schreiben();
  const e = doc.einstellungen;
  if (vorher.thema !== e.thema || vorher.glas !== e.glas) designAnwenden();
  if (vorher.autostart !== e.autostart) autostartSetzen(e.autostart);
  ntfyPlanen();
  return true;
});

ipcMain.handle('dateien:liste', () => dateiListe());
ipcMain.handle('dateien:hinzufuegen', (_e, pfade) => dateienKopieren(Array.isArray(pfade) ? pfade : []));
ipcMain.handle('dateien:auswaehlen', async () => {
  const r = await dialog.showOpenDialog(fenster, { title: 'Dateien anhängen', properties: ['openFile', 'multiSelections'] });
  if (r.canceled) return [];
  return dateienKopieren(r.filePaths);
});
ipcMain.handle('dateien:oeffnen', (_e, name) => shell.openPath(anhangPfad(name)));
ipcMain.handle('dateien:zeigen', (_e, name) => { shell.showItemInFolder(anhangPfad(name)); return true; });
ipcMain.handle('dateien:ordner', (_e, welcher) => shell.openPath(welcher === 'daten' ? PFADE.daten : welcher === 'basis' ? PFADE.basis : PFADE.anhaenge));
ipcMain.handle('dateien:loeschen', async (_e, name) => {
  const p = anhangPfad(name);
  if (!fs.existsSync(p)) return true;
  try { await shell.trashItem(p); } catch { fs.rmSync(p, { force: true }); }
  return true;
});
ipcMain.handle('dateien:umbenennen', (_e, alt, neu) => {
  const quelle = anhangPfad(alt);
  let ziel = sichererName(neu);
  if (!path.extname(ziel)) ziel += path.extname(alt);
  if (ziel === alt) return alt;
  ziel = freierName(ziel);
  fs.renameSync(quelle, path.join(PFADE.anhaenge, ziel));
  return ziel;
});
ipcMain.handle('dateien:url', (_e, name) => 'file:///' + anhangPfad(name).replace(/\\/g, '/').replace(/^\/+/, ''));

ipcMain.handle('export:speichern', async (_e, { dateiname, inhalt, filter }) => {
  const r = await dialog.showSaveDialog(fenster, {
    title: 'Exportieren',
    defaultPath: path.join(app.getPath('documents'), dateiname),
    filters: filter || [{ name: 'Alle Dateien', extensions: ['*'] }],
  });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, inhalt, 'utf8');
  return r.filePath;
});

ipcMain.handle('ntfy:test', async () => {
  try {
    await ntfyPost(null, { titel: 'Umzugsplaner verbunden ✅', text: 'Ab jetzt kommen deine Erinnerungen auch aufs Handy. 📦', tags: 'tada', prio: 3 });
    return { ok: true };
  } catch (e) {
    return { ok: false, fehler: String(e.message || e) };
  }
});
ipcMain.handle('ntfy:status', () => ntfyStatus());
ipcMain.handle('ntfy:jetzt', async () => { await ntfySync(); return ntfyStatus(); });

ipcMain.handle('system:testBenachrichtigung', () => {
  benachrichtigen('Test-Benachrichtigung', 'So sehen deine Umzugs-Erinnerungen aus. 📦', { seite: 'einstellungen' });
  return Notification.isSupported();
});
ipcMain.handle('system:extern', (_e, url) => {
  if (/^file:\/\/\//i.test(url)) return shell.openPath(decodeURI(url.slice(8)));
  if (/^(https?:|mailto:|tel:)/i.test(url)) shell.openExternal(url);
  return true;
});

// ---------------------------------------------------------------- Start

app.on('second-instance', () => fensterZeigen());

app.whenReady().then(() => {
  laden();
  backupAnlegen();
  designAnwenden();
  startmenueVerknuepfung();
  autostartSetzen(doc.einstellungen.autostart);
  fensterErstellen();
  trayErstellen();
  datenUeberwachen();
  gesendeteAufraeumen();
  setTimeout(erinnerungenPruefen, 4000);
  setInterval(erinnerungenPruefen, 20000);
  setInterval(backupAnlegen, 1000 * 60 * 60 * 3);
  setTimeout(ntfySync, 6000);
  setInterval(ntfySync, 1000 * 60 * 15);
});

app.on('before-quit', () => { beenden = true; statusSchreiben(); });
app.on('window-all-closed', () => {
  if (!doc?.einstellungen?.hintergrund) app.quit();
});
