import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { exposeElectronTRPC } from 'electron-trpc/main'
import { ipcApi } from './api'

// Platform info
const platform = {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
  platform: process.platform
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    exposeElectronTRPC()
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('ipcApi', ipcApi)
    contextBridge.exposeInMainWorld('platform', platform)
  } catch (error) {
    console.error(error)
  }
} else {
  // In non-context-isolated mode, assign directly to window
  ; (window as any).electron = electronAPI
    ; (window as any).ipcApi = ipcApi
    ; (window as any).platform = platform
}
