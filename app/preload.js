'use strict';
// Brücke zwischen Oberfläche und Hauptprozess (window.umzug)
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const an = (kanal, cb) => {
  const h = (_e, daten) => cb(daten);
  ipcRenderer.on(kanal, h);
  return () => ipcRenderer.removeListener(kanal, h);
};

contextBridge.exposeInMainWorld('umzug', {
  laden: () => ipcRenderer.invoke('daten:laden'),
  speichern: (doc) => ipcRenderer.invoke('daten:speichern', doc),
  dateien: {
    liste: () => ipcRenderer.invoke('dateien:liste'),
    hinzufuegen: (pfade) => ipcRenderer.invoke('dateien:hinzufuegen', pfade),
    auswaehlen: () => ipcRenderer.invoke('dateien:auswaehlen'),
    oeffnen: (name) => ipcRenderer.invoke('dateien:oeffnen', name),
    zeigen: (name) => ipcRenderer.invoke('dateien:zeigen', name),
    ordner: (welcher) => ipcRenderer.invoke('dateien:ordner', welcher),
    loeschen: (name) => ipcRenderer.invoke('dateien:loeschen', name),
    umbenennen: (alt, neu) => ipcRenderer.invoke('dateien:umbenennen', alt, neu),
    url: (name) => ipcRenderer.invoke('dateien:url', name),
    pfadVon: (file) => { try { return webUtils.getPathForFile(file); } catch { return ''; } },
  },
  exportSpeichern: (opts) => ipcRenderer.invoke('export:speichern', opts),
  testBenachrichtigung: () => ipcRenderer.invoke('system:testBenachrichtigung'),
  ntfy: {
    test: () => ipcRenderer.invoke('ntfy:test'),
    status: () => ipcRenderer.invoke('ntfy:status'),
    jetzt: () => ipcRenderer.invoke('ntfy:jetzt'),
    beiStatus: (cb) => an('ntfy:status', cb),
  },
  extern: (url) => ipcRenderer.invoke('system:extern', url),
  beiExternerAenderung: (cb) => an('daten:extern', cb),
  beiDateiAenderung: (cb) => an('dateien:geaendert', cb),
  beiNavigation: (cb) => an('navigiere', cb),
});
