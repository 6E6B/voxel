import { request, requestWithCsrf } from '@main/lib/request'
import { RobloxAuthService } from '../auth/RobloxAuthService'
import { z } from 'zod'
import {
  friendSchema,
  friendsPageSchema,
  followersResponseSchema,
  presenceSchema,
  userPresenceResponseSchema
} from '@shared/ipc-schemas/user'
import { avatarHeadshotSchema } from '@shared/ipc-schemas/avatar'

// We need a specific schema for the users endpoint used in hydrateUsers
const hydrateUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  displayName: z.string(),
  description: z.string().optional().nullable(),
  created: z.string().optional(),
  isBanned: z.boolean().optional(),
  externalAppDisplayName: z.string().optional().nullable(),
  hasVerifiedBadge: z.boolean().optional()
})

const hydrateUsersResponseSchema = z.object({
  data: z.array(hydrateUserSchema)
})

export class RobloxFriendService {
  static async getFriendStats(cookie: string, userId: number) {
    const countSchema = z.object({ count: z.number() })
    const userInfoSchema = z.object({
      name: z.string(),
      displayName: z.string(),
      description: z.string().optional(),
      created: z.string().optional()
    })

    const [followers, following, friends, userInfo] = await Promise.all([
      request(countSchema, {
        url: `https://friends.roblox.com/v1/users/${userId}/followers/count`,
        cookie
      }),
      request(countSchema, {
        url: `https://friends.roblox.com/v1/users/${userId}/followings/count`,
        cookie
      }),
      request(countSchema, {
        url: `https://friends.roblox.com/v1/users/${userId}/friends/count`,
        cookie
      }),
      request(userInfoSchema, { url: `https://users.roblox.com/v1/users/${userId}`, cookie })
    ])

    return {
      followerCount: followers.count,
      followingCount: following.count,
      friendCount: friends.count,
      description: userInfo.description,
      created: userInfo.created,
      username: userInfo.name,
      displayName: userInfo.displayName,
      userId: userId
    }
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

    let avatars: Record<number, string> = {}
    let presences: Record<number, any> = {}
    let userDetails: Record<number, any> = {}

    // Fetch CSRF only if we need presence data
    let csrfToken = ''
    if (!options?.skipPresence) {
      try {
        csrfToken = await RobloxAuthService.getCsrfToken(cookie)
      } catch (e) {
        console.warn('Failed to get CSRF token for presence, proceeding without presence data', e)
      }
    }

    // Avatars
    const avatarChunks = chunk(userIds, 50)
    for (const ids of avatarChunks) {
      try {
        const avatarResult = await request(z.object({ data: z.array(avatarHeadshotSchema) }), {
          url: `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids.join(',')}&size=420x420&format=Png&isCircular=false`
        })
        const avatarData = avatarResult.data || []

        avatarData.forEach((item: any) => {
          if (item.imageUrl) {
            avatars[item.targetId] = item.imageUrl
          }
        })
      } catch (e) {
        console.error('Failed to fetch avatars chunk', e)
      }
    }

    // User Details
    const userChunks = chunk(userIds, 50)
    for (const ids of userChunks) {
      try {
        const usersResult = await request(hydrateUsersResponseSchema, {
          method: 'POST',
          url: 'https://users.roblox.com/v1/users',
          body: { userIds: ids, excludeBannedUsers: false }
        })
        const userData = usersResult.data || []

        userData.forEach((u: any) => {
          userDetails[u.id] = u
        })
      } catch (e: any) {
        if (e.statusCode === 429) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
          try {
            const usersResult = await request(hydrateUsersResponseSchema, {
              method: 'POST',
              url: 'https://users.roblox.com/v1/users',
              body: { userIds: ids, excludeBannedUsers: false }
            })
            const userData = usersResult.data || []

            userData.forEach((u: any) => {
              userDetails[u.id] = u
            })
          } catch (retryErr) {
            console.error('Retry failed for user details chunk', retryErr)
          }
        } else {
          console.error('Failed to fetch user details chunk', e)
        }
      }
    }

    // Presences
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
        description: f.description || ''
      }
    })

    return {
      data,
      nextCursor: friendsResult.NextCursor ?? null,
      previousCursor: null // The friends/find endpoint doesn't support previous cursor
    }
  }

  /**
   * Get ALL friends (fetches all pages) - use for FriendsTab where all friends are needed
   */
  static async getFriends(cookie: string, userId: number, _forceRefresh: boolean = false) {
    // 1. Fetch Friends List with Pagination
    let friends: z.infer<typeof friendSchema>[] = []
    let cursor: string | null = null
    const limit = 50
    const maxPages = 100 // Limit to 5000 friends to prevent infinite loops
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
      // Continue with whatever friends we managed to fetch
    }

    if (friends.length === 0) return []

    const friendIds = friends.map((f) => f.id)
    const { avatars, userDetails, presences } = await this.hydrateUsers(cookie, friendIds)

    return friends.map((f) => {
      const p = presences[f.id]
      const u = userDetails[f.id]
      return {
        id: f.id.toString(),
        username: u ? u.name : f.name || '', // Prefer hydrated name
        displayName: u ? u.displayName : f.displayName || f.name || '', // Prefer hydrated displayName
        userId: f.id.toString(),
        avatarUrl: avatars[f.id] || '',
        userPresenceType: p ? p.userPresenceType : f.isOnline ? 1 : 0,
        lastLocation: p?.lastLocation || '',
        placeId: p?.placeId || null,
        gameId: p?.gameId || null,
        description: f.description || ''
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
        created: u.created
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
      // Followings response is identical to Followers structure
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
        created: u.created
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
      // using any for now as structure is complex, but we could refine
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
        mutualFriendsList: mutualFriends
      }
    })
  }

  static async acceptFriendRequest(cookie: string, requesterUserId: number) {
    const url = `https://friends.roblox.com/v1/users/${requesterUserId}/accept-friend-request`
    await requestWithCsrf(z.object({ success: z.boolean().optional() }), {
      // Sometimes returns {} or success: true
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
