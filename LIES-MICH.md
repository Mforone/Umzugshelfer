# Umzugsplaner

Windows-App zum Planen eines Umzugs: Aufgaben mit Fälligkeit, Erinnerungen und Anhängen, Kalender,
Kosten mit Zahlungsart und Summen, Einkaufsliste, Notizen, Kontakte, Kartons und Dateien. Glasdesign (Windows 11 Acrylic).

Start: Verknüpfung „Umzugsplaner“ auf dem Desktop oder `Umzugsplaner.exe` in diesem Ordner.
Beim Schließen läuft die App unten rechts im Infobereich weiter, damit Erinnerungen ankommen
(abschaltbar unter Einstellungen → System). Beenden: Rechtsklick auf das Symbol im Infobereich → Beenden.

## Ordner

| Ordner / Datei | Inhalt |
|---|---|
| `Umzugsplaner.exe` + DLLs, `locales\`, `resources\` | Laufzeit (Electron 45). `resources\app.asar` startet nur `app\main.js`. |
| `app\` | Das eigentliche Programm: `main.js` (Hauptprozess), `preload.js`, gebaute Oberfläche (`index.html`, `ui.js`, `ui.css`), Icons |
| `quellcode\` | Quellcode der Oberfläche (Svelte 5 + Vite), flach in einem Ordner |
| `daten\umzug.json` | **Alle Daten** (lesbares JSON). Wird beim ersten Start angelegt. |
| `daten\status.json` | Technischer Zustand (gesendete Erinnerungen, Fensterposition) |
| `daten\backup-JJJJ-MM-TT.json` | Automatische Tagessicherungen (die letzten 14) |
| `anhaenge\` | Alle angehängten Dateien (flach, ohne Unterordner) |

Alle Ordner sind bewusst flach gehalten (max. eine Ebene unter dem Projektordner).

## Für Claude / KI: so arbeitest du mit der App

Die App überwacht `daten\umzug.json`. **Jede Änderung an der Datei wird sofort live in der laufenden App
übernommen** – du kannst also einfach die JSON-Datei lesen, ändern und zurückschreiben.

- Dateien anhängen: Datei nach `anhaenge\` legen und den **Dateinamen** (ohne Pfad) in das Array
  `anhaenge` des gewünschten Eintrags schreiben. Dateien in `anhaenge\` erscheinen automatisch unter „Dateien“.
- Datei umbenennen/verschieben: Datei umbenennen **und** alle Verweise in `umzug.json` anpassen.
- IDs: beliebiger eindeutiger Text, Konvention `au_…` (Aufgabe), `te_…` (Termin), `ko_…` (Kosten),
  `no_…` (Notiz), `kn_…` (Kontakt), `ka_…` (Karton), `ua_…` (Teilschritt). Fehlende IDs ergänzt die App.
- Datum: `"JJJJ-MM-TT"`, Uhrzeit: `"HH:MM"`, Zeitpunkt (Erinnerung): `"JJJJ-MM-TTTHH:MM"` (lokale Zeit, ohne Zeitzone).
- Beträge: Zahl in Euro mit Punkt (`129.5`).
- Eine Erinnerung wird einmal pro Kombination aus ID + Zeitpunkt gesendet. Neuer Zeitpunkt = neue Erinnerung.
- Fehlende Felder sind okay, die App ergänzt Standardwerte.
- Zuständigkeit: `verantwortlich` einer Aufgabe ist `null` (niemand), `"ich"` oder die `id` eines Kontakts.
- Oberfläche neu laden: Strg+R / F5. Neue `app\ui.js`/`ui.css` werden automatisch geladen; Änderungen an `main.js` brauchen einen Neustart.

### Aufbau von `umzug.json`

```json
{
  "version": 1,
  "einstellungen": {
    "umzugsdatum": "2027-01-15", "alteAdresse": "", "neueAdresse": "", "budget": 2000,
    "thema": "dunkel|hell", "glas": true, "glasDeckkraft": 0.42, "akzent": "#8ab4ff",
    "standardErinnerung": true, "standardErinnerungUhrzeit": "09:00",
    "tageszusammenfassung": true, "zusammenfassungUhrzeit": "08:00",
    "hintergrund": true, "autostart": true, "feiertage": true,
    "ntfyAktiv": false, "ntfyServer": "https://ntfy.sh", "ntfyKanal": "umzug-…"
  },
  "aufgaben": [{
    "id": "au_x1", "titel": "Ummelden", "beschreibung": "Notizen zur Aufgabe",
    "kategorie": "behoerden|wohnung|packen|transport|adresse|finanzen|sonstiges",
    "prioritaet": "hoch|normal|niedrig",
    "verantwortlich": "null | \"ich\" | Kontakt-ID (kn_…)",
    "faellig": "2027-01-20", "uhrzeit": "10:30", "erinnerung": "2027-01-19T09:00",
    "erledigt": false, "erledigtAm": null,
    "unteraufgaben": [{ "id": "ua_1", "text": "Termin buchen", "erledigt": false }],
    "anhaenge": ["Wohnungsgeberbestaetigung.pdf"],
    "erstellt": "ISO-Zeit", "geaendert": "ISO-Zeit", "reihenfolge": 0
  }],
  "termine": [{
    "id": "te_x1", "titel": "Wohnungsübergabe", "datum": "2027-01-15", "von": "10:00", "bis": "11:00",
    "ort": "", "beschreibung": "", "erinnerung": "2027-01-15T08:00", "farbe": "#7fd3ff", "anhaenge": []
  }],
  "kosten": [{
    "id": "ko_x1", "titel": "Transporter", "betrag": 129.0, "datum": "2027-01-14",
    "zahlungsart": "bar|girokarte|kreditkarte|ueberweisung|paypal|lastschrift|sonstiges",
    "kategorie": "transport|kaution|miete|moebel|material|renovierung|gebuehren|verpflegung|sonstiges",
    "status": "bezahlt|offen", "bezahltVon": "", "erstattbar": false, "steuerrelevant": true,
    "aufgabeId": "au_x1 oder null", "anhaenge": ["Rechnung.pdf"], "notiz": ""
  }],
  "notizen": [{ "id": "no_x1", "titel": "", "inhalt": "", "farbe": "#8ab4ff", "angeheftet": false, "erstellt": "", "geaendert": "", "anhaenge": [] }],
  "kontakte": [{ "id": "kn_x1", "name": "", "rolle": "", "telefon": "", "email": "", "notiz": "" }],
  "einkaufen": [{
    "id": "ei_x1", "name": "Handtücher", "menge": "4 Stück", "raum": "Bad", "preis": 24.99, "link": "",
    "notiz": "", "dringend": false, "gekauft": false, "gekauftAm": null, "kostenId": "ko_… oder null"
  }],
  "kartons": [{ "id": "ka_x1", "nummer": 1, "raum": "Küche", "inhalt": "Teller", "zerbrechlich": true, "gepackt": false }]
}
```

## Handy-Benachrichtigungen (ntfy)

Ist `ntfyAktiv` an, plant der Hauptprozess alle Erinnerungen der nächsten ~3 Tage bei ntfy ein
(`POST <server>/<kanal>/<sequenz>` mit Header `At`). Sequenzen: `a-<Aufgaben-ID>`, `t-<Termin-ID>`,
`morgen-JJJJ-MM-TT` (Morgen-Zusammenfassung). Geänderte Erinnerungen ersetzen die geplante Nachricht,
erledigte/gelöschte werden per `DELETE` storniert. Abgleich: beim Start, nach jeder Änderung, alle 15 Minuten.
Geplantes steht in `daten\status.json` unter `ntfy`.

## Programm ändern

- **Hauptprozess** (`app\main.js`, `app\preload.js`): direkt bearbeiten, App neu starten (Infobereich → Beenden, neu öffnen).
- **Oberfläche**: Dateien in `quellcode\` ändern, dann in `quellcode\`:
  `npm install` (einmalig) und `npm run build` → schreibt `index.html`, `ui.js`, `ui.css` nach `app\`.
  Mit `npm run dev` lässt sich die Oberfläche im Browser mit Beispieldaten ansehen.
- `quellcode\bootstrap-*.js(on)` ist der Inhalt von `resources\app.asar`.
- Komplettes Windows-Paket neu bauen: in `quellcode\` `npm run paket` → `dist\Umzugsplaner`
  (lädt Electron, setzt Icon der exe, erzeugt `app.asar`).
- Code auf GitHub: https://github.com/Mforone/Umzugshelfer

Design by Mforone · Entwicklung Mforone mit Claude
