import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Import consolidated API domains
import {
  accountApi,
  usersApi,
  friendsApi,
  avatarApi,
  inventoryApi,
  catalogApi,
  catalogDatabaseApi,
  gamesApi,
  groupsApi,
  systemApi,
  pinApi,
  installApi,
  netlogApi,
  catalogDbApi,
  authApi,
  rolimonsApi,
  transactionsApi,
  updaterApi,
  newsApi
} from './api'

// Platform info
const platform = {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
  platform: process.platform
}

// Merge all domain APIs into a single api object
const api = {
  ...accountApi,
  ...authApi,
  ...avatarApi,
  ...catalogApi,
  ...catalogDatabaseApi,
  ...catalogDbApi,
  ...friendsApi,
  ...gamesApi,
  ...groupsApi,
  ...inventoryApi,
  ...usersApi,
  ...systemApi,
  ...pinApi,
  ...installApi,
  ...rolimonsApi,
  ...netlogApi,
  ...transactionsApi,
  ...updaterApi,
  ...newsApi
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('platform', platform)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.platform = platform
}
