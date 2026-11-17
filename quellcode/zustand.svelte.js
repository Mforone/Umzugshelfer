// Zentraler Zustand der Oberfläche + Aktionen
import { api } from './api.js';
import { uid, jetztIso, plusTage, heute } from './util.js';

export const app = $state({
  doc: null,
  pfade: null,
  version: '',
  seite: 'uebersicht',
  dateien: [],
  dialog: null, // { typ: 'aufgabe'|'kosten'|'termin'|'notiz'|'kontakt'|'datei', id?, neu? }
  suche: false,
  toasts: [],
  bildUrls: {},
  frage: null, // { text, ok, fn }
  aufgabenPerson: '', // Filter auf der Aufgaben-Seite: '' alle, 'ich', 'keiner' oder Kontakt-ID
});

/** Eigene Rückfrage im Glasdesign statt Windows-Dialog. */
export function bestaetigen(text, ok = 'OK') {
  return new Promise((res) => { app.frage = { text, ok, fn: res }; });
}

// ------------------------------------------------ Toasts
export function toast(text, aktion = null, dauer = 4500) {
  const id = uid('to');
  app.toasts.push({ id, text, aktion });
  setTimeout(() => schliesseToast(id), dauer);
}
export function schliesseToast(id) {
  const i = app.toasts.findIndex((t) => t.id === id);
  if (i >= 0) app.toasts.splice(i, 1);
}

// ------------------------------------------------ Dateien
export async function dateienLaden() {
  app.dateien = await api.dateien.liste();
}

export async function bildUrl(name) {
  if (app.bildUrls[name]) return app.bildUrls[name];
  const u = await api.dateien.url(name);
  app.bildUrls[name] = u;
  return u;
}

/** Dateien aus einem Drop-Ereignis in den Anhang-Ordner kopieren, liefert Namen. */
export async function dropDateien(ev) {
  const files = [...(ev.dataTransfer?.files || [])];
  const pfade = files.map((f) => api.dateien.pfadVon(f)).filter(Boolean);
  if (!pfade.length) return [];
  const namen = await api.dateien.hinzufuegen(pfade);
  await dateienLaden();
  return namen;
}

export async function dateienAuswaehlen() {
  const namen = await api.dateien.auswaehlen();
  await dateienLaden();
  return namen;
}

/** Wo wird eine Datei verwendet? */
export function verwendungen(name) {
  const d = app.doc;
  const out = [];
  for (const a of d.aufgaben) if (a.anhaenge?.includes(name)) out.push({ typ: 'aufgabe', id: a.id, titel: a.titel });
  for (const k of d.kosten) if (k.anhaenge?.includes(name)) out.push({ typ: 'kosten', id: k.id, titel: k.titel });
  for (const n of d.notizen) if (n.anhaenge?.includes(name)) out.push({ typ: 'notiz', id: n.id, titel: n.titel || 'Notiz' });
  for (const t of d.termine) if (t.anhaenge?.includes(name)) out.push({ typ: 'termin', id: t.id, titel: t.titel });
  return out;
}

export function verweiseUmbenennen(alt, neu) {
  for (const liste of [app.doc.aufgaben, app.doc.kosten, app.doc.notizen, app.doc.termine]) {
    for (const x of liste) if (x.anhaenge?.includes(alt)) x.anhaenge = x.anhaenge.map((n) => (n === alt ? neu : n));
  }
}

export function verweiseEntfernen(name) {
  for (const liste of [app.doc.aufgaben, app.doc.kosten, app.doc.notizen, app.doc.termine]) {
    for (const x of liste) if (x.anhaenge?.includes(name)) x.anhaenge = x.anhaenge.filter((n) => n !== name);
  }
}

