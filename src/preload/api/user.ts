import { z } from 'zod'
import { invoke } from './invoke'
import * as S from '../../shared/ipc-schemas'

// ============================================================================
// ACCOUNT API
// ============================================================================

export const accountApi = {
  validateCookie: (cookie: string) => invoke('validate-cookie', S.userSummarySchema, cookie),
  fetchAccountStats: (cookie: string) =>
    invoke('fetch-account-stats', S.accountStatsSchema, cookie),
  getAccountStatus: (cookie: string) =>
    invoke('get-account-status', S.presenceSchema.nullable(), cookie),
  getBatchAccountStatuses: (cookies: string[]) =>
    invoke('get-batch-account-statuses', S.batchAccountStatusSchema, cookies),
  getAccounts: () => invoke('get-accounts', z.array(S.accountSchema)),
  saveAccounts: (accounts: unknown[]) => invoke('save-accounts', z.void(), accounts)
}

// ============================================================================
// USERS API
// ============================================================================

export const usersApi = {
  getUserByUsername: (username: string) =>
    invoke('get-user-by-username', S.userSummarySchema.nullable(), username),
  getExtendedUserDetails: (cookie: string, userId: number) =>
    invoke('get-user-details-extended', S.extendedUserDetailsSchema, cookie, userId),
  getUserGroups: (userId: number) => invoke('get-user-groups', z.array(z.any()), userId),
  getBatchUserDetails: (userIds: number[]) =>
    invoke(
      'get-batch-user-details',
      z.record(
        z.string(),
        z.object({ id: z.number(), name: z.string(), displayName: z.string() }).nullable()
      ),
      userIds
    ),
  getDetailedStats: (cookie: string, userId: number) =>
    invoke('get-detailed-stats', S.detailedStatsSchema, cookie, userId),
  getRobloxBadges: (cookie: string, userId: number) =>
    invoke('get-roblox-badges', z.array(z.any()), cookie, userId),
  getPlayerBadges: (cookie: string, userId: number) =>
    invoke('get-player-badges', z.any(), cookie, userId),
  getPastUsernames: (cookie: string, userId: number) =>
    invoke('get-past-usernames', S.usernameHistorySchema, cookie, userId),
  getUserProfile: (cookie: string, userId: number) =>
    invoke('get-user-profile', S.userProfileResponseSchema, cookie, userId)
}

// ============================================================================
// FRIENDS API
// ============================================================================

export const friendsApi = {
  getFriendsStatuses: (cookie: string, userIds: number[]) =>
    invoke('get-friends-statuses', z.array(S.presenceSchema), cookie, userIds),
  getUserPresence: (cookie: string, userId: number) =>
    invoke('get-user-presence', S.presenceSchema.nullable(), cookie, userId),
  getFriends: (cookie: string, targetUserId?: number, forceRefresh?: boolean) =>
    invoke('get-friends', z.array(S.userPreviewSchema), cookie, targetUserId, forceRefresh),
  getFriendsPaged: (cookie: string, targetUserId: number, cursor?: string) =>
    invoke('get-friends-paged', S.userCursorResultSchema, cookie, targetUserId, cursor),
  getFollowers: (cookie: string, targetUserId: number, cursor?: string) =>
    invoke('get-followers', S.userCursorResultSchema, cookie, targetUserId, cursor),
  getFollowings: (cookie: string, targetUserId: number, cursor?: string) =>
    invoke('get-followings', S.userCursorResultSchema, cookie, targetUserId, cursor),
  fetchFriendStats: (cookie: string, userId: string) =>
    invoke('fetch-friend-stats', S.friendStatsSchema, cookie, parseInt(userId)),
  sendFriendRequest: (cookie: string, targetUserId: number) =>
    invoke('send-friend-request', S.captchaChallengeSchema, cookie, targetUserId),
  getFriendRequests: (cookie: string) =>
    invoke('get-friend-requests', z.array(S.userPreviewSchema), cookie),
  acceptFriendRequest: (cookie: string, requesterUserId: number) =>
    invoke('accept-friend-request', S.successResponseSchema, cookie, requesterUserId),
  declineFriendRequest: (cookie: string, requesterUserId: number) =>
    invoke('decline-friend-request', S.successResponseSchema, cookie, requesterUserId),
  unfriend: (cookie: string, targetUserId: number) =>
    invoke('unfriend', S.successResponseSchema, cookie, targetUserId)
}
