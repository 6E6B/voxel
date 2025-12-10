/// <reference types="electron-vite/node" />
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import iconIco from '../../resources/build/icons/icon.ico?asset'
import iconIcns from '../../resources/build/icons/icon.icns?asset'

const mainStart = performance.now()
const logPerf = (label: string) => {
  const delta = performance.now() - mainStart
  console.log(`[perf:main] ${label} ${delta.toFixed(1)}ms`)
}

let storageService: typeof import('./modules/system/StorageService').storageService

process.on('uncaughtException', (error) => {
  if (error.message === 'write EPIPE' || (error as any).code === 'EPIPE') return
  console.error('Uncaught exception:', error)
})

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    icon: process.platform === 'darwin' ? iconIcns : iconIco,
    backgroundColor: '#111111',
    titleBarStyle: 'hidden',
    ...(process.platform === 'darwin'
      ? { trafficLightPosition: { x: 16, y: 16 } }
      : { titleBarOverlay: { color: '#00000000', symbolColor: '#ffffff', height: 45 } }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Debounce window resize saving
  let resizeTimeout: NodeJS.Timeout | null = null
  mainWindow.on('resized', () => {
    if (resizeTimeout) clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      if (storageService) {
        const [width, height] = mainWindow.getSize()
        storageService.setWindowWidth(width)
        storageService.setWindowHeight(height)
      }
    }, 500)
  })

  mainWindow.on('ready-to-show', () => {
    // Apply saved size non-blocking
    if (storageService) {
      const savedWidth = storageService.getWindowWidth()
      const savedHeight = storageService.getWindowHeight()
      if (savedWidth && savedHeight) {
        mainWindow.setSize(savedWidth, savedHeight, true)
        mainWindow.center()
      }
    }
    mainWindow.show()
    logPerf('ready-to-show')
  })

  mainWindow.webContents.once('dom-ready', () => logPerf('dom-ready'))
  mainWindow.webContents.once('did-finish-load', () => logPerf('did-finish-load'))

  // Standardize console log output from renderer
  mainWindow.webContents.on('console-message', (_event, ...args: any[]) => {
    if (args.length === 1 && typeof args[0] === 'object') {
      const { level = 0, message = '', lineNumber: line = 0, sourceId = '' } = args[0]
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
    } else {
      const [level = 0, message = '', line = 0, sourceId = ''] = args as any[]
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`)
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.voxel.app')
  if (process.platform === 'darwin') app.setName('voxel')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const mainWindow = createWindow()
  logPerf('window-created')

  const loadModules = async () => {
    const modules = await Promise.all([
      import('./modules/core/RobloxHandler'),
      import('./modules/system/StorageController'),
      import('./modules/system/LogsController'),
      import('./modules/updater/UpdaterController'),
      import('./modules/news/NewsController'),
      import('./modules/system/StorageService'),
      import('./modules/system/PinService'),
      import('./modules/discord/DiscordRPCController')
    ])

    return {
      registerRobloxHandlers: modules[0].registerRobloxHandlers,
      registerStorageHandlers: modules[1].registerStorageHandlers,
      registerLogsHandlers: modules[2].registerLogsHandlers,
      registerUpdaterHandlers: modules[3].registerUpdaterHandlers,
      registerNewsHandlers: modules[4].registerNewsHandlers,
      storageService: modules[5].storageService,
      pinService: modules[6].pinService,
      registerDiscordRPCHandlers: modules[7].registerDiscordRPCHandlers
    }
  }

  const loadedModules = await loadModules()

  // Update global references
  storageService = loadedModules.storageService

  logPerf('modules-loaded')

  // Register handlers
  loadedModules.registerRobloxHandlers()
  loadedModules.registerStorageHandlers()
  loadedModules.registerLogsHandlers()
  loadedModules.registerNewsHandlers()
  loadedModules.registerDiscordRPCHandlers()
  loadedModules.pinService.initialize()

  logPerf('handlers-registered')

  ipcMain.handle('focus-window', () => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(true)
      mainWindow.focus()
      mainWindow.setAlwaysOnTop(false)
    }
  })

  loadedModules.registerUpdaterHandlers(mainWindow)

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWindow = createWindow()
      loadedModules.registerUpdaterHandlers(newWindow)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