// ------------------------------------------------ Neue Objekte
export function neueAufgabe(vorgaben = {}) {
  const e = app.doc.einstellungen;
  const a = {
    id: uid('au'), titel: '', beschreibung: '', kategorie: 'sonstiges', prioritaet: 'normal', verantwortlich: null,
    faellig: null, uhrzeit: null, erinnerung: null, erledigt: false, erledigtAm: null,
    unteraufgaben: [], anhaenge: [], erstellt: jetztIso(), geaendert: jetztIso(),
    reihenfolge: app.doc.aufgaben.length,
    ...vorgaben,
  };
  if (a.faellig && !a.erinnerung && e.standardErinnerung) a.erinnerung = standardErinnerung(a.faellig);
  return a;
}

export function standardErinnerung(faellig) {
  const e = app.doc.einstellungen;
  let tag = plusTage(faellig, -1);
  if (tag < heute()) tag = faellig;
  return `${tag}T${e.standardErinnerungUhrzeit || '09:00'}`;
}

export function neueKosten(vorgaben = {}) {
  return {
    id: uid('ko'), titel: '', betrag: 0, datum: heute(), zahlungsart: 'girokarte', kategorie: 'sonstiges',
    status: 'bezahlt', bezahltVon: '', erstattbar: false, steuerrelevant: false, aufgabeId: null,
    anhaenge: [], notiz: '', ...vorgaben,
  };
}

export function neuerTermin(vorgaben = {}) {
  return {
    id: uid('te'), titel: '', datum: heute(), von: '', bis: '', ort: '', beschreibung: '',
    erinnerung: null, farbe: '#7fd3ff', anhaenge: [], ...vorgaben,
  };
}

export function neueNotiz(vorgaben = {}) {
  return {
    id: uid('no'), titel: '', inhalt: '', farbe: '#8ab4ff', angeheftet: false,
    erstellt: jetztIso(), geaendert: jetztIso(), anhaenge: [], ...vorgaben,
  };
}

export function neuerEinkauf(vorgaben = {}) {
  return {
    id: uid('ei'), name: '', menge: '', raum: '', preis: null, link: '', notiz: '', dringend: false,
    gekauft: false, gekauftAm: null, kostenId: null, erstellt: jetztIso(), ...vorgaben,
  };
}

export function neuerKontakt(vorgaben = {}) {
  return { id: uid('kn'), name: '', rolle: '', telefon: '', email: '', notiz: '', ...vorgaben };
}

// ------------------------------------------------ Dialoge
const LISTEN = { aufgabe: 'aufgaben', kosten: 'kosten', termin: 'termine', notiz: 'notizen', kontakt: 'kontakte', karton: 'kartons', einkauf: 'einkaufen' };
export const listeFuer = (typ) => app.doc[LISTEN[typ]];

export function oeffne(typ, id) {
  app.dialog = { typ, id };
}
export function oeffneNeu(typ, vorgaben = {}) {
  const fabrik = { aufgabe: neueAufgabe, kosten: neueKosten, termin: neuerTermin, notiz: neueNotiz, kontakt: neuerKontakt, einkauf: neuerEinkauf }[typ];
  app.dialog = { typ, neu: fabrik(vorgaben) };
}
export function schliesseDialog() {
  app.dialog = null;
}

/** Objekt speichern (neu einfügen oder ersetzen). */
export function uebernehmen(typ, obj) {
  const liste = listeFuer(typ);
  if ('geaendert' in obj) obj.geaendert = jetztIso();
  const i = liste.findIndex((x) => x.id === obj.id);
  if (i >= 0) liste[i] = obj;
  else liste.push(obj);
}

/** Löschen mit Rückgängig-Möglichkeit. */
export function loeschen(typ, id, bezeichnung = 'Eintrag') {
  const liste = listeFuer(typ);
  const i = liste.findIndex((x) => x.id === id);
  if (i < 0) return;
  const [weg] = liste.splice(i, 1);
  const kopie = $state.snapshot(weg);
  toast(`${bezeichnung} gelöscht`, {
    text: 'Rückgängig',
    fn: () => { listeFuer(typ).splice(Math.min(i, listeFuer(typ).length), 0, kopie); },
  });
}

