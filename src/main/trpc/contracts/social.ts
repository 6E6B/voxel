import { z } from 'zod'
import { defineProcedure } from '../core'

export const socialContracts = {
    getFriendsStatuses: defineProcedure(z.tuple([z.string(), z.array(z.number())])),
    getUserPresence: defineProcedure(z.tuple([z.string(), z.number()])),
    getFriends: defineProcedure(z.tuple([z.string(), z.number().optional(), z.boolean().optional()])),
    getFriendsPaged: defineProcedure(z.tuple([z.string(), z.number(), z.string().optional()])),
    getFollowers: defineProcedure(z.tuple([z.string(), z.number(), z.string().optional()])),
    getFollowings: defineProcedure(z.tuple([z.string(), z.number(), z.string().optional()])),
    fetchFriendStats: defineProcedure(z.tuple([z.string(), z.union([z.string(), z.number()])])),
    sendFriendRequest: defineProcedure(z.tuple([z.string(), z.number()])),
    getFriendRequests: defineProcedure(z.tuple([z.string()])),
    acceptFriendRequest: defineProcedure(z.tuple([z.string(), z.number()])),
    declineFriendRequest: defineProcedure(z.tuple([z.string(), z.number()])),
    unfriend: defineProcedure(z.tuple([z.string(), z.number()])),
    getBatchGroupDetails: defineProcedure(z.tuple([z.array(z.number())])),
    getGroupGames: defineProcedure(z.tuple([z.number(), z.string().optional(), z.number().optional()])),
    getGroupMembers: defineProcedure(z.tuple([z.number(), z.number().optional(), z.number().optional()])),
    getUserGroupsFull: defineProcedure(z.tuple([z.number()])),
    getPendingGroupRequests: defineProcedure(z.tuple([z.string()])),
    getGroupThumbnails: defineProcedure(z.tuple([z.array(z.number())])),
    getUserByUsername: defineProcedure(z.tuple([z.string()])),
    getExtendedUserDetails: defineProcedure(z.tuple([z.string(), z.number()])),
    getUserGroups: defineProcedure(z.tuple([z.number()])),
    getBatchUserDetails: defineProcedure(z.tuple([z.array(z.number())])),
    getDetailedStats: defineProcedure(z.tuple([z.string(), z.number()])),
    getPlayerBadges: defineProcedure(z.tuple([z.string(), z.number()])),
    blockUser: defineProcedure(z.tuple([z.string(), z.number()])),
    getUserProfile: defineProcedure(z.tuple([z.string(), z.number()]))
} as const