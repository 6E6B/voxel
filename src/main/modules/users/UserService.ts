import { safeFetchText, request, requestWithCsrf } from '@main/lib/request'
import { z } from 'zod'
import {
  userSummarySchema,
  userGroupRoleSchema,
  robloxBadgeSchema,
  playerBadgeSchema,
  usernameHistorySchema,
  userPresenceResponseSchema
} from '@shared/ipc-schemas/user'
import { avatarHeadshotSchema } from '@shared/ipc-schemas/avatar'

export class RobloxUserService {
  static async getAuthenticatedUser(cookie: string) {
    return await request(userSummarySchema, {
      url: 'https://users.roblox.com/v1/users/authenticated',
      cookie
    })
  }

  static async getAvatarUrl(userId: string | number): Promise<string> {
    const avatarResponseSchema = z.object({
      data: z.array(avatarHeadshotSchema)
    })

    const result = await request(avatarResponseSchema, {
      url: `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
    })

    if (result.data && result.data.length > 0 && result.data[0].imageUrl) {
      return result.data[0].imageUrl
    }
    throw new Error('No avatar URL found in response')
  }

  /**
   * Batch fetch avatar headshots for multiple users at once using the thumbnails batch API.
   * Much more efficient than individual requests when fetching multiple user avatars.
   * @param userIds Array of user IDs to fetch avatars for
   * @param size Thumbnail size (default: '420x420')
   * @returns Map of userId to imageUrl (null if not found)
   */
  static async getBatchUserAvatarHeadshots(
    userIds: number[],
    size: string = '420x420'
  ): Promise<Map<number, string | null>> {
    const resultMap = new Map<number, string | null>()

    if (userIds.length === 0) {
      return resultMap
    }

    // Deduplicate and filter valid IDs
    const uniqueIds = Array.from(
      new Set(userIds.filter((id) => typeof id === 'number' && Number.isFinite(id)))
    )

    if (uniqueIds.length === 0) {
      return resultMap
    }

    // Batch API has a limit of ~100 items per request
    const BATCH_LIMIT = 100
    const chunks: number[][] = []
    for (let i = 0; i < uniqueIds.length; i += BATCH_LIMIT) {
      chunks.push(uniqueIds.slice(i, i + BATCH_LIMIT))
    }

    const thumbnailBatchSchema = z.object({
      data: z.array(
        z.object({
          targetId: z.number(),
          state: z.string(),
          imageUrl: z.string().nullable().optional(),
          version: z.string().optional()
        })
      )
    })

    // Helper function to delay execution
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    // Helper function to fetch a chunk with retry logic for rate limiting
    const fetchChunkWithRetry = async (
      chunkIds: number[],
      maxRetries: number = 3
    ): Promise<void> => {
      const requests = chunkIds.map((id) => ({
        requestId: `user_${id}`,
        targetId: id,
        type: 'AvatarHeadShot',
        size,
        format: 'png',
        isCircular: false
      }))

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await request(thumbnailBatchSchema, {
            method: 'POST',
            url: 'https://thumbnails.roblox.com/v1/batch',
            headers: {
              'Content-Type': 'application/json'
            },
            body: requests
          })

          if (response.data) {
            response.data.forEach((entry) => {
              if (entry.state === 'Completed' && entry.imageUrl) {
                resultMap.set(entry.targetId, entry.imageUrl)
              } else {
                resultMap.set(entry.targetId, null)
              }
            })
          }
          return // Success, exit retry loop
        } catch (error: any) {
          // Check if it's a rate limit error (429)
          if (error?.statusCode === 429 && attempt < maxRetries) {
            // Parse retry-after header or use exponential backoff
            const retryAfter = error?.headers?.['retry-after']
            const waitTime = retryAfter
              ? parseInt(retryAfter, 10) * 1000
              : Math.pow(2, attempt + 1) * 1000
            console.warn(
              `[RobloxUserService] Rate limited, waiting ${waitTime}ms before retry (attempt ${attempt + 1}/${maxRetries})`
            )
            await delay(waitTime)
            continue
          }

          // Non-retryable error or max retries exceeded
          console.error('[RobloxUserService] Failed to fetch batch user avatars for chunk:', error)
          chunkIds.forEach((id) => resultMap.set(id, null))
          return
        }
      }
    }

    // Process all chunks in parallel - rate limiting is handled by retry logic
    await Promise.all(chunks.map((chunk) => fetchChunkWithRetry(chunk)))

    return resultMap
  }

  static async getAccountStats(cookie: string, userId: number) {
    // Schemas for partial responses
    const countSchema = z.object({ count: z.number() })
    const currencySchema = z.object({ robux: z.number() })

    const [followers, following, friends, currency] = await Promise.all([
      request(countSchema, {
        url: `https://friends.roblox.com/v1/users/${userId}/followers/count`
      }),
      request(countSchema, {
        url: `https://friends.roblox.com/v1/users/${userId}/followings/count`
      }),
      request(countSchema, { url: `https://friends.roblox.com/v1/users/${userId}/friends/count` }),
      request(currencySchema, {
        url: `https://economy.roblox.com/v1/users/${userId}/currency`,
        cookie
      })
    ])

    return {
      followerCount: followers.count,
      followingCount: following.count,
      friendCount: friends.count,
      robuxBalance: currency.robux,
      userId: userId
    }
  }

  static async getPresence(cookie: string, userId: number) {
    const result = await requestWithCsrf(userPresenceResponseSchema, {
      method: 'POST',
      url: 'https://presence.roblox.com/v1/presence/users',
      cookie,
      body: { userIds: [userId] }
    })

    if (result.userPresences.length > 0) {
      return result.userPresences[0]
    }
    return null
  }

  /**
   * Batch get account statuses for multiple cookies.
   * This is more efficient than calling getAccountStatus for each cookie individually.
   * Returns a map of cookie -> presence data (or null if failed).
   */
  static async getBatchAccountStatuses(
    cookies: string[]
  ): Promise<Map<string, { userId: number; presence: any } | null>> {
    const result = new Map<string, { userId: number; presence: any } | null>()

    if (cookies.length === 0) {
      return result
    }

    // Step 1: Get all authenticated users in parallel
    const authResults = await Promise.allSettled(
      cookies.map((cookie) => this.getAuthenticatedUser(cookie).then((user) => ({ cookie, user })))
    )

    // Step 2: Collect all userIds and map cookies to userIds
    const cookieToUserId = new Map<string, number>()
    const userIds: number[] = []
    let firstValidCookie: string | null = null

    for (let i = 0; i < authResults.length; i++) {
      const authResult = authResults[i]
      const cookie = cookies[i]

      if (authResult.status === 'fulfilled') {
        const userId = authResult.value.user.id
        cookieToUserId.set(cookie, userId)
        userIds.push(userId)
        if (!firstValidCookie) {
          firstValidCookie = cookie
        }
      } else {
        // Failed to get authenticated user
        result.set(cookie, null)
      }
    }

    // Step 3: Batch get all presences in a single request (or chunked if needed)
    if (userIds.length > 0 && firstValidCookie) {
      try {
        // Presence API can handle up to 100 userIds at once, but let's chunk to be safe
        const chunkSize = 100
        const presenceMap = new Map<number, any>()

        for (let i = 0; i < userIds.length; i += chunkSize) {
          const chunk = userIds.slice(i, i + chunkSize)
          const presenceResult = await requestWithCsrf(userPresenceResponseSchema, {
            method: 'POST',
            url: 'https://presence.roblox.com/v1/presence/users',
            cookie: firstValidCookie,
            body: { userIds: chunk }
          })

          if (presenceResult.userPresences) {
            presenceResult.userPresences.forEach((presence: any) => {
              presenceMap.set(presence.userId, presence)
            })
          }
        }

        // Step 4: Map results back to cookies
        for (const [cookie, userId] of cookieToUserId.entries()) {
          const presence = presenceMap.get(userId) || null
          result.set(cookie, { userId, presence })
        }
      } catch (error) {
        console.error('Failed to batch get presences:', error)
        // If batch presence fails, set all to null
        for (const [cookie] of cookieToUserId.entries()) {
          result.set(cookie, null)
        }
      }
    }

    return result
  }

  static async getBatchPresences(cookie: string, userIds: number[]) {
    if (userIds.length === 0) return []

    const chunkSize = 100
    const chunks = Array.from({ length: Math.ceil(userIds.length / chunkSize) }, (_, i) =>
      userIds.slice(i * chunkSize, i * chunkSize + chunkSize)
    )

    let allPresences: any[] = []

    // Helper function to delay execution
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    // Process chunk with retry logic
    const fetchChunkWithRetry = async (chunkIds: number[], maxRetries: number = 3) => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await requestWithCsrf(userPresenceResponseSchema, {
            method: 'POST',
            url: 'https://presence.roblox.com/v1/presence/users',
            cookie,
            body: { userIds: chunkIds }
          })
          return result.userPresences || []
        } catch (error: any) {
          if (error?.statusCode === 429 && attempt < maxRetries) {
            const retryAfter = error?.headers?.['retry-after']
            const waitTime = retryAfter
              ? parseInt(retryAfter, 10) * 1000
              : Math.pow(2, attempt + 1) * 1000
            console.warn(
              `[RobloxUserService] Rate limited on presence, waiting ${waitTime}ms before retry`
            )
            await delay(waitTime)
            continue
          }
          console.error('Failed to fetch presence chunk:', error)
          return []
        }
      }
      return []
    }

    // Process all chunks in parallel with retry logic
    const results = await Promise.all(chunks.map((chunk) => fetchChunkWithRetry(chunk)))
    allPresences = results.flat()

    return allPresences
  }

  static async getUserByUsername(username: string) {
    const userSearchResponseSchema = z.object({
      data: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          displayName: z.string()
        })
      )
    })

    const result = await request(userSearchResponseSchema, {
      url: `https://users.roblox.com/v1/usernames/users`,
      method: 'POST',
      body: {
        usernames: [username],
        excludeBannedUsers: false
      }
    })

    if (result.data && result.data.length > 0) {
      const user = result.data[0]
      return {
        id: user.id,
        name: user.name,
        displayName: user.displayName
      }
    }
    throw new Error(`User with username "${username}" not found`)
  }

  static async getUserGroups(userId: number) {
    const groupRolesResponseSchema = z.object({
      data: z.array(userGroupRoleSchema)
    })

    // Using v1 as requested
    const result = await request(groupRolesResponseSchema, {
      url: `https://groups.roblox.com/v1/users/${userId}/groups/roles`
    })

    return result.data
  }

  static async getExtendedUserDetails(_cookie: string, userId: number) {
    const [premiumData, avatarThumbnail] = await Promise.all([
      request(z.boolean(), {
        url: `https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`
      }).catch(() => false),

      request(z.object({ data: z.array(avatarHeadshotSchema) }), {
        url: `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=720x720&format=Png&isCircular=false`
      }).catch(() => ({ data: [] }))
    ])

    const isPremium = premiumData === true
    const avatarImageUrl =
      avatarThumbnail.data && avatarThumbnail.data[0] ? avatarThumbnail.data[0].imageUrl : null

    return {
      isPremium,
      isAdmin: false,
      avatarImageUrl
    }
  }

  static async getAssetContent(url: string): Promise<string> {
    return safeFetchText(url)
  }

  static async getDetailedStats(_cookie: string, userId: number) {
    // 1. Join Date & Description
    const userDetails = await request(
      z.object({
        created: z.string(),
        description: z.string()
      }),
      {
        url: `https://users.roblox.com/v1/users/${userId}`
      }
    )

    // 2. Group Count
    const groups = await this.getUserGroups(userId)

    // 3. Developer Stats (Visits, Players, Favorites via Games)
    const games = await request(
      z.object({
        data: z.array(
          z.object({
            placeVisits: z.number().optional()
          })
        )
      }),
      {
        url: `https://games.roblox.com/v2/users/${userId}/games?accessFilter=2&limit=50&sortOrder=Desc`
      }
    )

    let placeVisits = 0
    if (games && games.data) {
      games.data.forEach((game: any) => {
        placeVisits += game.placeVisits || 0
      })
    }

    return {
      joinDate: userDetails.created,
      description: userDetails.description,
      groupCount: groups ? groups.length : 0,
      placeVisits
    }
  }

  static async getRobloxBadges(cookie: string, userId: number) {
    return request(z.array(robloxBadgeSchema), {
      url: `https://accountinformation.roblox.com/v1/users/${userId}/roblox-badges`,
      cookie
    })
  }

  static async getPlayerBadges(
    _cookie: string,
    userId: number,
    limit: number = 10,
    cursor?: string
  ) {
    return request(
      z.object({
        data: z.array(playerBadgeSchema),
        nextPageCursor: z.string().nullable(),
        previousPageCursor: z.string().nullable()
      }),
      {
        url: `https://badges.roblox.com/v1/users/${userId}/badges?limit=${limit}&sortOrder=Desc${cursor ? `&cursor=${cursor}` : ''}`
      }
    )
  }

  static async getPastUsernames(_cookie: string, userId: number) {
    try {
      return await request(usernameHistorySchema, {
        url: `https://users.roblox.com/v1/users/${userId}/username-history?limit=100&sortOrder=Desc`
      })
    } catch (e: any) {
      if (e.statusCode === 429) {
        console.warn(`Rate limit hit for past usernames (user ${userId}). Returning empty list.`)

        return { data: [] }
      }
      throw e
    }
  }

  static async blockUser(cookie: string, targetUserId: number) {
    await requestWithCsrf(z.object({}).passthrough(), {
      method: 'POST',
      url: `https://accountsettings.roblox.com/v1/users/${targetUserId}/block`,
      cookie
    })
    return { success: true }
  }

  /**
   * Batch fetch basic user details (id, name, displayName) for multiple users.
   * Much more efficient than calling getExtendedUserDetails for each user.
   * @param userIds Array of user IDs to fetch details for
   * @returns Map of userId to user details (null if not found)
   */
  static async getBatchUserDetails(
    userIds: number[]
  ): Promise<Map<number, { id: number; name: string; displayName: string } | null>> {
    const resultMap = new Map<number, { id: number; name: string; displayName: string } | null>()

    if (userIds.length === 0) {
      return resultMap
    }

    // Deduplicate and filter valid IDs
    const uniqueIds = Array.from(
      new Set(userIds.filter((id) => typeof id === 'number' && Number.isFinite(id)))
    )

    if (uniqueIds.length === 0) {
      return resultMap
    }

    // Batch API has a limit of ~100 items per request
    const BATCH_LIMIT = 100
    const chunks: number[][] = []
    for (let i = 0; i < uniqueIds.length; i += BATCH_LIMIT) {
      chunks.push(uniqueIds.slice(i, i + BATCH_LIMIT))
    }

    const batchUserSchema = z.object({
      data: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          displayName: z.string()
        })
      )
    })

    // Helper function to delay execution
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    // Helper function to fetch a chunk with retry logic for rate limiting
    const fetchChunkWithRetry = async (
      chunkIds: number[],
      maxRetries: number = 3
    ): Promise<void> => {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await request(batchUserSchema, {
            method: 'POST',
            url: 'https://users.roblox.com/v1/users',
            body: { userIds: chunkIds, excludeBannedUsers: false }
          })

          if (response.data) {
            response.data.forEach((user) => {
              resultMap.set(user.id, {
                id: user.id,
                name: user.name,
                displayName: user.displayName
              })
            })
          }

          // Set null for IDs that weren't returned (user not found/banned)
          chunkIds.forEach((id) => {
            if (!resultMap.has(id)) {
              resultMap.set(id, null)
            }
          })
          return // Success, exit retry loop
        } catch (error: any) {
          // Check if it's a rate limit error (429)
          if (error?.statusCode === 429 && attempt < maxRetries) {
            const retryAfter = error?.headers?.['retry-after']
            const waitTime = retryAfter
              ? parseInt(retryAfter, 10) * 1000
              : Math.pow(2, attempt + 1) * 1000
            console.warn(
              `[RobloxUserService] Rate limited on user details, waiting ${waitTime}ms before retry (attempt ${attempt + 1}/${maxRetries})`
            )
            await delay(waitTime)
            continue
          }

          console.error('[RobloxUserService] Failed to fetch batch user details for chunk:', error)
          chunkIds.forEach((id) => resultMap.set(id, null))
          return
        }
      }
    }

    // Process all chunks in parallel - rate limiting is handled by retry logic
    await Promise.all(chunks.map((chunk) => fetchChunkWithRetry(chunk)))

    return resultMap
  }
}
