// Nur für die Browser-Vorschau (Entwicklung). Die echte App startet leer.
import { vorlageErzeugen } from './vorlage.js';
import { plusTage, heute, uid, jetztIso } from './util.js';

export function beispielDaten() {
  const umzug = plusTage(heute(), 41);
  const aufgaben = vorlageErzeugen(umzug);
  aufgaben[0].erledigt = true;
  aufgaben[1].erledigt = true;
  aufgaben[1].anhaenge = ['Mietvertrag_neu.pdf'];
  aufgaben[2].faellig = plusTage(heute(), -2);
  aufgaben[3].faellig = heute();
  aufgaben[3].anhaenge = ['Angebot_Transporter.pdf'];
  return {
    version: 1,
    einstellungen: {
      umzugsdatum: umzug, alteAdresse: 'Musterweg 4, Altstadt', neueAdresse: 'Neue Straße 12, Neustadt', budget: 2500,
      thema: 'dunkel', glas: true, glasDeckkraft: 0.42, akzent: '#8ab4ff', standardErinnerung: true, standardErinnerungUhrzeit: '09:00',
      tageszusammenfassung: true, zusammenfassungUhrzeit: '08:00', hintergrund: true, autostart: true, feiertage: true,
      ntfyAktiv: true, ntfyServer: 'https://ntfy.sh', ntfyKanal: 'umzug-3f9a1c7e5b2d4a60',
    },
    aufgaben,
    termine: [
      { id: uid('te'), titel: 'Wohnungsbesichtigung', datum: plusTage(heute(), 3), von: '16:30', bis: '17:30', ort: 'Neustädter Str. 12', beschreibung: '', erinnerung: null, farbe: '#6fe0c0', anhaenge: [] },
      { id: uid('te'), titel: 'Transporter abholen', datum: plusTage(umzug, -1), von: '17:00', bis: '', ort: 'Autovermietung', beschreibung: '', erinnerung: null, farbe: '#ff95ab', anhaenge: [] },
    ],
    kosten: [
      { id: uid('ko'), titel: 'Kaution neue Wohnung', betrag: 1350, datum: plusTage(heute(), -6), zahlungsart: 'ueberweisung', kategorie: 'kaution', status: 'bezahlt', bezahltVon: '', erstattbar: true, steuerrelevant: false, aufgabeId: null, anhaenge: [], notiz: '' },
      { id: uid('ko'), titel: 'Umzugskartons (20 Stk.)', betrag: 39.8, datum: plusTage(heute(), -2), zahlungsart: 'girokarte', kategorie: 'material', status: 'bezahlt', bezahltVon: '', erstattbar: false, steuerrelevant: true, aufgabeId: null, anhaenge: [], notiz: '' },
      { id: uid('ko'), titel: 'Transporter 1 Tag', betrag: 129, datum: plusTage(umzug, -1), zahlungsart: 'kreditkarte', kategorie: 'transport', status: 'offen', bezahltVon: '', erstattbar: false, steuerrelevant: true, aufgabeId: null, anhaenge: ['Angebot_Transporter.pdf'], notiz: 'Inkl. 200 km' },
      { id: uid('ko'), titel: 'Pizza für Helfer', betrag: 48.5, datum: umzug, zahlungsart: 'bar', kategorie: 'verpflegung', status: 'offen', bezahltVon: '', erstattbar: false, steuerrelevant: false, aufgabeId: null, anhaenge: [], notiz: '' },
    ],
    notizen: [
      { id: uid('no'), titel: 'Maße neue Wohnung', inhalt: 'Wohnzimmer: 4,20 × 3,80 m\nSchlafzimmer: 3,50 × 3,10 m\nKüche: Nische 2,40 m', farbe: '#6fe0c0', angeheftet: true, erstellt: jetztIso(), geaendert: jetztIso(), anhaenge: ['Grundriss.png'] },
      { id: uid('no'), titel: 'Noch kaufen', inhalt: '• Duschvorhang\n• Lampen für Flur\n• Fußmatte', farbe: '#ffc56e', angeheftet: false, erstellt: jetztIso(), geaendert: jetztIso(), anhaenge: [] },
    ],
    kontakte: [
      { id: uid('kn'), name: 'Frau Becker', rolle: 'Vermieterin (neu)', telefon: '0351 123456', email: 'becker@example.de', notiz: 'Erreichbar ab 17 Uhr' },
    ],
    kartons: [
      { id: uid('ka'), nummer: 1, raum: 'Küche', inhalt: 'Teller, Gläser', zerbrechlich: true, gepackt: true },
      { id: uid('ka'), nummer: 2, raum: 'Wohnzimmer', inhalt: 'Bücher, Spiele', zerbrechlich: false, gepackt: false },
    ],
  };
}
