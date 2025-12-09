export type TabId =
  | 'Accounts'
  | 'Profile'
  | 'Friends'
  | 'Groups'
  | 'Games'
  | 'Catalog'
  | 'Inventory'
  | 'Transactions'
  | 'Logs'
  | 'Settings'
  | 'Avatar'
  | 'Install'
  | 'News'
  | 'AccountSettings'

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

export interface Badge {
  id: string
  name: string
  description: string
  imageUrl: string
}

export interface Friend {
  id: string
  accountId: string // The ID of the account this friend belongs to
  displayName: string
  username: string
  userId: string
  avatarUrl: string
  status: AccountStatus
  description: string
  gameActivity?: {
    name: string
    placeId: string
    jobId?: string
  }
}

export enum JoinMethod {
  Username = 'Username',
  PlaceId = 'Place ID',
  JobId = 'Job ID',
  Friend = 'Friend'
}

export interface JoinConfig {
  method: JoinMethod
  target: string
}

export interface Game {
  id: string // This is typically the Universe ID
  universeId: string
  placeId: string // This is the Root Place ID
  name: string
  creatorName: string
  creatorId: string
  creatorType?: string
  playing: number
  visits: number
  maxPlayers: number
  genre: string
  description: string
  likes: number
  dislikes: number
  thumbnailUrl: string
  created: string
  updated: string
  creatorHasVerifiedBadge: boolean
  userVote?: boolean | null
  // Optional metadata (may not always be present from APIs)
  ageRating?: string | null
  supportedDevices?: string[]
  supportsVoiceChat?: boolean | null
  lastServerJobId?: string | null
  friendsPlayingCount?: number | null
}

export interface GameServer {
  id: string
  placeId: string
  playing: number
  maxPlayers: number
  ping: number
  fps: number
  region: string
}

export const DEFAULT_ACCENT_COLOR = '#1e66f5'

export type ThemePreference = 'system' | 'dark' | 'light'

export interface Settings {
  primaryAccountId: string | null
  allowMultipleInstances: boolean
  defaultInstallationPath?: string | null
  accentColor: string
  theme: ThemePreference
  showSidebarProfileCard: boolean
  sidebarTabOrder: TabId[]
  sidebarHiddenTabs: TabId[]
  pinCode: string | null
}

export type AccessoryType =
  | 'Hat'
  | 'Hair'
  | 'Face'
  | 'Neck'
  | 'Shoulder'
  | 'Front'
  | 'Back'
  | 'Waist'
  | 'Gear'

export interface CatalogItem {
  id: string
  name: string
  type: AccessoryType
  imageUrl: string
  price?: number
  creatorName?: string
}

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

export interface CollectionItem {
  id: number
  assetSeoUrl: string
  thumbnail: {
    final: boolean
    url: string
    retryUrl: string | null
    userId: number
    endpointType: string
  }
  name: string
  formatName: string | null
  description: string
  assetRestrictionIcon: {
    tooltipText: string
    cssTag: string
    loadAssetRestrictionIconCss: boolean
    hasTooltip: boolean
  }
  hasPremiumBenefit: boolean
  assetAttribution: any | null
}
