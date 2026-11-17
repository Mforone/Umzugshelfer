// Zugriff auf den Hauptprozess. Im normalen Browser (Entwicklung/Vorschau)
// gibt es eine Attrappe, die im localStorage speichert.
import { beispielDaten } from './beispiel.js';

function attrappe() {
  const KEY = 'umzugsplaner-vorschau';
  const dateien = [
    { name: 'Mietvertrag_neu.pdf', groesse: 482113, geaendert: Date.now() - 86400000 * 3 },
    { name: 'Wohnungsgeberbestaetigung.pdf', groesse: 90211, geaendert: Date.now() - 86400000 },
    { name: 'Grundriss.png', groesse: 1203300, geaendert: Date.now() - 86400000 * 6 },
    { name: 'Angebot_Transporter.pdf', groesse: 120400, geaendert: Date.now() - 86400000 * 2 },
  ];
  const leer = () => {};
  return {
    laden: async () => {
      let doc;
      try { doc = JSON.parse(localStorage.getItem(KEY)); } catch { doc = null; }
      return { doc: doc || beispielDaten(), pfade: { basis: 'C:\\…\\Umzugsplaner', daten: 'C:\\…\\daten', anhaenge: 'C:\\…\\anhaenge' }, version: 'vorschau', plattform: 'web' };
    },
    speichern: async (doc) => { try { localStorage.setItem(KEY, JSON.stringify(doc)); } catch { /* */ } return true; },
    dateien: {
      liste: async () => dateien,
      hinzufuegen: async (p) => p.map((x) => String(x).split(/[\\/]/).pop()),
      auswaehlen: async () => [],
      oeffnen: async () => '',
      zeigen: async () => true,
      ordner: async () => '',
      loeschen: async (n) => { const i = dateien.findIndex((d) => d.name === n); if (i >= 0) dateien.splice(i, 1); return true; },
      umbenennen: async (_a, n) => n,
      url: async () => '',
      pfadVon: (f) => f.name,
    },
    exportSpeichern: async () => null,
    testBenachrichtigung: async () => true,
    ntfy: {
      test: async () => ({ ok: true }),
      status: async () => ({ letzteSync: new Date().toISOString(), fehler: null, geplant: 4 }),
      jetzt: async () => ({ letzteSync: new Date().toISOString(), fehler: null, geplant: 4 }),
      beiStatus: () => leer,
    },
    extern: async (u) => window.open(u),
    beiExternerAenderung: () => leer,
    beiDateiAenderung: () => leer,
    beiNavigation: () => leer,
  };
}

export const api = typeof window !== 'undefined' && window.umzug ? window.umzug : attrappe();
export const imBrowser = !(typeof window !== 'undefined' && window.umzug);
