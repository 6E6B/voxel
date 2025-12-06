import type { Account } from '../types'
import type {
  AccountStats,
  AvatarState,
  CaptchaResponse,
  CursorResult,
  DeployHistory,
  DetailedStats,
  ExtendedUserDetails,
  FavoriteItem,
  FFlags,
  FriendStats,
  InventoryPage,
  OutfitCollection,
  OutfitDetails,
  Presence,
  BatchAccountStatus,
  QuickLoginCode,
  QuickLoginStatus,
  RegionLookup,
  SettingsPatch,
  SettingsSnapshot,
  SuccessResponse,
  ThumbnailBatch,
  UpdateCheck,
  UpdateOutfitResult,
  UserSummary,
  WearingAssetsResult,
  ServerPage,
  UserPreview,
  UsernameHistory,
  UserGroupRole,
  LogMetadata,
  GamePassesResponse,
  GroupWallPostsResponse,
  GroupMembersResponse,
  GroupStoreResponse,
  TransactionTypes,
  TransactionsResponse,
  TransactionTypeEnum,
  UpdateState,
  UpdateActionResult,
  UserProfileResponse
} from '../../../shared/ipc-schemas/index'

export interface AccountApi {
  validateCookie: (cookie: string) => Promise<UserSummary>
  getAvatarUrl: (userId: string) => Promise<string>
  getBatchUserAvatars: (userIds: number[], size?: string) => Promise<Record<number, string | null>>
  getAssetContent: (url: string) => Promise<string>
  fetchAccountStats: (cookie: string) => Promise<AccountStats>
  getAccountStatus: (cookie: string) => Promise<Presence | null>
  getBatchAccountStatuses: (cookies: string[]) => Promise<BatchAccountStatus>
  getUserPresence: (cookie: string, userId: number) => Promise<Presence | null>
  getAccounts: () => Promise<Account[]>
  saveAccounts: (accounts: Account[]) => Promise<void>
  fetchFriendStats: (cookie: string, userId: string) => Promise<FriendStats>
  getExtendedUserDetails: (cookie: string, userId: number) => Promise<ExtendedUserDetails>
  getDetailedStats: (cookie: string, userId: number) => Promise<DetailedStats>
  getCurrentAvatar: (cookie: string, userId?: number) => Promise<AvatarState>
  setWearingAssets: (
    cookie: string,
    assets: Array<{
      id: number
      name: string
      assetType: { id: number; name: string }
      currentVersionId?: number
      meta?: { order?: number; puffiness?: number; version?: number }
    }>
  ) => Promise<WearingAssetsResult>
  renderAvatarPreview: (
    cookie: string,
    userId: number,
    assetId: number
  ) => Promise<{ imageUrl: string }>
  openRobloxLoginWindow: () => Promise<string>
}

export interface FavoritesApi {
  getFavoriteGames: () => Promise<string[]>
  addFavoriteGame: (placeId: string) => Promise<void>
  removeFavoriteGame: (placeId: string) => Promise<void>
  getFavoriteItems: () => Promise<FavoriteItem[]>
  addFavoriteItem: (item: FavoriteItem) => Promise<void>
  removeFavoriteItem: (itemId: number) => Promise<void>
}

export interface SettingsApi {
  // Window control
  focusWindow: () => Promise<void>

