const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')

function createWindow () {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    title: 'OCGAME',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0a0a16',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      backgroundColor: '#0a0a16'
    }
  })

  win.loadFile(path.join(__dirname, 'game', 'index.html'))

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const isFullScreen = process.argv.includes('--fullscreen') || process.argv.includes('-f')
  win.setFullScreen(isFullScreen)

  win.on('closed', () => {})
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})