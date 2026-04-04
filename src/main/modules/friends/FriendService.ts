import { request, requestWithCsrf } from '@main/lib/request'
import { RobloxAuthService } from '../auth/RobloxAuthService'
import { RobloxUserService } from '../users/UserService'
import { z } from 'zod'
import {
  bulkUserProfilesResponseSchema,
  friendSchema,
  friendsPageSchema,
  followersResponseSchema,
  presenceSchema,
  userPresenceResponseSchema
} from '@shared/contracts/user'

type HydratedUserDetails = {
  id: number
  name: string
  displayName: string
  hasVerifiedBadge: boolean
}

export class RobloxFriendService {
  private static readonly BULK_USER_PROFILE_BATCH_SIZE = 50

  private static getValidProfileIds(userIds: number[]) {
    return Array.from(
      new Set(userIds.filter((id) => Number.isInteger(id) && id > 0))
    )
  }

  private static async fetchBulkUserProfileChunk(
    cookie: string,
    ids: number[],
    userDetails: Record<number, HydratedUserDetails>
  ) {
    if (ids.length === 0) {
      return
    }

    try {
      const response = await request(bulkUserProfilesResponseSchema, {
        method: 'POST',
        url: 'https://apis.roblox.com/user-profile-api/v1/user/profiles/get-profiles',
        cookie,
        body: {
          userIds: ids,
          fields: ['names.combinedName', 'names.username']
        }
      })

      response.profileDetails.forEach((profile) => {
        const username = profile.names?.username
        const combinedName = profile.names?.combinedName

        if (!username && !combinedName) {
          return
        }

        userDetails[profile.userId] = {
          id: profile.userId,
          name: username ?? combinedName ?? '',
          displayName: combinedName ?? username ?? '',
          hasVerifiedBadge: false
        }
      })
    } catch (error) {
      console.error('Failed to fetch bulk user profile chunk', {
        ids,
        error
      })
    }
  }

  static async getFriendStats(cookie: string, userId: number) {
    const profile = await RobloxUserService.getUserProfile(cookie, userId)
    const header = profile.components?.UserProfileHeader
    const about = profile.components?.About

    return {
      followerCount: header?.counts?.followersCount ?? 0,
      followingCount: header?.counts?.followingsCount ?? 0,
      friendCount: header?.counts?.friendsCount ?? 0,
      description: about?.description ?? undefined,
      created: about?.joinDateTime ?? undefined,
      username: header?.names?.username ?? header?.names?.primaryName ?? '',
      displayName: header?.names?.displayName ?? header?.names?.primaryName ?? '',
      userId: userId
    }
  }

  private static async getBatchUserDetails(cookie: string, userIds: number[]) {
    const userDetails: Record<number, HydratedUserDetails> = {}

    if (userIds.length === 0) {
      return userDetails
    }

    const uniqueIds = this.getValidProfileIds(userIds)
    const chunkSize = this.BULK_USER_PROFILE_BATCH_SIZE

    for (let index = 0; index < uniqueIds.length; index += chunkSize) {
      const ids = uniqueIds.slice(index, index + chunkSize)
      await this.fetchBulkUserProfileChunk(cookie, ids, userDetails)
    }

    return userDetails
  }

