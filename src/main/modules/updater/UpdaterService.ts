import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater'
import { BrowserWindow, app } from 'electron'
import log from 'electron-log'
import path from 'path'
import fs from 'fs'

// Configure logging for auto-updater
autoUpdater.logger = log
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

function isUpdateConfigured(): boolean {
  if (!app.isPackaged) {
    const devConfigPath = path.join(process.cwd(), 'dev-app-update.yml')
    return fs.existsSync(devConfigPath)
  }

  const possiblePaths = [
    path.join(process.resourcesPath, 'app-update.yml'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'app-update.yml')
  ]

  return possiblePaths.some((p) => fs.existsSync(p))
}

export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface UpdateState {
  status: UpdateStatus
  info: UpdateInfo | null
  progress: ProgressInfo | null
  error: string | null
}

class UpdaterService {
  private state: UpdateState = {
    status: 'idle',
    info: null,
    progress: null,
    error: null
  }

  private mainWindow: BrowserWindow | null = null

  constructor() {
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    autoUpdater.on('checking-for-update', () => {
      this.updateState({ status: 'checking', error: null })
    })

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      this.updateState({ status: 'available', info, error: null })
    })

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      this.updateState({ status: 'not-available', info, error: null })
    })

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      this.updateState({ status: 'downloading', progress })
    })

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.updateState({ status: 'downloaded', info, progress: null })
    })

    autoUpdater.on('error', (error: Error) => {
      this.updateState({ status: 'error', error: error.message, progress: null })
    })
  }

  private updateState(partial: Partial<UpdateState>): void {
    this.state = { ...this.state, ...partial }
    this.sendStatusToRenderer()
  }

  private sendStatusToRenderer(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('updater:status', this.state)
    }
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  async checkForUpdates(): Promise<UpdateState> {
    if (!isUpdateConfigured()) {
      this.updateState({
        status: 'error',
        error: 'Auto-update is not configured. Please download updates manually from GitHub.'
      })
      return this.state
    }

    try {
      await autoUpdater.checkForUpdates()
      return this.state
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.updateState({ status: 'error', error: errorMessage })
      return this.state
    }
  }

  async downloadUpdate(): Promise<void> {
    if (this.state.status !== 'available') {
      throw new Error('No update available to download')
    }
    await autoUpdater.downloadUpdate()
  }

  quitAndInstall(): void {
    if (this.state.status !== 'downloaded') {
      throw new Error('No update downloaded to install')
    }
    autoUpdater.quitAndInstall()
  }

  getState(): UpdateState {
    return this.state
  }

  // For development/testing - set a custom feed URL
  setFeedURL(url: string): void {
    autoUpdater.setFeedURL({
      provider: 'generic',
      url
    })
  }
}

export const updaterService = new UpdaterService()