  getSidebarWidth: () => Promise<number | undefined>
  setSidebarWidth: (width: number) => Promise<void>
  getSidebarCollapsed: () => Promise<boolean>
  setSidebarCollapsed: (collapsed: boolean) => Promise<void>
  getAccountsViewMode: () => Promise<'list' | 'grid'>
  setAccountsViewMode: (mode: 'list' | 'grid') => Promise<void>
  getAvatarRenderWidth: () => Promise<number | undefined>
  setAvatarRenderWidth: (width: number) => Promise<void>
  getSettings: () => Promise<SettingsSnapshot>
  setSettings: (settings: SettingsPatch) => Promise<void>
  getExcludeFullGames: () => Promise<boolean>
  setExcludeFullGames: (excludeFullGames: boolean) => Promise<void>
  // Custom Fonts
  getCustomFonts: () => Promise<{ family: string; url: string }[]>
  addCustomFont: (font: { family: string; url: string }) => Promise<void>
  removeCustomFont: (family: string) => Promise<void>
  getActiveFont: () => Promise<string | null>
  setActiveFont: (family: string | null) => Promise<void>
  // Secure PIN verification - auth state managed in main process
  verifyPin: (pin: string) => Promise<{
    success: boolean
    locked: boolean
    remainingAttempts: number
    lockoutSeconds?: number
  }>
  // Check if PIN is currently verified in main process
  isPinVerified: () => Promise<boolean>
  // Set PIN - requires current PIN if one is already set (security)
  setPin: (
    newPin: string | null,
    currentPin?: string
  ) => Promise<{
    success: boolean
    error?: string
    locked?: boolean
    lockoutSeconds?: number
    remainingAttempts?: number
  }>
  getPinLockoutStatus: () => Promise<{
    locked: boolean
    lockoutSeconds?: number
    remainingAttempts: number
  }>
}

export interface SocialApi {
  getFriends: (
    cookie: string,
    targetUserId?: number,
    forceRefresh?: boolean
  ) => Promise<UserPreview[]>
  getFriendsPaged: (
    cookie: string,
    targetUserId: number,
    cursor?: string
  ) => Promise<CursorResult<UserPreview>>
  getFriendsStatuses: (cookie: string, userIds: number[]) => Promise<Presence[]>
  getFollowers: (
    cookie: string,
    targetUserId: number,
    cursor?: string
  ) => Promise<CursorResult<UserPreview>>
  getFollowings: (
    cookie: string,
    targetUserId: number,
    cursor?: string
  ) => Promise<CursorResult<UserPreview>>
  getFriendRequests: (cookie: string) => Promise<UserPreview[]>
  sendFriendRequest: (cookie: string, targetUserId: number) => Promise<CaptchaResponse>
  acceptFriendRequest: (cookie: string, requesterUserId: number) => Promise<SuccessResponse>
  declineFriendRequest: (cookie: string, requesterUserId: number) => Promise<SuccessResponse>
  unfriend: (cookie: string, targetUserId: number) => Promise<SuccessResponse>
  blockUser: (cookie: string, targetUserId: number) => Promise<SuccessResponse>
  getUserByUsername: (username: string) => Promise<UserSummary | null>
  getUserGroups: (userId: number) => Promise<UserGroupRole[]>
}

export interface GamesApi {
  getGameSorts: (sessionId?: string) => Promise<any[]>
  getGamesInSort: (sortId: string, sessionId?: string) => Promise<any[]>
  getGamesByPlaceIds: (placeIds: string[]) => Promise<any[]>
  getGamesByUniverseIds: (universeIds: number[]) => Promise<any[]>
  searchGames: (query: string, sessionId?: string) => Promise<any[]>
  launchGame: (
    cookie: string,
    placeId: string | number,
    jobId?: string,
    friendId?: string | number,
    installPath?: string
  ) => Promise<SuccessResponse>
  generateQuickLoginCode: () => Promise<QuickLoginCode>
  checkQuickLoginStatus: (code: string, privateKey: string) => Promise<QuickLoginStatus>
  completeQuickLogin: (code: string, privateKey: string) => Promise<string>
  getGameServers: (
    placeId: string | number,
    cursor?: string,
    limit?: number,
    sortOrder?: 'Asc' | 'Desc',
    excludeFullGames?: boolean
  ) => Promise<ServerPage>
  getServerRegion: (placeId: string | number, serverId: string) => Promise<string>
  getJoinScript: (placeId: string | number, serverId: string) => Promise<any>
  getServerQueuePosition: (placeId: string | number, serverId: string) => Promise<number | null>
  getRegionFromAddress: (address: string) => Promise<string>
  getRegionsBatch: (addresses: string[]) => Promise<RegionLookup>
  getGameThumbnail16x9: (universeId: number) => Promise<string[]>
  getGameSocialLinks: (universeId: number) => Promise<any[]>
  voteOnGame: (universeId: number, vote: boolean) => Promise<any>
  getGamePasses: (universeId: number) => Promise<GamePassesResponse>
  saveGameImage: (
    imageUrl: string,
    gameName: string
  ) => Promise<{ success: boolean; canceled?: boolean; path?: string }>
}

