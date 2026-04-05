import type {
  Account,
  RecentServerJoin,
  RecentServerType,
  RobloxInstallation,
  TabId,
  ThemePreference,
  TintPreference
} from '@shared/models/app'
import { AccountStatus, BinaryType, DEFAULT_ACCENT_COLOR } from '@shared/models/app'

export type {
  Account,
  RecentServerJoin,
  RecentServerType,
  RobloxInstallation,
  TabId,
  ThemePreference,
  TintPreference
}
export { AccountStatus, BinaryType, DEFAULT_ACCENT_COLOR }

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
  Friend = 'Friend',
  PrivateServer = 'Private Server'
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
  playerTokens: string[]
}

export interface PrivateServer {
  vipServerId: number
  accessCode: string
  name: string
  playing: number
  maxPlayers: number
  ping: number
  fps: number
  owner: {
    id: number
    name: string
    displayName: string
    hasVerifiedBadge?: boolean
  }
}

export interface Settings {
  primaryAccountId: string | null
  allowMultipleInstances: boolean
  defaultInstallationPath?: string | null
  accentColor: string
  useDynamicAccentColor: boolean
  theme: ThemePreference
  tint: TintPreference
  showSidebarProfileCard: boolean
  privacyMode: boolean
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
