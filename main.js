const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

const DATA_FILE = path.join(app.getPath('userData'), 'sophron-data.json')

const DEFAULT_DATA = {
  tasks: [],
  events: [],
  expenses: [],
  corkboard: { nodes: [], connections: [] },
  flowcharts: { nodes: [], connections: [] },
  settings: { currency: 'MXN', weekStart: 1 }
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    }
  } catch (e) {
    console.error('Error loading data:', e)
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATA))
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch (e) {
    console.error('Error saving data:', e)
    return false
  }
}

function getSavedBounds() {
  try {
    const boundsFile = path.join(app.getPath('userData'), 'window-bounds.json')
    if (fs.existsSync(boundsFile)) {
      const bounds = JSON.parse(fs.readFileSync(boundsFile, 'utf8'))
      // Validate that the saved position is visible on at least one screen
      const { screen } = require('electron')
      const displays = screen.getAllDisplays()
      const visible = displays.some(d => {
        const b = d.bounds
        return bounds.x < b.x + b.width  &&
               bounds.x + bounds.width  > b.x &&
               bounds.y < b.y + b.height &&
               bounds.y + bounds.height > b.y
      })
      if (visible) return bounds
    }
  } catch (e) {}
  return null
}

function saveBounds(win) {
  try {
    const boundsFile = path.join(app.getPath('userData'), 'window-bounds.json')
    fs.writeFileSync(boundsFile, JSON.stringify(win.getBounds()), 'utf8')
  } catch (e) {}
}

function createWindow() {
  const saved = getSavedBounds()

  const win = new BrowserWindow({
    width:  saved ? saved.width  : 1400,
    height: saved ? saved.height : 900,
    x:      saved ? saved.x      : undefined,
    y:      saved ? saved.y      : undefined,
    center: !saved,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    movable: true,
    enableLargerThanScreen: true,
    backgroundColor: '#F8F9FA',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  })

  // Save position/size whenever window moves or resizes
  win.on('moved',   () => saveBounds(win))
  win.on('resized', () => saveBounds(win))

  win.loadFile(path.join(__dirname, 'src', 'index.html'))

  win.once('ready-to-show', () => {
    win.show()
    win.focus()
  })

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  return win
}

app.whenReady().then(() => {
  const win = createWindow()

  ipcMain.on('window-minimize', () => win.minimize())
  ipcMain.on('window-maximize', () => {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.on('window-fullscreen', () => {
    win.setFullScreen(!win.isFullScreen())
  })
  ipcMain.on('window-close', () => win.close())

  ipcMain.handle('data-load', () => loadData())
  ipcMain.handle('data-save', (_, data) => saveData(data))

  ipcMain.handle('open-image', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
    })
    if (!result.canceled && result.filePaths.length > 0) {
      const imgPath = result.filePaths[0]
      const imgData = fs.readFileSync(imgPath)
      const ext = path.extname(imgPath).slice(1).toLowerCase()
      const mime = ext === 'jpg' ? 'jpeg' : ext
      return `data:image/${mime};base64,${imgData.toString('base64')}`
    }
    return null
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
