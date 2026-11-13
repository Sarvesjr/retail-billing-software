const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron,
  onScannerEvent: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('scanner:event', handler);
    return () => ipcRenderer.removeListener('scanner:event', handler);
  }
});