  private static async hydrateUsers(
    cookie: string,
    userIds: number[],
    options?: { skipPresence?: boolean }
  ) {
    if (userIds.length === 0) return { avatars: {}, userDetails: {}, presences: {} }

    const chunk = (arr: number[], size: number) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size)
      )

    const avatars: Record<number, string> = {}
    const presences: Record<number, any> = {}
    const userDetails: Record<number, HydratedUserDetails> = {}

    let csrfToken = ''
    if (!options?.skipPresence) {
      try {
        csrfToken = await RobloxAuthService.getCsrfToken(cookie)
      } catch (e) {
        console.warn('Failed to get CSRF token for presence, proceeding without presence data', e)
      }
    }

    try {
      const avatarMap = await RobloxUserService.getBatchUserAvatarHeadshots(
        userIds,
        '420x420',
        cookie
      )
      for (const [id, url] of avatarMap.entries()) {
        if (url) {
          avatars[id] = url
        }
      }
    } catch (e) {
      console.error('Failed to fetch avatars via batch service', e)
    }

    try {
      Object.assign(userDetails, await this.getBatchUserDetails(cookie, userIds))
    } catch (error) {
      console.error('Failed to fetch user details via user-profile-api', error)
    }

    if (csrfToken && !options?.skipPresence) {
      const presenceChunks = chunk(userIds, 50)
      for (const ids of presenceChunks) {
        try {
          const presenceResult = await requestWithCsrf(userPresenceResponseSchema, {
            method: 'POST',
            url: 'https://presence.roblox.com/v1/presence/users',
            cookie,
            headers: { 'x-csrf-token': csrfToken },
            body: { userIds: ids }
          })
          const presenceData = presenceResult.userPresences || []

          presenceData.forEach((p: any) => {
            const validPresence = presenceSchema.parse(p)
            presences[validPresence.userId] = validPresence
          })
        } catch (e) {
          console.error('Failed to fetch presence chunk', e)
        }
      }
    }

    return { avatars, userDetails, presences }
  }

  /**
   * Get friends with pagination support - fetches only one page at a time
   */
  static async getFriendsPaged(cookie: string, userId: number, cursor?: string) {
    const limit = 50
    const queryParams = new URLSearchParams({
      limit: limit.toString()
    })
    if (cursor) {
      queryParams.append('cursor', cursor)
    }

    const friendsResult = await request(friendsPageSchema, {
      url: `https://friends.roblox.com/v1/users/${userId}/friends/find?${queryParams.toString()}`,
      cookie
    })

    const friends = friendsResult.PageItems || []
    if (friends.length === 0) {
      return {
        data: [],
        nextCursor: null,
        previousCursor: null
      }
    }

    const friendIds = friends.map((f) => f.id)
    const { avatars, userDetails, presences } = await this.hydrateUsers(cookie, friendIds)

    const data = friends.map((f) => {
      const p = presences[f.id]
      const u = userDetails[f.id]
      return {
        id: f.id.toString(),
        userId: f.id.toString(),
        username: u ? u.name : f.name || '',
        displayName: u ? u.displayName : f.displayName || f.name || '',
        avatarUrl: avatars[f.id] || '',
        userPresenceType: p ? p.userPresenceType : f.isOnline ? 1 : 0,
        lastLocation: p?.lastLocation || '',
        placeId: p?.placeId || null,
        gameId: p?.gameId || null,
        description: f.description || '',
        hasVerifiedBadge: f.hasVerifiedBadge ?? u?.hasVerifiedBadge ?? false
      }
    })

    return {
      data,
      nextCursor: friendsResult.NextCursor ?? null,
      previousCursor: null
    }
  }

  /**
   * Get ALL friends (fetches all pages) - use for FriendsTab where all friends are needed
   */
  static async getFriends(cookie: string, userId: number, _forceRefresh: boolean = false) {
    void _forceRefresh
    let friends: z.infer<typeof friendSchema>[] = []
    let cursor: string | null = null
    const limit = 50
    const maxPages = 100
    let pagesFetched = 0

    try {
      do {
        const queryParams = new URLSearchParams({
          limit: limit.toString()
        })
        if (cursor) {
          queryParams.append('cursor', cursor)
        }

        const friendsResult = await request(friendsPageSchema, {
          url: `https://friends.roblox.com/v1/users/${userId}/friends/find?${queryParams.toString()}`,
          cookie
        })

        const pageFriends = friendsResult.PageItems || []
        friends = [...friends, ...pageFriends]
        cursor = friendsResult.NextCursor ?? null
        pagesFetched++
      } while (cursor && pagesFetched < maxPages)

      if (cursor && pagesFetched >= maxPages) {
        console.warn(`Friends fetch hit page limit (${maxPages}) for user ${userId}`)
      }
    } catch (error) {
      console.error('Error fetching friends pages:', error)
    }

    if (friends.length === 0) return []

    const friendIds = friends.map((f) => f.id)
    const { avatars, userDetails, presences } = await this.hydrateUsers(cookie, friendIds)

    return friends.map((f) => {
      const p = presences[f.id]
      const u = userDetails[f.id]
      return {
        id: f.id.toString(),
        username: u ? u.name : f.name || '',
        displayName: u ? u.displayName : f.displayName || f.name || '',
        userId: f.id.toString(),
        avatarUrl: avatars[f.id] || '',
        userPresenceType: p ? p.userPresenceType : f.isOnline ? 1 : 0,
        lastLocation: p?.lastLocation || '',
        placeId: p?.placeId || null,
        gameId: p?.gameId || null,
        description: f.description || '',
        hasVerifiedBadge: f.hasVerifiedBadge ?? u?.hasVerifiedBadge ?? false
      }
    })
  }

  static async getFollowers(cookie: string, userId: number, cursor?: string) {
    const limit = 50
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      sortOrder: 'Desc'
    })
    if (cursor) queryParams.append('cursor', cursor)

    const result = await request(followersResponseSchema, {
      url: `https://friends.roblox.com/v1/users/${userId}/followers?${queryParams.toString()}`,
      cookie
    })

    const users = result.data || []
    if (users.length === 0) {
      return {
        data: [],
        nextCursor: null,
        previousCursor: result.previousPageCursor ?? null
      }
    }

    const userIds = users.map((u) => u.id)
    const { avatars, userDetails, presences } = await this.hydrateUsers(cookie, userIds)

    const data = users.map((u) => {
      const p = presences[u.id]
      const details = userDetails[u.id]
      return {
        id: u.id.toString(),
        userId: u.id.toString(),
        username: details ? details.name : u.name || '',
        displayName: details ? details.displayName : u.displayName || '',
        avatarUrl: avatars[u.id] || '',
        userPresenceType: p ? p.userPresenceType : 0,
        created: u.created,
        hasVerifiedBadge: details?.hasVerifiedBadge ?? false
      }
    })

    return {
      data,
      nextCursor: result.nextPageCursor ?? null,
      previousCursor: result.previousPageCursor ?? null
    }
  }

  static async getFollowings(cookie: string, userId: number, cursor?: string) {
    const limit = 50
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      sortOrder: 'Desc'
    })
    if (cursor) queryParams.append('cursor', cursor)

    const result = await request(followersResponseSchema, {
      url: `https://friends.roblox.com/v1/users/${userId}/followings?${queryParams.toString()}`,
      cookie
    })

    const users = result.data || []
    if (users.length === 0) {
      return {
        data: [],
        nextCursor: null,
        previousCursor: result.previousPageCursor ?? null
      }
    }

    const userIds = users.map((u) => u.id)
    const { avatars, userDetails, presences } = await this.hydrateUsers(cookie, userIds)

    const data = users.map((u) => {
      const p = presences[u.id]
      const details = userDetails[u.id]
      return {
        id: u.id.toString(),
        userId: u.id.toString(),
        username: details ? details.name : u.name || '',
        displayName: details ? details.displayName : u.displayName || '',
        avatarUrl: avatars[u.id] || '',
        userPresenceType: p ? p.userPresenceType : 0,
        created: u.created,
        hasVerifiedBadge: details?.hasVerifiedBadge ?? false
      }
    })

    return {
      data,
      nextCursor: result.nextPageCursor ?? null,
      previousCursor: result.previousPageCursor ?? null
    }
  }

  static async sendFriendRequest(cookie: string, targetUserId: number) {
    const url = `https://friends.roblox.com/v1/users/${targetUserId}/request-friendship`
    const payload = { friendshipOriginSourceType: 0 }

    const result = await requestWithCsrf(
      z.object({ success: z.boolean(), isCaptchaRequired: z.boolean() }),
      {
        method: 'POST',
        url,
        cookie,
        body: payload
      }
    )

    return result
  }

  static async getFriendRequests(cookie: string) {
    const result = await request(z.object({ data: z.array(z.any()) }), {
      url: `https://friends.roblox.com/v1/my/friends/requests?sortOrder=Desc&limit=100`,
      cookie
    })

    if (!result.data || result.data.length === 0) {
      return []
    }

    const requests = result.data
    const userIds = requests.map((r: any) => r.id)

    const { avatars, userDetails } = await this.hydrateUsers(cookie, userIds, {
      skipPresence: true
    })

    return requests.map((r: any) => {
      const id = r.id
      const user = userDetails[id]
      const friendRequest = r.friendRequest ?? {}
      const mutualFriends = Array.isArray(r.mutualFriendsList) ? r.mutualFriendsList : []
      return {
        id: id,
        userId: id,
        username: user ? user.name : `User ${id}`,
        displayName: user ? user.displayName : `Display ${id}`,
        avatarUrl: avatars[id] || '',
        created: friendRequest.sentAt || new Date().toISOString(),
        originSourceType: friendRequest.originSourceType,
        sourceUniverseId: friendRequest.sourceUniverseId ?? null,
        contactName: friendRequest.contactName ?? null,
        senderNickname: friendRequest.senderNickname ?? '',
        mutualFriendsList: mutualFriends,
        hasVerifiedBadge: user?.hasVerifiedBadge ?? r.hasVerifiedBadge ?? false
      }
    })
  }

  static async acceptFriendRequest(cookie: string, requesterUserId: number) {
    const url = `https://friends.roblox.com/v1/users/${requesterUserId}/accept-friend-request`
    await requestWithCsrf(z.object({ success: z.boolean().optional() }), {
      method: 'POST',
      url,
      cookie
    })
    return { success: true }
  }

  static async declineFriendRequest(cookie: string, requesterUserId: number) {
    const url = `https://friends.roblox.com/v1/users/${requesterUserId}/decline-friend-request`
    await requestWithCsrf(z.object({ success: z.boolean().optional() }), {
      method: 'POST',
      url,
      cookie
    })
    return { success: true }
  }

  static async unfriend(cookie: string, targetUserId: number) {
    const url = `https://friends.roblox.com/v1/users/${targetUserId}/unfriend`
    await requestWithCsrf(z.object({ success: z.boolean().optional() }), {
      method: 'POST',
      url,
      cookie
    })
    return { success: true }
  }
}