export interface AvatarScales {
  height: number
  width: number
  head: number
  proportion: number
  bodyType: number
}

export interface AvatarApi {
  getBatchThumbnails: (
    targetIds: number[],
    type?: 'Asset' | 'Outfit' | 'BadgeIcon' | 'GroupIcon'
  ) => Promise<ThumbnailBatch>
  getUserOutfits: (
    cookie: string,
    userId: number,
    isEditable: boolean,
    page: number
  ) => Promise<OutfitCollection>
  wearOutfit: (cookie: string, outfitId: number) => Promise<SuccessResponse>
  setBodyColors: (cookie: string, bodyColors: any) => Promise<SuccessResponse>
  setAvatarScales: (cookie: string, scales: AvatarScales) => Promise<SuccessResponse>
  setPlayerAvatarType: (cookie: string, playerAvatarType: 'R6' | 'R15') => Promise<SuccessResponse>
  updateOutfit: (cookie: string, outfitId: number, details: any) => Promise<UpdateOutfitResult>
  getOutfitDetails: (cookie: string, outfitId: number) => Promise<OutfitDetails>
  deleteOutfit: (cookie: string, outfitId: number) => Promise<SuccessResponse>
  purchaseLimitedItem: (
    cookie: string,
    collectibleItemInstanceId: string,
    expectedPrice: number,
    sellerId: number,
    collectibleProductId: string
  ) => Promise<any>
  purchaseCatalogItem: (
    cookie: string,
    collectibleItemId: string,
    expectedPrice: number,
    expectedSellerId: number,
    collectibleProductId?: string,
    expectedPurchaserId?: string,
    idempotencyKey?: string
  ) => Promise<any>
  getAssetHierarchy: (assetId: number) => Promise<any>
  // 3D Manifest APIs - authenticated
  getAvatar3DManifest: (
    cookie: string,
    userId: number | string
  ) => Promise<{ imageUrl: string; state: string }>
  getAsset3DManifest: (cookie: string, assetId: number | string) => Promise<{ imageUrl: string }>
}

export interface InventoryApi {
  getInventory: (
    cookie: string,
    userId: number,
    assetTypeId: number,
    cursor?: string
  ) => Promise<InventoryPage>
  getInventoryV2: (
    cookie: string,
    userId: number,
    assetTypes: string[],
    cursor?: string,
    limit?: number,
    sortOrder?: 'Asc' | 'Desc'
  ) => Promise<InventoryPage>
  getRobloxBadges: (cookie: string, userId: number) => Promise<any[]>
  getPlayerBadges: (cookie: string, userId: number) => Promise<any>
  getCollectibles: (cookie: string, userId: number) => Promise<any>
  getPastUsernames: (cookie: string, userId: number) => Promise<UsernameHistory>
  getUserProfile: (cookie: string, userId: number) => Promise<UserProfileResponse>
  checkAssetOwnership: (
    cookie: string,
    userId: number,
    assetId: number,
    itemType?: string
  ) => Promise<boolean>
}

export interface LogsApi {
  getLogs: () => Promise<LogMetadata[]>
  getLogContent: (filename: string) => Promise<string>
  deleteLog: (filename: string) => Promise<boolean>
  deleteAllLogs: () => Promise<boolean>
  openLogFile: (filename: string) => Promise<boolean>
}

export interface DeployApi {
  getDeployHistory: () => Promise<DeployHistory>
}

