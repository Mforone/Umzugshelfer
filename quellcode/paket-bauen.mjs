// Baut die fertige Windows-App nach ../dist/Umzugsplaner
//   npm install
//   npm run paket
// Schritte: Oberfläche bauen (vite) → Electron für Windows laden → überflüssige Sprachen entfernen →
// electron.exe in Umzugsplaner.exe umbenennen, Icon + Versionsinfo setzen → resources/app.asar
// (Bootstrap) erzeugen → Ordner app/ und quellcode/ hineinkopieren.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import extract from 'extract-zip';
import * as asar from '@electron/asar';
import * as ResEdit from 'resedit';
import * as PELibrary from 'pe-library';

const ELECTRON = '45.3.3';
const hier = path.dirname(fileURLToPath(import.meta.url));
const wurzel = path.resolve(hier, '..');
const ziel = path.join(wurzel, 'dist', 'Umzugsplaner');
const cache = path.join(wurzel, 'dist', `electron-v${ELECTRON}-win32-x64.zip`);

fs.mkdirSync(path.dirname(ziel), { recursive: true });
if (!fs.existsSync(cache)) {
  const url = `https://github.com/electron/electron/releases/download/v${ELECTRON}/electron-v${ELECTRON}-win32-x64.zip`;
  console.log('Lade', url);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Download fehlgeschlagen: ${r.status}`);
  fs.writeFileSync(cache, Buffer.from(await r.arrayBuffer()));
}

fs.rmSync(ziel, { recursive: true, force: true });
await extract(cache, { dir: ziel });

// Nur Deutsch und Englisch behalten, Standard-App entfernen
for (const f of fs.readdirSync(path.join(ziel, 'locales'))) {
  if (!['de.pak', 'en-US.pak'].includes(f)) fs.rmSync(path.join(ziel, 'locales', f));
}
fs.rmSync(path.join(ziel, 'resources', 'default_app.asar'), { force: true });

// exe umbenennen, Icon und Versionsinfo setzen
const exe = path.join(ziel, 'Umzugsplaner.exe');
fs.renameSync(path.join(ziel, 'electron.exe'), exe);
const pe = PELibrary.NtExecutable.from(fs.readFileSync(exe), { ignoreCert: true });
const res = PELibrary.NtExecutableResource.from(pe);
const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(wurzel, 'app', 'icon.ico')));
for (const g of ResEdit.Resource.IconGroupEntry.fromEntries(res.entries)) {
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, g.id, g.lang, ico.icons.map((i) => i.data));
}
for (const v of ResEdit.Resource.VersionInfo.fromEntries(res.entries)) {
  for (const l of v.getAllLanguagesForStringValues()) {
    v.setStringValues(l, {
      ProductName: 'Umzugsplaner', FileDescription: 'Umzugsplaner', CompanyName: 'Mforone',
      InternalName: 'Umzugsplaner', OriginalFilename: 'Umzugsplaner.exe', LegalCopyright: 'Mforone',
    });
  }
  v.setFileVersion(1, 0, 0, 0);
  v.setProductVersion(1, 0, 0, 0);
  v.outputToResourceEntries(res.entries);
}
res.outputResource(pe);
fs.writeFileSync(exe, Buffer.from(pe.generate()));

// Bootstrap-asar: startet app/main.js neben der exe
const boot = path.join(wurzel, 'dist', 'boot');
fs.rmSync(boot, { recursive: true, force: true });
fs.mkdirSync(boot, { recursive: true });
fs.copyFileSync(path.join(hier, 'bootstrap-package.json'), path.join(boot, 'package.json'));
fs.copyFileSync(path.join(hier, 'bootstrap-boot.js'), path.join(boot, 'boot.js'));
await asar.createPackage(boot, path.join(ziel, 'resources', 'app.asar'));

// Programm und Quellcode kopieren
fs.cpSync(path.join(wurzel, 'app'), path.join(ziel, 'app'), { recursive: true });
fs.cpSync(hier, path.join(ziel, 'quellcode'), { recursive: true, filter: (q) => !q.includes('node_modules') });
for (const f of ['LIES-MICH.md', 'README.md']) {
  if (fs.existsSync(path.join(wurzel, f))) fs.copyFileSync(path.join(wurzel, f), path.join(ziel, f));
}
console.log('Fertig:', ziel);
