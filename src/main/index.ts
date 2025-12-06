/// <reference types="electron-vite/node" />
import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import iconIco from '../../resources/build/icons/icon.ico?asset'
import iconIcns from '../../resources/build/icons/icon.icns?asset'

// Lazy imports - these will be loaded after window is shown
let registerRobloxHandlers: typeof import('./modules/core/RobloxHandler').registerRobloxHandlers
let registerStorageHandlers: typeof import('./modules/system/StorageController').registerStorageHandlers
let registerLogsHandlers: typeof import('./modules/system/LogsController').registerLogsHandlers
let registerUpdaterHandlers: typeof import('./modules/updater/UpdaterController').registerUpdaterHandlers
let registerNewsHandlers: typeof import('./modules/news/NewsController').registerNewsHandlers
let storageService: typeof import('./modules/system/StorageService').storageService
let pinService: typeof import('./modules/system/PinService').pinService

// Handle EPIPE errors globally to prevent crashes when writing to closed streams
process.on('uncaughtException', (error) => {
  if (error.message === 'write EPIPE' || (error as any).code === 'EPIPE') {
    return
  }
  console.error('Uncaught exception:', error)
})

function createWindow(): BrowserWindow {
  const defaultWidth = 1400
  const defaultHeight = 900

  // Create the browser window immediately with defaults
  // Window size from storage will be applied after lazy load
  const mainWindow = new BrowserWindow({
    width: defaultWidth,
    height: defaultHeight,
    show: false,
    autoHideMenuBar: true,
    icon: process.platform === 'darwin' ? iconIcns : iconIco,
    backgroundColor: '#111111',
    titleBarStyle: 'hidden',
    ...(process.platform === 'darwin'
      ? {
          trafficLightPosition: { x: 16, y: 16 }
        }
      : {
          titleBarOverlay: {
            color: '#00000000',
            symbolColor: '#ffffff',
            height: 45
          }
        }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Save window size when it's resized (storageService loaded lazily)
  let resizeTimeout: NodeJS.Timeout | null = null
  mainWindow.on('resized', () => {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout)
    }
    resizeTimeout = setTimeout(() => {
      if (storageService) {
        const [width, height] = mainWindow.getSize()
        storageService.setWindowWidth(width)
        storageService.setWindowHeight(height)
      }
    }, 500) // Debounce: save 500ms after resize stops
  })

  mainWindow.on('ready-to-show', () => {
    // Apply saved window size after showing (non-blocking)
    if (storageService) {
      const savedWidth = storageService.getWindowWidth()
      const savedHeight = storageService.getWindowHeight()
      if (savedWidth && savedHeight) {
        mainWindow.setSize(savedWidth, savedHeight, true)
        mainWindow.center()
      }
    }
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.voxel.app')

  // Set the app name for macOS menu bar
  if (process.platform === 'darwin') {
    app.setName('voxel')
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => {})

  // Network interceptor for Roblox Game Join
  // This bypasses net::ERR_BLOCKED_BY_CLIENT when setting Referer in net.request
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://gamejoin.roblox.com/*'] },
    (details, callback) => {
      const headers = { ...details.requestHeaders }

      // Check if we have our custom header indicating the Place ID
      if (headers['X-Roblox-Place-Id']) {
        const placeId = headers['X-Roblox-Place-Id']
        headers['Referer'] = `https://www.roblox.com/games/${placeId}/`
        headers['Origin'] = 'https://www.roblox.com'

        // Remove the custom header so it's not sent to Roblox
        delete headers['X-Roblox-Place-Id']
      }

      callback({ requestHeaders: headers })
    }
  )

  // Lazy load heavy modules after window creation starts
  const loadModules = async () => {
    const [
      robloxHandler,
      storageController,
      logsController,
      updaterController,
      newsController,
      storageModule,
      pinModule
    ] = await Promise.all([
      import('./modules/core/RobloxHandler'),
      import('./modules/system/StorageController'),
      import('./modules/system/LogsController'),
      import('./modules/updater/UpdaterController'),
      import('./modules/news/NewsController'),
      import('./modules/system/StorageService'),
      import('./modules/system/PinService')
    ])

    registerRobloxHandlers = robloxHandler.registerRobloxHandlers
    registerStorageHandlers = storageController.registerStorageHandlers
    registerLogsHandlers = logsController.registerLogsHandlers
    registerUpdaterHandlers = updaterController.registerUpdaterHandlers
    registerNewsHandlers = newsController.registerNewsHandlers
    storageService = storageModule.storageService
    pinService = pinModule.pinService

    return {
      registerRobloxHandlers,
      registerStorageHandlers,
      registerLogsHandlers,
      registerUpdaterHandlers,
      registerNewsHandlers,
      pinService
    }
  }

  // Create window immediately for fast perceived startup
  const mainWindow = createWindow()

  // Load modules in parallel while window is loading
  const loadedModules = await loadModules()

  // Register handlers after modules are loaded
  loadedModules.registerRobloxHandlers()
  loadedModules.registerStorageHandlers()
  loadedModules.registerLogsHandlers()
  loadedModules.registerNewsHandlers()

  // Initialize PIN service (loads persisted lockout state)
  loadedModules.pinService.initialize()

  // Helper for CORS headers
  const UpsertKeyValue = (obj: Record<string, any>, keyToChange: string, value: any) => {
    const keyToChangeLower = keyToChange.toLowerCase()
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase() === keyToChangeLower) {
        obj[key] = value
        return
      }
    }
    obj[keyToChange] = value
  }

  // CORS bypass for Avatar rendering
  const avatarUrls = ['https://thumbnails.roblox.com/*', 'https://*.rbxcdn.com/*']

  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: avatarUrls },
    (details, callback) => {
      const { requestHeaders } = details
      // Using '*' string for request headers as they are Record<string, string>
      UpsertKeyValue(requestHeaders, 'Access-Control-Allow-Origin', '*')
      callback({ requestHeaders })
    }
  )

  session.defaultSession.webRequest.onHeadersReceived({ urls: avatarUrls }, (details, callback) => {
    const { responseHeaders } = details
    if (responseHeaders) {
      UpsertKeyValue(responseHeaders, 'Access-Control-Allow-Origin', ['*'])
      UpsertKeyValue(responseHeaders, 'Access-Control-Allow-Headers', ['*'])
    }
    callback({ responseHeaders })
  })

  // IPC handler to focus and bring window to top (for onboarding)
  ipcMain.handle('focus-window', () => {
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(true)
      mainWindow.focus()
      mainWindow.setAlwaysOnTop(false)
    }
  })

  // Register updater handlers with main window reference
  modules.registerUpdaterHandlers(mainWindow)

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWindow = createWindow()
      modules.registerUpdaterHandlers(newWindow)
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