export interface InstallationsApi {
  installRobloxVersion: (
    binaryType: string,
    version: string,
    installPath?: string
  ) => Promise<string | null>
  launchRobloxInstall: (installPath: string) => Promise<void>
  uninstallRobloxVersion: (installPath: string) => Promise<void>
  openRobloxFolder: (installPath: string) => Promise<void>
  checkForUpdates: (binaryType: string, currentVersionHash: string) => Promise<UpdateCheck>
  verifyRobloxFiles: (binaryType: string, version: string, installPath: string) => Promise<boolean>
  setActiveInstall: (installPath: string) => Promise<void>
  removeActiveInstall: () => Promise<void>
  getActiveInstallPath: () => Promise<string | null>
}

export interface FlagsApi {
  getFFlags: (installPath: string) => Promise<FFlags>
  setFFlags: (installPath: string, flags: FFlags) => Promise<void>
}

// Rolimons API response types
export interface RolimonsItemDetails {
  success: boolean
  item_count: number
  items: Record<string, (string | number)[]>
}

export interface RolimonsPlayerData {
  name?: string
  value?: number | null
  rap?: number | null
  rank?: number | null
  premium?: boolean
  privacy_enabled?: boolean
  terminated?: boolean
  stats_updated?: number | null
  last_online?: number | null
  last_location?: string
  rolibadges?: Record<string, number>
}

export interface RolimonsItemPageData {
  itemDetails: {
    item_id?: number | null
    item_name?: string | null
    asset_type_id?: number | null
    original_price?: number | null
    created?: number | null
    first_timestamp?: number | null
    best_price?: number | null
    favorited?: number | null
    num_sellers?: number | null
    rap?: number | null
    owners?: number | null
    bc_owners?: number | null
    copies?: number | null
    deleted_copies?: number | null
    bc_copies?: number | null
    hoarded_copies?: number | null
    acronym?: string | null
    valuation_method?: string | null
    value?: number | null
    demand?: number | null
    trend?: number | null
    projected?: number | null
    hyped?: number | null
    rare?: number | null
    thumbnail_url_lg?: string | null
  } | null
  historyData: {
    num_points?: number | null
    timestamp?: number[] | null
    favorited?: number[] | null
    rap?: number[] | null
    best_price?: number[] | null
    num_sellers?: number[] | null
  } | null
  salesData: {
    num_points?: number | null
    timestamp?: number[] | null
    avg_daily_sales_price?: number[] | null
    sales_volume?: number[] | null
  } | null
  ownershipData: {
    id?: number | null
    num_points?: number | null
    timestamps?: number[] | null
    owners?: number[] | null
    bc_owners?: number[] | null
    copies?: number[] | null
    deleted_copies?: number[] | null
    bc_copies?: number[] | null
    hoarded_copies?: number[] | null
  } | null
  hoardsData: {
    num_hoards?: number | null
    owner_ids?: string[] | null
    owner_names?: string[] | null
    quantities?: number[] | null
  } | null
  valueChanges: (number | string | boolean | null)[][] | null
}

export interface RolimonsApi {
  getRolimonsItemDetails: () => Promise<RolimonsItemDetails>
  getRolimonsPlayer: (userId: number) => Promise<RolimonsPlayerData>
  getRolimonsItemPage: (itemId: number) => Promise<RolimonsItemPageData>
}

export interface NetLogApi {
  getNetLogStatus: () => Promise<{ isLogging: boolean; logPath: string | null }>
  getNetLogPath: () => Promise<string>
  stopNetLog: () => Promise<{ success: boolean; message: string }>
  startNetLog: () => Promise<{ success: boolean; message: string; path?: string }>
}

export interface CatalogSearchItem {
  id: number
  itemType: string
  assetType?: number
  name: string
  description?: string | null
  creatorName?: string
  creatorTargetId?: number
  creatorHasVerifiedBadge?: boolean
  price?: number | null
  lowestPrice?: number | null
  lowestResalePrice?: number | null
  priceStatus?: string
  favoriteCount?: number
  collectibleItemId?: string | null
  totalQuantity?: number
  hasResellers?: boolean
  isOffSale?: boolean
  itemStatus?: string[]
  itemRestrictions?: string[]
}

export interface CatalogSearchResponse {
  keyword?: string
  previousPageCursor?: string | null
  nextPageCursor?: string | null
  data: CatalogSearchItem[]
}

