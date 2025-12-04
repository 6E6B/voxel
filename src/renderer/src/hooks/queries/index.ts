/**
 * Central barrel export for all query hooks
 * Re-exports from feature-based API directories for backward compatibility
 */

// Query Keys
export { queryKeys } from '@shared/queryKeys'

// Avatar hooks
export {
  useCurrentAvatar,
  useInventory,
  useUserOutfits,
  useFavoriteItems,
  useAddFavoriteItem,
  useRemoveFavoriteItem,
  useSetWearingAssets,
  useWearOutfit,
  useSetBodyColors,
  useSetAvatarScales,
  useSetPlayerAvatarType,
  useUpdateOutfit,
  useDeleteOutfit
} from '@renderer/features/avatar/api/useAvatar'

// Rolimons hooks
export {
  useRolimonsData,
  useRolimonsItem,
  useIsRolimonsLimited,
  getRolimonsItem,
  useGetRolimonsItem,
  useRolimonsPlayer,
  useRolimonsLoading,
  useRolimonsError,
  useRolimonsItemPage,
  DEMAND_LABELS,
  TREND_LABELS,
  DEMAND_COLORS,
  TREND_COLORS,
  ROLIMONS_BADGES,
  type RolimonsItemData,
  type RolimonsItem,
  type RolimonsPlayerData
} from '@renderer/features/avatar/api/useRolimons'

// Catalog hooks
export {
  useCatalogNavigation,
  useCatalogSearch,
  useCatalogThumbnails,
  useCatalogSearchSuggestions
} from '@renderer/features/catalog/api/useCatalog'

// Friends hooks
export {
  useFriends,
  useFriendStatuses,
  useFriendRequests,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useUnfriend
} from '@renderer/features/friends/api/useFriends'

// Games hooks
export {
  useGameSorts,
  useGamesInSort,
  useSearchGames,
  useGamesByPlaceIds,
  useFavoriteGames,
  useAddFavoriteGame,
  useRemoveFavoriteGame
} from '@renderer/features/games/api/useGames'

// Game servers hooks
export { useGameServers, useGameName } from '@renderer/features/games/api/useServers'

// Groups hooks
export {
  useJoinedGroups,
  usePendingGroups,
  useGroupDetails,
  useGroupRoles,
  useGroupGames,
  useGroupSocialLinks,
  useGroupWallPosts,
  useGroupMembers,
  useCancelPendingRequest,
  useLeaveGroup,
  useGroupStore,
  type GroupMembership,
  type PendingGroupRequest,
  type GroupDetails,
  type GroupRole,
  type GroupGame,
  type GroupSocialLink
} from '@renderer/features/groups/api/useGroups'

// Inventory hooks
export {
  useInventoryV2,
  useInventoryV2SinglePage,
  useInventoryThumbnails,
  type UseInventoryV2Params
} from '@renderer/features/inventory/api/useInventory'

// Logs hooks
export {
  useLogs,
  useLogContent,
  useDeleteLog,
  useDeleteAllLogs
} from '@renderer/features/system/api/useLogs'

// Re-export from auth feature (accounts management)
export {
  useAccountsManager,
  useAccountStatusPolling
} from '@renderer/features/auth/api/useAccounts'

// Re-export settings manager
export { useSettingsManager } from '@renderer/features/settings/api/useSettings'

// Asset Details / Owners / Resellers hooks (TanStack Query based)
export {
  useAssetDetailsQuery,
  useAssetRecommendationsQuery,
  useAssetDetailsWithRecommendations
} from '@renderer/features/avatar/api/useAssetDetailsQuery'

export {
  useAssetOwnersQuery,
  useAssetOwnersWithDetails
} from '@renderer/features/avatar/api/useAssetOwnersQuery'

export {
  useAssetResellersQuery,
  usePurchaseLimitedItem,
  useAssetResellersWithPurchase
} from '@renderer/features/avatar/api/useAssetResellersQuery'

export { useResaleDataQuery } from '@renderer/features/avatar/api/useResaleDataQuery'

export {
  useBatchThumbnails,
  useBatchUserAvatars,
  useBatchUserDetails,
  useProgressiveThumbnails
} from '@renderer/features/avatar/api/useBatchQueries'

// Re-export user profile hooks
export {
  useExtendedUserDetails,
  useFriendStats,
  useDetailedStats,
  useUserFriends,
  useUserFriendsStatuses,
  useUserGroups,
  useUserCollections,
  useRobloxBadges as useUserRobloxBadges,
  useExperienceBadges as useUserExperienceBadges,
  useUserWearingItems as useUserWearing,
  useUserOutfits as useUserOutfitsPublic,
  usePastUsernames,
  useUserPresence
} from '@renderer/features/users/api/useUserProfile'

// Re-export profile platform hooks (consolidated API)
export {
  useUserProfilePlatform,
  useUserProfileHeader,
  useUserProfileAbout,
  useUserProfileRobloxBadges,
  useUserProfileCollections,
  useUserProfileCurrentlyWearing,
  type ProfilePlatformData
} from '@renderer/features/users/api/useUserProfilePlatform'