export function aufgabeUmschalten(a) {
  a.erledigt = !a.erledigt;
  a.erledigtAm = a.erledigt ? jetztIso() : null;
  a.geaendert = jetztIso();
  if (a.erledigt) {
    toast(`„${a.titel || 'Aufgabe'}“ erledigt`, { text: 'Rückgängig', fn: () => { a.erledigt = false; a.erledigtAm = null; } }, 3500);
  }
}

// ------------------------------------------------ Laden & Speichern
let speicherTimer = null;
let bereit = false;
export function speichernPlanen() {
  if (!bereit) return;
  clearTimeout(speicherTimer);
  speicherTimer = setTimeout(() => api.speichern($state.snapshot(app.doc)), 250);
}

function ergaenzen(doc) {
  if (!Array.isArray(doc.einkaufen)) doc.einkaufen = [];
  return doc;
}

/** Einkauf abhaken: gekauft → automatisch als Ausgabe erfassen, nicht mehr gekauft → Ausgabe wieder entfernen. */
export function einkaufUmschalten(e) {
  e.gekauft = !e.gekauft;
  e.gekauftAm = e.gekauft ? jetztIso() : null;
  einkaufKostenAbgleichen(e, true);
}

/** Hält die verknüpfte Ausgabe passend zum Gekauft-Status. */
export function einkaufKostenAbgleichen(e, melden = false) {
  const kosten = app.doc.kosten;
  const k = e.kostenId ? kosten.find((x) => x.id === e.kostenId) : null;
  if (e.gekauft) {
    if (k) {
      if (!Number(k.betrag) && Number(e.preis)) k.betrag = Number(e.preis);
      return;
    }
    const neu = einkaufZuKosten(e);
    kosten.push(neu);
    e.kostenId = neu.id;
    if (melden) {
      const text = Number(e.preis)
        ? `„${e.name}“ als Ausgabe erfasst (${euroKurz(e.preis)})`
        : `„${e.name}“ als Ausgabe erfasst – Betrag noch eintragen`;
      toast(text, { text: 'Bearbeiten', fn: () => oeffne('kosten', neu.id) }, 6000);
    }
  } else if (k) {
    const i = kosten.indexOf(k);
    kosten.splice(i, 1);
    e.kostenId = null;
    if (melden) toast(`Ausgabe für „${e.name}“ entfernt`);
  } else {
    e.kostenId = null;
  }
}

function einkaufZuKosten(e) {
  // Zahlungsart der zuletzt hinzugefügten Ausgabe übernehmen
  const letzte = app.doc.kosten[app.doc.kosten.length - 1];
  return neueKosten({
    titel: e.name + (e.menge ? ` (${e.menge})` : ''),
    betrag: Number(e.preis) || 0,
    datum: heute(),
    status: 'bezahlt',
    zahlungsart: letzte?.zahlungsart || 'girokarte',
    kategorie: /werkzeug|material|karton/i.test(e.raum || '') ? 'material' : 'moebel',
    notiz: [e.raum ? 'Einkaufsliste · ' + e.raum : 'Einkaufsliste', e.notiz].filter(Boolean).join(' – '),
  });
}

const euroKurz = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);

/** Für Einträge, die schon vorher als gekauft markiert waren. */
export function einkaufAlsAusgabe(e) {
  e.gekauft = true;
  e.gekauftAm ||= jetztIso();
  einkaufKostenAbgleichen(e, true);
}

export async function start() {
  const r = await api.laden();
  app.doc = ergaenzen(r.doc);
  app.pfade = r.pfade;
  app.version = r.version;
  await dateienLaden();
  api.beiExternerAenderung((doc) => {
    app.doc = ergaenzen(doc);
    toast('Daten wurden von außen aktualisiert');
  });
  api.beiDateiAenderung(() => dateienLaden());
  bereit = true;
}

// ------------------------------------------------ Zuständigkeit
/** Zuständige Person einer Aufgabe: null, { id: 'ich', name: 'Ich' } oder Kontakt. */
export function person(id) {
  if (!id) return null;
  if (id === 'ich') return { id: 'ich', name: 'Ich' };
  return app.doc.kontakte.find((k) => k.id === id) || null;
}