export interface CatalogCategory {
  category: string
  taxonomy: string
  assetTypeIds: number[]
  bundleTypeIds: number[]
  categoryId: number
  name: string
  orderIndex: number
  subcategories: CatalogSubcategory[]
  isSearchable: boolean
}

export interface CatalogSubcategory {
  subcategory: string
  taxonomy: string
  assetTypeIds: number[]
  bundleTypeIds: number[]
  subcategoryId: number
  name: string
  shortName?: string | null
}

export interface CatalogItemsSearchParams {
  keyword?: string
  taxonomy?: string
  subcategory?: string
  sortType?: number
  sortAggregation?: number
  salesTypeFilter?: number
  minPrice?: number
  maxPrice?: number
  creatorName?: string
  creatorType?: string
  limit?: number
  cursor?: string
  includeNotForSale?: boolean
  cookie?: string // Optional cookie for authenticated requests (higher rate limits)
}

export interface CatalogItemsSearchResponse {
  keyword?: string | null
  previousPageCursor?: string | null
  nextPageCursor?: string | null
  data: CatalogSearchItem[]
}

export interface CatalogApi {
  searchCatalog: (
    keyword: string,
    limit?: number,
    creatorName?: string
  ) => Promise<CatalogSearchResponse>
  getCatalogNavigation: () => Promise<CatalogCategory[]>
  searchCatalogItems: (params: CatalogItemsSearchParams) => Promise<CatalogItemsSearchResponse>
  getCatalogSearchSuggestions: (prefix: string, limit?: number) => Promise<string[]>
  getCatalogThumbnails: (
    items: Array<{ id: number; itemType: string }>
  ) => Promise<Record<string, string>>
  downloadCatalogTemplate: (
    assetId: number,
    assetName: string,
    cookie?: string
  ) => Promise<{ success: boolean; message?: string; path?: string }>
}

// Groups API types
export interface GroupDetails {
  id: number
  name: string
  description?: string | null
  owner?: {
    hasVerifiedBadge?: boolean
    userId?: number
    username?: string
    displayName?: string
  } | null
  shout?: {
    body: string
    poster?: any
    created: string
    updated: string
  } | null
  memberCount?: number
  isBuildersClubOnly?: boolean
  publicEntryAllowed?: boolean
  hasVerifiedBadge?: boolean
  hasSocialModules?: boolean
  isLocked?: boolean
}

export interface GroupV2 {
  id: number
  name: string
  description?: string | null
  owner?: { id: number; type: string } | null
  created?: string
  hasVerifiedBadge?: boolean
}

export interface GroupRolesResponse {
  groupId: number
  roles: Array<{
    id: number
    name: string
    rank: number
    memberCount?: number
  }>
}

export interface GroupGamesResponse {
  previousPageCursor?: string | null
  nextPageCursor?: string | null
  data: Array<{
    id: number
    name: string
    description?: string | null
    creator?: { id: number; type: string }
    rootPlace?: { id: number; type: string }
    created?: string
    updated?: string
    placeVisits?: number
  }>
}

export interface UserGroupMembership {
  group: {
    id: number
    name: string
    description?: string | null
    owner?: any
    memberCount?: number
    hasVerifiedBadge?: boolean
  }
  role: {
    id: number
    name: string
    rank: number
  }
  isPrimaryGroup?: boolean
}

export interface PendingGroupRequest {
  group: {
    id: number
    name: string
    description?: string | null
    owner?: any
    memberCount?: number
    hasVerifiedBadge?: boolean
  }
  created?: string
}

export interface GroupSocialLink {
  id: number
  type: string
  url: string
  title: string
}

