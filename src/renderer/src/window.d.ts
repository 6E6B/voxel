import { ElectronAPI } from '@electron-toolkit/preload'
import type { WindowApi } from './ipc/windowApi'

interface PlatformInfo {
  isMac: boolean
  isWindows: boolean
  isLinux: boolean
  platform: NodeJS.Platform
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: WindowApi
    platform: PlatformInfo
  }

  interface ViewTransition {
    finished: Promise<void>
    ready: Promise<void>
    updateCallbackDone: Promise<void>
    skipTransition: () => void
    waitUntil?: (callback: () => Promise<unknown> | Promise<unknown>) => void
    types?: string[]
  }

  interface Document {
    startViewTransition?: (updateCallback: () => void | Promise<void>) => ViewTransition
  }
}

export {}
