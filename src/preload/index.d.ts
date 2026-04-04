import { ElectronAPI } from '@electron-toolkit/preload'

// Duplicate of Account interface from renderer to avoid import issues
export interface Account {
  id: string
  displayName: string
  username: string
  userId: string
  cookie?: string
  status: string
  notes: string
  avatarUrl: string
  lastActive: string
  robuxBalance: number
  friendCount: number
  followerCount: number
  followingCount: number
}

export interface PlatformInfo {
  isMac: boolean
  isWindows: boolean
  isLinux: boolean
  platform: NodeJS.Platform
}

declare global {
  interface Window {
    electron: ElectronAPI
    platform: PlatformInfo
    // api types are defined in renderer/src/window.d.ts
  }
}
