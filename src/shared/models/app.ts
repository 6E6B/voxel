export type TabId =
    | 'Accounts'
    | 'Profile'
    | 'Friends'
    | 'Groups'
    | 'Games'
    | 'Catalog'
    | 'Inventory'
    | 'Transactions'
    | 'Settings'
    | 'Avatar'
    | 'Install'

export enum AccountStatus {
    Online = 'Online',
    Offline = 'Offline',
    InGame = 'In-Game',
    InStudio = 'In Studio',
    Banned = 'Banned'
}

export interface Account {
    id: string
    displayName: string
    username: string
    userId: string
    cookie?: string
    status: AccountStatus
    notes: string
    avatarUrl: string
    lastActive: string
    robuxBalance: number
    friendCount: number
    followerCount: number
    followingCount: number
    isPremium?: boolean
    isAdmin?: boolean
    joinDate?: string
    placeVisits?: number
    totalFavorites?: number
    concurrentPlayers?: number
    groupMemberCount?: number
}

export const DEFAULT_ACCENT_COLOR = '#2994C9'

export type TintPreference = 'neutral' | 'cool'

export type ThemePreference = 'system' | 'dark' | 'light'

export enum BinaryType {
    WindowsPlayer = 'WindowsPlayer',
    WindowsStudio = 'WindowsStudio',
    MacPlayer = 'MacPlayer',
    MacStudio = 'MacStudio'
}

export interface RobloxInstallation {
    id: string
    name: string
    binaryType: BinaryType
    version: string
    channel: string
    path: string
    lastUpdated: string
    status: 'Ready' | 'Updating' | 'Error'
}