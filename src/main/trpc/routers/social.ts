import { RobloxFriendService } from '@main/modules/friends/FriendService'
import { RobloxGroupService } from '@main/modules/groups/GroupService'
import { RobloxUserService } from '@main/modules/users/UserService'
import { socialContracts } from '../contracts/social'
import { router, contractMutation, authContractMutation } from '../core'

export const socialRouter = router({
    getFriends: authContractMutation(socialContracts.getFriends, async (_ctx, cookie, targetUserId, forceRefresh) => {
        const userId = targetUserId || (await RobloxUserService.getAuthenticatedUser(cookie)).id
        return RobloxFriendService.getFriends(cookie, userId, forceRefresh || false)
    }),
    getFriendsPaged: authContractMutation(socialContracts.getFriendsPaged, async (_ctx, cookie, targetUserId, cursor) => {
        return RobloxFriendService.getFriendsPaged(cookie, targetUserId, cursor)
    }),
    getFollowers: authContractMutation(socialContracts.getFollowers, async (_ctx, cookie, targetUserId, cursor) => {
        return RobloxFriendService.getFollowers(cookie, targetUserId, cursor)
    }),
    getFollowings: authContractMutation(socialContracts.getFollowings, async (_ctx, cookie, targetUserId, cursor) => {
        return RobloxFriendService.getFollowings(cookie, targetUserId, cursor)
    }),
    fetchFriendStats: authContractMutation(socialContracts.fetchFriendStats, async (_ctx, cookie, userIdRaw) => {
        const userId = typeof userIdRaw === 'string' ? parseInt(userIdRaw, 10) : userIdRaw
        return RobloxFriendService.getFriendStats(cookie, userId)
    }),
    sendFriendRequest: authContractMutation(socialContracts.sendFriendRequest, async (_ctx, cookie, targetUserId) => {
        return RobloxFriendService.sendFriendRequest(cookie, targetUserId)
    }),
    getFriendRequests: authContractMutation(socialContracts.getFriendRequests, async (_ctx, cookie) => {
        return RobloxFriendService.getFriendRequests(cookie)
    }),
    acceptFriendRequest: authContractMutation(socialContracts.acceptFriendRequest, async (_ctx, cookie, requesterUserId) => {
        return RobloxFriendService.acceptFriendRequest(cookie, requesterUserId)
    }),
    declineFriendRequest: authContractMutation(socialContracts.declineFriendRequest, async (_ctx, cookie, requesterUserId) => {
        return RobloxFriendService.declineFriendRequest(cookie, requesterUserId)
    }),
    unfriend: authContractMutation(socialContracts.unfriend, async (_ctx, cookie, targetUserId) => {
        return RobloxFriendService.unfriend(cookie, targetUserId)
    }),
    getFriendsStatuses: authContractMutation(socialContracts.getFriendsStatuses, async (_ctx, cookie, userIds) => {
        return RobloxUserService.getBatchPresences(cookie, userIds)
    }),
    getUserPresence: authContractMutation(socialContracts.getUserPresence, async (_ctx, cookie, userId) => {
        return RobloxUserService.getPresence(cookie, userId)
    }),
    getBatchGroupDetails: contractMutation(socialContracts.getBatchGroupDetails, async (_ctx, groupIds) => {
        return RobloxGroupService.getBatchGroupDetails(groupIds)
    }),
    getGroupGames: contractMutation(socialContracts.getGroupGames, async (_ctx, groupId, cursor, limit) => {
        return RobloxGroupService.getGroupGames(groupId, cursor, limit)
    }),
    getUserGroupsFull: contractMutation(socialContracts.getUserGroupsFull, async (_ctx, userId) => {
        return RobloxGroupService.getUserGroups(userId)
    }),
    getPendingGroupRequests: authContractMutation(socialContracts.getPendingGroupRequests, async (_ctx, cookie) => {
        return RobloxGroupService.getPendingGroupRequests(cookie)
    }),
    getGroupThumbnails: contractMutation(socialContracts.getGroupThumbnails, async (_ctx, groupIds) => {
        const thumbnailMap = await RobloxGroupService.getGroupThumbnails(groupIds)
        const result: Record<number, string> = {}
        thumbnailMap.forEach((url, id) => {
            result[id] = url
        })
        return result
    }),
    getUserByUsername: contractMutation(socialContracts.getUserByUsername, async (_ctx, username) => {
        return RobloxUserService.getUserByUsername(username)
    }),
    getUserGroups: contractMutation(socialContracts.getUserGroups, async (_ctx, userId) => {
        return RobloxUserService.getUserGroups(userId)
    }),
    getBatchUserDetails: contractMutation(socialContracts.getBatchUserDetails, async (_ctx, userIds) => {
        const resultMap = await RobloxUserService.getBatchUserDetails(userIds)
        const resultObj: Record<number, { id: number; name: string; displayName: string } | null> = {}
        for (const [userId, details] of resultMap.entries()) {
            resultObj[userId] = details
        }
        return resultObj
    }),
    getExtendedUserDetails: authContractMutation(socialContracts.getExtendedUserDetails, async (_ctx, cookie, userId) => {
        return RobloxUserService.getExtendedUserDetails(cookie, userId)
    }),
    getDetailedStats: authContractMutation(socialContracts.getDetailedStats, async (_ctx, cookie, userId) => {
        return RobloxUserService.getDetailedStats(cookie, userId)
    }),
    getPlayerBadges: authContractMutation(socialContracts.getPlayerBadges, async (_ctx, cookie, userId) => {
        return RobloxUserService.getPlayerBadges(cookie, userId)
    }),
    blockUser: authContractMutation(socialContracts.blockUser, async (_ctx, cookie, userId) => {
        return RobloxUserService.blockUser(cookie, userId)
    }),
    getUserProfile: authContractMutation(socialContracts.getUserProfile, async (_ctx, cookie, userId) => {
        return RobloxUserService.getUserProfile(cookie, userId)
    })
})