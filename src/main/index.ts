/// <reference types="electron-vite/node" />
import { app, BrowserWindow, desktopCapturer, ipcMain, protocol, screen, session, net } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createIPCHandler } from './ipc/createIPCHandler'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { createMainWindow } from './app/create-main-window'
import { appRouter } from './trpc/router'
import { updaterService } from './modules/updater/UpdaterService'
import { pinService } from './modules/system/PinService'
import { storageService as systemStorageService } from './modules/system/StorageService'

const mainStart = performance.now()
const logPerf = (label: string) => {
  const delta = performance.now() - mainStart
  console.log(`[perf:main] ${label} ${delta.toFixed(1)}ms`)
}

process.on('uncaughtException', (error) => {
  if (error.message === 'write EPIPE' || (error as any).code === 'EPIPE') return
  console.error('Uncaught exception:', error)
})

// --- Protocol registration (must be before app.whenReady) ---

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'roavatar-assets',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true
    }
  }
])

// --- App lifecycle ---

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.voxel.app')
  if (process.platform === 'darwin') app.setName('voxel')

  // Protocol handlers
  const roavatarAssetsBase = app.isPackaged
    ? join(process.resourcesPath, 'roavatar-assets')
    : join(app.getAppPath(), 'resources', 'roavatar-assets')

  protocol.handle('roavatar-assets', (request) => {
    const url = new URL(request.url)
    const filePath = join(roavatarAssetsBase, decodeURIComponent(url.pathname))
    return net.fetch(pathToFileURL(filePath).toString())
  })

  // CORS rules for Roblox APIs
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://*.roblox.com/*', 'https://*.rbxcdn.com/*', 'https://*.roblox.cn/*'] },
    (details, callback) => {
      callback({ requestHeaders: details.requestHeaders })
    }
  )

  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['https://*.roblox.com/*', 'https://*.rbxcdn.com/*', 'https://*.roblox.cn/*'] },
    (details, callback) => {
      const responseHeaders = { ...details.responseHeaders }
      for (const key of Object.keys(responseHeaders)) {
        if (key.toLowerCase().startsWith('access-control-')) {
          delete responseHeaders[key]
        }
      }
      const origin = details.referrer ? new URL(details.referrer).origin : 'null'
      responseHeaders['Access-Control-Allow-Origin'] = [origin]
      responseHeaders['Access-Control-Allow-Methods'] = ['GET, POST, PUT, DELETE, PATCH, OPTIONS']
      responseHeaders['Access-Control-Allow-Headers'] = [
        'Content-Type, X-CSRF-TOKEN, Cookie, Roblox-AssetFormat'
      ]
      responseHeaders['Access-Control-Allow-Credentials'] = ['true']

      if (details.method === 'OPTIONS') {
        callback({ responseHeaders, statusLine: 'HTTP/1.1 200 OK' })
      } else {
        callback({ responseHeaders })
      }
    }
  )

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const mainWindow = createMainWindow(() => systemStorageService, logPerf)
  logPerf('window-created')

  updaterService.setMainWindow(mainWindow)
  pinService.initialize()

  const ipcHandler = createIPCHandler({
    router: appRouter,
    windows: [mainWindow],
    createContext: async ({ event }) => ({ event })
  })

  logPerf('handlers-registered')

  // Custom eyedropper: capture the primary screen as a data URL
  ipcMain.handle('eyedropper:capture-screen', async () => {
    try {
      const display = screen.getPrimaryDisplay()
      const { width, height } = display.size
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
      })
      if (sources.length > 0) {
        return sources[0].thumbnail.toDataURL()
      }
      return null
    } catch (error) {
      console.error('[eyedropper] screen capture failed:', error)
      return null
    }
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      const newWindow = createMainWindow(() => systemStorageService, logPerf)
      updaterService.setMainWindow(newWindow)
      ipcHandler.attachWindow(newWindow)
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
