import { ipcMain, BrowserWindow } from 'electron'
import { updaterService } from './UpdaterService'

let handlersRegistered = false

export function registerUpdaterHandlers(mainWindow: BrowserWindow): void {
  updaterService.setMainWindow(mainWindow)

  if (handlersRegistered) {
    return
  }

  handlersRegistered = true

  ipcMain.handle('updater:check', async () => {
    return await updaterService.checkForUpdates()
  })

  ipcMain.handle('updater:download', async () => {
    await updaterService.downloadUpdate()
    return { success: true }
  })

  ipcMain.handle('updater:install', () => {
    updaterService.quitAndInstall()
    return { success: true }
  })

  ipcMain.handle('updater:get-state', () => {
    return updaterService.getState()
  })
}
