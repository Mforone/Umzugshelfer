// Standard-Umzugscheckliste. Fälligkeiten relativ zum Umzugstag (Tage).
import { uid, plusTage, heute, jetztIso } from './util.js';

const PUNKTE = [
  { t: 'Alte Wohnung kündigen (Kündigungsfrist prüfen)', k: 'wohnung', d: -90, p: 'hoch' },
  { t: 'Mietvertrag der neuen Wohnung unterschreiben', k: 'wohnung', d: -45, p: 'hoch' },
  { t: 'Freistellung für den Umzugstag klären (Uni / Arbeitgeber)', k: 'behoerden', d: -30, p: 'hoch' },
  { t: 'Transporter oder Umzugsfirma reservieren', k: 'transport', d: -35, p: 'hoch' },
  { t: 'Umzugshelfer fragen und Zeitplan abstimmen', k: 'transport', d: -28 },
  { t: 'Internet & Strom für die neue Wohnung beauftragen', k: 'behoerden', d: -30, p: 'hoch', s: ['Internetanbieter / Umzugsservice', 'Stromanbieter ummelden', 'Zählernummer der neuen Wohnung erfragen'] },
  { t: 'Halteverbotszone beantragen (falls nötig)', k: 'transport', d: -21 },
  { t: 'Kartons, Klebeband & Polstermaterial besorgen', k: 'packen', d: -21 },
  { t: 'Ausmisten: verkaufen, spenden, Sperrmüll anmelden', k: 'packen', d: -21 },
  { t: 'Nachsendeauftrag bei der Post einrichten', k: 'adresse', d: -7 },
  { t: 'Kartons packen und beschriften', k: 'packen', d: -5, s: ['Bücher & Deko', 'Kleidung', 'Küche', 'Bad', 'Kiste „Erste Nacht“ packen'] },
  { t: 'Möbel abbauen & Werkzeug bereitlegen', k: 'packen', d: -1 },
  { t: 'Zählerstände alte Wohnung fotografieren', k: 'wohnung', d: 0, s: ['Strom', 'Wasser', 'Heizung / Gas'] },
  { t: 'Zählerstände neue Wohnung fotografieren', k: 'wohnung', d: 0, s: ['Strom', 'Wasser', 'Heizung / Gas'] },
  { t: 'Wohnungsgeberbestätigung vom Vermieter holen', k: 'behoerden', d: 0, p: 'hoch' },
  { t: 'Übergabe neue Wohnung mit Protokoll (Mängel fotografieren)', k: 'wohnung', d: 0 },
  { t: 'Übergabe alte Wohnung mit Protokoll & Schlüsselrückgabe', k: 'wohnung', d: 3, p: 'hoch' },
  { t: 'Namen an Klingel & Briefkasten anbringen', k: 'wohnung', d: 2 },
  { t: 'Beim Bürgeramt ummelden (Frist: 2 Wochen nach Einzug)', k: 'behoerden', d: 10, p: 'hoch', s: ['Termin buchen', 'Personalausweis mitnehmen', 'Wohnungsgeberbestätigung mitnehmen'] },
  {
    t: 'Neue Adresse überall mitteilen', k: 'adresse', d: 14,
    s: ['Bank', 'Krankenkasse', 'Arbeitgeber / Ausbildungsbetrieb', 'Hochschule', 'Rundfunkbeitrag', 'Versicherungen', 'Handy- & Internetvertrag', 'Online-Shops & PayPal', 'Abos & Mitgliedschaften', 'Ärzte'],
  },
  { t: 'Kaution der alten Wohnung zurückfordern', k: 'finanzen', d: 30 },
  { t: 'Umzugskosten & Belege für die Steuer sammeln', k: 'finanzen', d: 30 },
];

export function vorlageErzeugen(umzugsdatum, mitErinnerung = true, uhrzeit = '09:00') {
  const h = heute();
  return PUNKTE.map((p, i) => {
    let faellig = umzugsdatum ? plusTage(umzugsdatum, p.d) : null;
    if (faellig && faellig < h) faellig = h;
    const erinnerung = mitErinnerung && faellig ? (plusTage(faellig, -1) < h ? null : plusTage(faellig, -1) + 'T' + uhrzeit) : null;
    return {
      id: uid('au'),
      titel: p.t,
      beschreibung: '',
      kategorie: p.k,
      prioritaet: p.p || 'normal',
      faellig,
      uhrzeit: null,
      erinnerung,
      erledigt: false,
      erledigtAm: null,
      unteraufgaben: (p.s || []).map((text) => ({ id: uid('ua'), text, erledigt: false })),
      anhaenge: [],
      erstellt: jetztIso(),
      geaendert: jetztIso(),
      reihenfolge: i,
    };
  });
}
