const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('sophron', {
  minimize:   () => ipcRenderer.send('window-minimize'),
  maximize:   () => ipcRenderer.send('window-maximize'),
  fullscreen: () => ipcRenderer.send('window-fullscreen'),
  close:      () => ipcRenderer.send('window-close'),
  loadData:   ()       => ipcRenderer.invoke('data-load'),
  saveData:   (data)   => ipcRenderer.invoke('data-save', data),
  openImage:  ()       => ipcRenderer.invoke('open-image'),
})
