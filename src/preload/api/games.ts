import { z } from 'zod'
import { invoke } from './invoke'
import * as S from '../../shared/ipc-schemas'

// ============================================================================
// GAMES API
// ============================================================================

const gamePassPurchaseResponseSchema = z
  .object({
    purchased: z.boolean().optional(),
    reason: z.string().optional(),
    errorMessage: z.string().optional(),
    shortMessage: z.string().optional(),
    statusCode: z.number().optional()
  })
  .passthrough()

export const gamesApi = {
  getGameSorts: (sessionId?: string) => invoke('get-game-sorts', z.array(z.any()), sessionId),
  getGamesInSort: (sortId: string, sessionId?: string) =>
    invoke('get-games-in-sort', z.array(z.any()), sortId, sessionId),
  getGamesByPlaceIds: (placeIds: string[]) =>
    invoke('get-games-by-place-ids', z.array(z.any()), placeIds),
  getGamesByUniverseIds: (universeIds: number[]) =>
    invoke('get-games-by-universe-ids', z.array(z.any()), universeIds),
  getGameThumbnail16x9: (universeId: number) =>
    invoke('get-game-thumbnail-16x9', z.array(z.string()), universeId),
  getGameIconThumbnail: (universeId: number) =>
    invoke('get-game-icon-thumbnail', z.string().nullable(), universeId),
  searchGames: (query: string, sessionId?: string) =>
    invoke('search-games', z.array(z.any()), query, sessionId),
  getRecentlyPlayedGames: (sessionId?: string) =>
    invoke('get-recently-played-games', z.array(z.any()), sessionId),
  launchGame: (
    cookie: string,
    placeId: string | number,
    jobId?: string,
    friendId?: string | number,
    installPath?: string
  ) =>
    invoke('launch-game', S.successResponseSchema, cookie, placeId, jobId, friendId, installPath),
  getGameServers: (
    placeId: string | number,
    cursor?: string,
    limit?: number,
    sortOrder?: 'Asc' | 'Desc',
    excludeFullGames?: boolean
  ) =>
    invoke(
      'get-game-servers',
      S.pagedServerSchema,
      placeId,
      cursor,
      limit,
      sortOrder,
      excludeFullGames
    ),
  getServerRegion: (placeId: string | number, serverId: string) =>
    invoke('get-server-region', z.string(), placeId, serverId),
  getJoinScript: (placeId: string | number, serverId: string) =>
    invoke('get-join-script', z.any(), placeId, serverId),
  getServerQueuePosition: (placeId: string | number, serverId: string) =>
    invoke('get-server-queue-position', z.number().nullable(), placeId, serverId),
  getRegionFromAddress: (address: string) => invoke('get-region-from-address', z.string(), address),
  getRegionsBatch: (addresses: string[]) =>
    invoke('get-regions-batch', S.regionsBatchSchema, addresses),
  getGameSocialLinks: (universeId: number) =>
    invoke('get-game-social-links', z.array(z.any()), universeId),
  voteOnGame: (placeId: number, vote: boolean | null) =>
    invoke('vote-on-game', z.any(), placeId, vote),
  getGamePasses: (universeId: number) =>
    invoke('get-game-passes', S.gamePassesResponseSchema, universeId),
  purchaseGamePass: (
    cookie: string,
    productId: number,
    expectedPrice: number,
    expectedSellerId: number,
    expectedPurchaserId?: string,
    idempotencyKey?: string
  ) =>
    invoke(
      'purchase-game-pass',
      gamePassPurchaseResponseSchema,
      cookie,
      productId,
      expectedPrice,
      expectedSellerId,
      expectedPurchaserId,
      idempotencyKey
    ),
  saveGameImage: (imageUrl: string, gameName: string) =>
    invoke('save-game-image', S.downloadResultSchema, imageUrl, gameName)
}

// ============================================================================
// GROUPS API
// ============================================================================

export const groupsApi = {
  getGroupDetails: (groupId: number, cookie?: string) =>
    invoke('get-group-details', S.groupDetailsSchema, groupId, cookie),
  getBatchGroupDetails: (groupIds: number[]) =>
    invoke('get-batch-group-details', z.array(S.groupV2Schema), groupIds),
  getGroupRoles: (groupId: number) =>
    invoke('get-group-roles', S.groupRolesResponseSchema, groupId),
  getGroupGames: (groupId: number, cursor?: string, limit?: number) =>
    invoke('get-group-games', S.groupGamesResponseSchema, groupId, cursor, limit),
  getUserGroupsFull: (userId: number) =>
    invoke('get-user-groups-full', z.array(S.userGroupMembershipSchema), userId),
  getPendingGroupRequests: (cookie: string) =>
    invoke('get-pending-group-requests', z.array(S.pendingGroupRequestSchema), cookie),
  getGroupSocialLinks: (cookie: string, groupId: number) =>
    invoke('get-group-social-links', z.array(S.groupSocialLinkSchema), cookie, groupId),
  getGroupThumbnails: (groupIds: number[]) =>
    invoke('get-group-thumbnails', z.record(z.string(), z.string()), groupIds),
  getGroupWallPosts: (groupId: number, cursor?: string, limit?: number) =>
    invoke('get-group-wall-posts', S.groupWallPostsResponseSchema, groupId, cursor, limit),
  getGroupMembers: (groupId: number, cursor?: string, limit?: number, roleId?: number) =>
    invoke(
      'get-group-members',
      z.object({
        previousPageCursor: z.string().nullable().optional(),
        nextPageCursor: z.string().nullable().optional(),
        data: z.array(z.union([S.groupMemberSchema, S.groupRoleMemberSchema]))
      }),
      groupId,
      cursor,
      limit,
      roleId
    ),
  cancelPendingGroupRequest: (cookie: string, groupId: number) =>
    invoke('cancel-pending-group-request', S.successResponseSchema, cookie, groupId),
  leaveGroup: (cookie: string, groupId: number) =>
    invoke('leave-group', S.successResponseSchema, cookie, groupId),
  searchGroupStore: (
    groupId: number,
    keyword?: string,
    cursor?: string,
    limit?: number,
    cookie?: string
  ) =>
    invoke(
      'search-group-store',
      S.groupStoreResponseSchema,
      groupId,
      keyword,
      cursor,
      limit,
      cookie
    )
}
