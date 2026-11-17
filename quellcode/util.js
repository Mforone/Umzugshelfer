// Hilfsfunktionen und feste Listen (Kategorien, Zahlungsarten …)

export const AUFGABEN_KATEGORIEN = [
  { id: 'behoerden', name: 'Behörden & Verträge', farbe: '#8ab4ff' },
  { id: 'wohnung', name: 'Wohnung', farbe: '#6fe0c0' },
  { id: 'packen', name: 'Packen & Ausmisten', farbe: '#ffc56e' },
  { id: 'transport', name: 'Transport & Helfer', farbe: '#ff95ab' },
  { id: 'adresse', name: 'Adressänderungen', farbe: '#c3a3ff' },
  { id: 'finanzen', name: 'Finanzen', farbe: '#9be27a' },
  { id: 'sonstiges', name: 'Sonstiges', farbe: '#aab6cc' },
];

export const KOSTEN_KATEGORIEN = [
  { id: 'transport', name: 'Transporter & Umzugsfirma', farbe: '#ff95ab' },
  { id: 'kaution', name: 'Kaution', farbe: '#8ab4ff' },
  { id: 'miete', name: 'Miete & Nebenkosten', farbe: '#6fe0c0' },
  { id: 'moebel', name: 'Möbel & Einrichtung', farbe: '#ffc56e' },
  { id: 'material', name: 'Kartons & Material', farbe: '#f5a46b' },
  { id: 'renovierung', name: 'Renovierung', farbe: '#c3a3ff' },
  { id: 'gebuehren', name: 'Gebühren & Behörden', farbe: '#7fd3ff' },
  { id: 'verpflegung', name: 'Helfer & Verpflegung', farbe: '#9be27a' },
  { id: 'sonstiges', name: 'Sonstiges', farbe: '#aab6cc' },
];

export const ZAHLUNGSARTEN = [
  { id: 'bar', name: 'Bar' },
  { id: 'girokarte', name: 'EC-/Girokarte' },
  { id: 'kreditkarte', name: 'Kreditkarte' },
  { id: 'ueberweisung', name: 'Überweisung' },
  { id: 'paypal', name: 'PayPal' },
  { id: 'lastschrift', name: 'Lastschrift' },
  { id: 'sonstiges', name: 'Sonstiges' },
];

export const PRIORITAETEN = [
  { id: 'hoch', name: 'Hoch', farbe: '#ff7a8a' },
  { id: 'normal', name: 'Normal', farbe: '#8ab4ff' },
  { id: 'niedrig', name: 'Niedrig', farbe: '#9aa6bb' },
];

export const RAEUME = ['Küche', 'Bad', 'Wohnzimmer', 'Schlafzimmer', 'Flur', 'Arbeitszimmer', 'Balkon', 'Keller', 'Werkzeug & Material', 'Sonstiges'];

export const NOTIZ_FARBEN = ['#8ab4ff', '#6fe0c0', '#ffc56e', '#ff95ab', '#c3a3ff', '#9be27a', '#aab6cc'];
export const AKZENTE = ['#8ab4ff', '#6fe0c0', '#c3a3ff', '#ff95ab', '#ffc56e', '#7fd3ff', '#9be27a'];

const finde = (liste, id) => liste.find((x) => x.id === id) || liste[liste.length - 1];
export const aufgabenKategorie = (id) => finde(AUFGABEN_KATEGORIEN, id);
export const kostenKategorie = (id) => finde(KOSTEN_KATEGORIEN, id);
export const zahlungsart = (id) => finde(ZAHLUNGSARTEN, id);
export const prioritaet = (id) => PRIORITAETEN.find((p) => p.id === id) || PRIORITAETEN[1];

export function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export const jetztIso = () => new Date().toISOString();

const z = (n) => String(n).padStart(2, '0');
export function tagString(d) {
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export const heute = () => tagString(new Date());

export function lokal(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(String(s || ''));
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
}

export function plusTage(s, n) {
  const d = lokal(s) || new Date();
  d.setDate(d.getDate() + n);
  return tagString(d);
}

export function tageBis(s) {
  const d = lokal(s);
  if (!d) return null;
  const h = lokal(heute());
  return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - h) / 86400000);
}

export function datumKurz(s) {
  const d = lokal(s);
  return d ? d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
}
export function datumLang(s) {
  const d = lokal(s);
  return d ? d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
}
export function datumMittel(s) {
  const d = lokal(s);
  return d ? d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '';
}
export function zeitpunkt(s) {
  const d = lokal(s);
  if (!d) return '';
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) + ', ' + `${z(d.getHours())}:${z(d.getMinutes())}`;
}

export function relativ(s) {
  const t = tageBis(s);
  if (t === null) return '';
  if (t === 0) return 'heute';
  if (t === 1) return 'morgen';
  if (t === -1) return 'gestern';
  if (t > 1 && t < 7) return `in ${t} Tagen`;
  if (t < -1) return `vor ${-t} Tagen`;
  return datumMittel(s);
}

const euroFormat = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
export const euro = (n) => euroFormat.format(Number(n) || 0);

export function betragLesen(text) {
  if (typeof text === 'number') return text;
  let t = String(text || '').replace(/[€\s]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export function dateigroesse(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
  return (b / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
}

export function dateityp(name) {
  const ext = (String(name).split('.').pop() || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'heic', 'avif'].includes(ext)) return 'bild';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'odt', 'txt', 'md', 'rtf'].includes(ext)) return 'text';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'tabelle';
  if (['zip', '7z', 'rar'].includes(ext)) return 'archiv';
  return 'datei';
}

// Feiertage Sachsen (inkl. Reformationstag, Buß- und Bettag)
function ostersonntag(j) {
  const a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31), tag = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(j, monat - 1, tag);
}
const cache = new Map();
export function feiertage(jahr) {
  if (cache.has(jahr)) return cache.get(jahr);
  const o = ostersonntag(jahr);
  const rel = (n) => { const d = new Date(o); d.setDate(d.getDate() + n); return tagString(d); };
  const bb = new Date(jahr, 10, 22);
  while (bb.getDay() !== 3) bb.setDate(bb.getDate() - 1);
  const liste = {
    [`${jahr}-01-01`]: 'Neujahr',
    [rel(-2)]: 'Karfreitag',
    [rel(1)]: 'Ostermontag',
    [`${jahr}-05-01`]: 'Tag der Arbeit',
    [rel(39)]: 'Christi Himmelfahrt',
    [rel(50)]: 'Pfingstmontag',
    [`${jahr}-10-03`]: 'Tag der Deutschen Einheit',
    [`${jahr}-10-31`]: 'Reformationstag',
    [tagString(bb)]: 'Buß- und Bettag',
    [`${jahr}-12-25`]: '1. Weihnachtstag',
    [`${jahr}-12-26`]: '2. Weihnachtstag',
  };
  cache.set(jahr, liste);
  return liste;
}

export function sortiereNachFaelligkeit(a, b) {
  if (a.erledigt !== b.erledigt) return a.erledigt ? 1 : -1;
  const fa = a.faellig ? a.faellig + (a.uhrzeit || '99:99') : '9999';
  const fb = b.faellig ? b.faellig + (b.uhrzeit || '99:99') : '9999';
  if (fa !== fb) return fa < fb ? -1 : 1;
  const p = { hoch: 0, normal: 1, niedrig: 2 };
  return (p[a.prioritaet] ?? 1) - (p[b.prioritaet] ?? 1);
}

export function csvZelle(v) {
  const s = String(v ?? '');
  return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
