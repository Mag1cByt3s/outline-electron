const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setInstanceUrl: (url) => ipcRenderer.send('set-instance-url', url)
});