export interface GroupsApi {
  getGroupDetails: (groupId: number, cookie?: string) => Promise<GroupDetails>
  getBatchGroupDetails: (groupIds: number[]) => Promise<GroupV2[]>
  getGroupRoles: (groupId: number) => Promise<GroupRolesResponse>
  getGroupGames: (groupId: number, cursor?: string, limit?: number) => Promise<GroupGamesResponse>
  getGroupWallPosts: (
    groupId: number,
    cursor?: string,
    limit?: number
  ) => Promise<GroupWallPostsResponse>
  getGroupMembers: (
    groupId: number,
    cursor?: string,
    limit?: number,
    roleId?: number
  ) => Promise<GroupMembersResponse>
  getUserGroupsFull: (userId: number) => Promise<UserGroupMembership[]>
  getPendingGroupRequests: (cookie: string) => Promise<PendingGroupRequest[]>
  getGroupSocialLinks: (cookie: string, groupId: number) => Promise<GroupSocialLink[]>
  getGroupThumbnails: (groupIds: number[]) => Promise<Record<number, string>>
  cancelPendingGroupRequest: (cookie: string, groupId: number) => Promise<SuccessResponse>
  leaveGroup: (cookie: string, groupId: number) => Promise<SuccessResponse>
  searchGroupStore: (
    groupId: number,
    keyword?: string,
    cursor?: string,
    limit?: number,
    cookie?: string
  ) => Promise<GroupStoreResponse>
}

// Transactions API types
import type {
  TransactionTotals,
  TransactionTimeFrame
} from '../../../shared/ipc-schemas/transactions'

export interface TransactionsApi {
  getTransactionTypes: (cookie: string) => Promise<TransactionTypes>
  getTransactions: (
    cookie: string,
    transactionType: TransactionTypeEnum,
    cursor?: string,
    limit?: number
  ) => Promise<TransactionsResponse>
  getTransactionTotals: (
    cookie: string,
    timeFrame?: TransactionTimeFrame
  ) => Promise<TransactionTotals>
}

export interface UpdaterApi {
  checkForUpdates: () => Promise<UpdateState>
  downloadUpdate: () => Promise<UpdateActionResult>
  installUpdate: () => Promise<UpdateActionResult>
  getUpdaterState: () => Promise<UpdateState>
  onUpdaterStatus: (callback: (state: UpdateState) => void) => () => void
}

// Catalog Database API types
export interface CatalogDbSearchResult {
  AssetId: number
  Name: string
  Description: string
  AssetTypeId: number
  IsLimited: boolean
  IsLimitedUnique: boolean
  PriceInRobux: number
  IsForSale: boolean
  Sales: number
}

export interface CatalogDbItem {
  AssetId: number
  ProductId: number | null
  Name: string
  Description: string | null
  ProductType: string | null
  AssetTypeId: number | null
  Created: string | null
  Updated: string | null
  PriceInRobux: number | null
  Sales: number
  IsForSale: boolean
  IsLimited: boolean
  IsLimitedUnique: boolean
  CollectiblesItemDetails: string | null
}

export interface SalesData {
  id: number
  sales: number
}

export interface CatalogDatabaseApi {
  getAllCatalogItems: () => Promise<CatalogDbSearchResult[]>
  searchCatalogDb: (query: string, limit?: number) => Promise<CatalogDbSearchResult[]>
  getCatalogItemById: (assetId: number) => Promise<CatalogDbItem | null>
  getSalesData: (assetId: number) => Promise<SalesData | null>
  getBatchSalesData: (assetIds: number[]) => Promise<Record<number, number>>
  getCatalogItemCount: () => Promise<number>
  getCatalogDbStatus: () => Promise<CatalogDbStatus>
  downloadCatalogDb: () => Promise<CatalogDbDownloadResult>
}

export interface CatalogDbStatus {
  exists: boolean
  downloading: boolean
  error: string | null
  path: string
}

export interface CatalogDbDownloadResult {
  success: boolean
  error?: string
}

export interface NewsApi {
  news: {
    getTweets: () => Promise<any[]>
  }
}

export type WindowApi = AccountApi &
  FavoritesApi &
  SettingsApi &
  SocialApi &
  GamesApi &
  AvatarApi &
  InventoryApi &
  LogsApi &
  DeployApi &
  InstallationsApi &
  FlagsApi &
  RolimonsApi &
  NetLogApi &
  CatalogApi &
  GroupsApi &
  TransactionsApi &
  UpdaterApi &
  CatalogDatabaseApi &
  NewsApi
