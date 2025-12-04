/**
 * Query Key Factory
 * Centralized query key management for consistent cache invalidation
 */

export const queryKeys = {
  // Accounts
  accounts: {
    all: ['accounts'] as const,
    list: () => [...queryKeys.accounts.all, 'list'] as const,
    statuses: (cookies: string[]) => [...queryKeys.accounts.all, 'statuses', cookies] as const,
    stats: (cookie: string) => [...queryKeys.accounts.all, 'stats', cookie] as const
  },

  // Settings
  settings: {
    all: ['settings'] as const,
    snapshot: () => [...queryKeys.settings.all, 'snapshot'] as const,
    sidebarWidth: () => [...queryKeys.settings.all, 'sidebarWidth'] as const,
    accountsViewMode: () => [...queryKeys.settings.all, 'accountsViewMode'] as const,
    avatarRenderWidth: () => [...queryKeys.settings.all, 'avatarRenderWidth'] as const
  },

  // Friends
  friends: {
    all: ['friends'] as const,
    list: (accountId: string) => [...queryKeys.friends.all, 'list', accountId] as const,
    statuses: (accountId: string, userIds: number[]) =>
      [...queryKeys.friends.all, 'statuses', accountId, userIds] as const,
    requests: (accountId: string) => [...queryKeys.friends.all, 'requests', accountId] as const
  },

  // Games
  games: {
    all: ['games'] as const,
    sorts: (sessionId?: string) => [...queryKeys.games.all, 'sorts', sessionId] as const,
    inSort: (sortId: string, sessionId?: string) =>
      [...queryKeys.games.all, 'inSort', sortId, sessionId] as const,
    search: (query: string, sessionId?: string) =>
      [...queryKeys.games.all, 'search', query, sessionId] as const,
    byPlaceIds: (placeIds: string[]) => [...queryKeys.games.all, 'byPlaceIds', placeIds] as const,
    favorites: () => [...queryKeys.games.all, 'favorites'] as const
  },

  // Avatar
  avatar: {
    all: ['avatar'] as const,
    current: (accountId: string) => [...queryKeys.avatar.all, 'current', accountId] as const,
    inventory: (accountId: string, assetTypeId: number) =>
      [...queryKeys.avatar.all, 'inventory', accountId, assetTypeId] as const,
    outfits: (accountId: string, isEditable: boolean) =>
      [...queryKeys.avatar.all, 'outfits', accountId, isEditable] as const,
    favorites: () => [...queryKeys.avatar.all, 'favorites'] as const
  },

  // Thumbnails
  thumbnails: {
    all: ['thumbnails'] as const,
    batch: (targetIds: number[], type?: string) =>
      [...queryKeys.thumbnails.all, 'batch', targetIds, type] as const,
    userAvatars: (userIds: number[], size?: string) =>
      [...queryKeys.thumbnails.all, 'userAvatars', userIds, size] as const,
    avatar3D: (userId: string | number) =>
      [...queryKeys.thumbnails.all, 'avatar3D', String(userId)] as const,
    asset3D: (assetId: string | number) =>
      [...queryKeys.thumbnails.all, 'asset3D', String(assetId)] as const
  },

  // User Profile (for viewing other users' profiles)
  userProfile: {
    all: ['userProfile'] as const,
    platform: (userId: number) => [...queryKeys.userProfile.all, 'platform', userId] as const,
    details: (userId: number, cookie: string) =>
      [...queryKeys.userProfile.all, 'details', userId, cookie] as const,
    extended: (userId: number, cookie: string) =>
      [...queryKeys.userProfile.all, 'extended', userId, cookie] as const,
    stats: (userId: number, cookie: string) =>
      [...queryKeys.userProfile.all, 'stats', userId, cookie] as const,
    friends: (userId: number, cookie: string) =>
      [...queryKeys.userProfile.all, 'friends', userId, cookie] as const,
    groups: (userId: number) => [...queryKeys.userProfile.all, 'groups', userId] as const,
    collections: (userId: number, cookie: string) =>
      [...queryKeys.userProfile.all, 'collections', userId, cookie] as const,
    badges: {
      roblox: (userId: number, cookie: string) =>
        [...queryKeys.userProfile.all, 'badges', 'roblox', userId, cookie] as const,
      experience: (userId: number, cookie: string) =>
        [...queryKeys.userProfile.all, 'badges', 'experience', userId, cookie] as const
    },
    wearing: (userId: number, cookie: string) =>
      [...queryKeys.userProfile.all, 'wearing', userId, cookie] as const,
    outfits: (userId: number, cookie: string, isEditable: boolean) =>
      [...queryKeys.userProfile.all, 'outfits', userId, cookie, isEditable] as const,
    pastUsernames: (userId: number, cookie: string) =>
      [...queryKeys.userProfile.all, 'pastUsernames', userId, cookie] as const,
    presence: (userId: number, cookie: string) =>
      [...queryKeys.userProfile.all, 'presence', userId, cookie] as const
  },

  // Game Servers
  servers: {
    all: ['servers'] as const,
    list: (placeId: string, excludeFull: boolean) =>
      [...queryKeys.servers.all, 'list', placeId, excludeFull] as const,
    gameName: (placeId: string) => [...queryKeys.servers.all, 'gameName', placeId] as const
  },

  // Rolimons (Limited item data)
  rolimons: {
    all: ['rolimons'] as const,
    itemDetails: () => [...queryKeys.rolimons.all, 'itemDetails'] as const,
    player: (userId: number) => [...queryKeys.rolimons.all, 'player', userId] as const,
    itemPage: (itemId: number) => [...queryKeys.rolimons.all, 'itemPage', itemId] as const
  },

  // Catalog
  catalog: {
    all: ['catalog'] as const,
    navigation: () => [...queryKeys.catalog.all, 'navigation'] as const,
    search: (params: Record<string, unknown>) =>
      [...queryKeys.catalog.all, 'search', params] as const,
    suggestions: (prefix: string) => [...queryKeys.catalog.all, 'suggestions', prefix] as const,
    thumbnails: (ids: number[]) => [...queryKeys.catalog.all, 'thumbnails', ids] as const
  },

  // Logs
  logs: {
    all: ['logs'] as const,
    list: () => [...queryKeys.logs.all, 'list'] as const,
    content: (filename?: string | null) =>
      [...queryKeys.logs.all, 'content', filename ?? 'unknown'] as const
  },

  // Inventory
  inventory: {
    all: ['inventory'] as const,
    v2: (cookie: string, userId: number, assetTypes: string[], sortOrder: 'Asc' | 'Desc') =>
      [
        ...queryKeys.inventory.all,
        'v2',
        cookie,
        userId,
        assetTypes.sort().join(','),
        sortOrder
      ] as const,
    thumbnails: (assetIds: number[]) =>
      [...queryKeys.inventory.all, 'thumbnails', assetIds] as const
  },

  // Groups
  groups: {
    all: ['groups'] as const,
    userGroups: (userId: number) => [...queryKeys.groups.all, 'userGroups', userId] as const,
    pending: (accountId: string) => [...queryKeys.groups.all, 'pending', accountId] as const,
    details: (groupId: number) => [...queryKeys.groups.all, 'details', groupId] as const,
    roles: (groupId: number) => [...queryKeys.groups.all, 'roles', groupId] as const,
    games: (groupId: number) => [...queryKeys.groups.all, 'games', groupId] as const,
    socialLinks: (groupId: number) => [...queryKeys.groups.all, 'socialLinks', groupId] as const,
    thumbnails: (groupIds: number[]) => [...queryKeys.groups.all, 'thumbnails', groupIds] as const,
    wall: (groupId: number) => [...queryKeys.groups.all, 'wall', groupId] as const,
    members: (groupId: number, roleId?: number) =>
      [...queryKeys.groups.all, 'members', groupId, roleId] as const,
    store: (groupId: number, keyword?: string) =>
      [...queryKeys.groups.all, 'store', groupId, keyword] as const
  },

  // Asset Details (for AccessoryDetailsModal)
  assets: {
    all: ['assets'] as const,
    details: (assetId: number) => [...queryKeys.assets.all, 'details', assetId] as const,
    recommendations: (assetId: number) =>
      [...queryKeys.assets.all, 'recommendations', assetId] as const,
    owners: (assetId: number) => [...queryKeys.assets.all, 'owners', assetId] as const,
    resellers: (collectibleItemId: string) =>
      [...queryKeys.assets.all, 'resellers', collectibleItemId] as const,
    resaleData: (assetId: number) => [...queryKeys.assets.all, 'resaleData', assetId] as const
  },

  // Batch operations (for user avatars, thumbnails, etc.)
  batch: {
    all: ['batch'] as const,
    userAvatars: (userIds: number[]) =>
      [...queryKeys.batch.all, 'userAvatars', userIds.sort((a, b) => a - b)] as const,
    userDetails: (userIds: number[]) =>
      [...queryKeys.batch.all, 'userDetails', userIds.sort((a, b) => a - b)] as const,
    thumbnails: (assetIds: number[]) =>
      [...queryKeys.batch.all, 'thumbnails', assetIds.sort((a, b) => a - b)] as const
  },

  // Transactions
  transactions: {
    all: ['transactions'] as const,
    types: (cookie: string) => [...queryKeys.transactions.all, 'types', cookie] as const,
    list: (cookie: string, type: string, cursor?: string) =>
      [...queryKeys.transactions.all, 'list', cookie, type, cursor] as const,
    totals: (cookie: string, timeFrame: string) =>
      [...queryKeys.transactions.all, 'totals', cookie, timeFrame] as const
  }
} as const
