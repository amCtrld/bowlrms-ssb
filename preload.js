const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  goBack: () => ipcRenderer.send('go-back'),
  goForward: () => ipcRenderer.send('go-forward'),
  goHome: () => ipcRenderer.send('go-home'),
  retryConnection: () => ipcRenderer.send('retry-connection')
})
