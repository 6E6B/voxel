import { z } from 'zod'
import { handle } from '../core/utils/handle'
import { RobloxAuthService } from '../auth/RobloxAuthService'
import { RobloxUserService } from './UserService'

/**
 * Registers user-related IPC handlers
 */
export const registerUserHandlers = (): void => {
  handle('get-avatar-url', z.tuple([z.string()]), async (_, userId) => {
    return RobloxUserService.getAvatarUrl(userId)
  })

  handle(
    'get-batch-user-avatars',
    z.tuple([z.array(z.number()), z.string().optional()]),
    async (_, userIds, size) => {
      const resultMap = await RobloxUserService.getBatchUserAvatarHeadshots(
        userIds,
        size || '420x420'
      )
      // Convert Map to object for IPC serialization
      const resultObj: Record<number, string | null> = {}
      for (const [userId, url] of resultMap.entries()) {
        resultObj[userId] = url
      }
      return resultObj
    }
  )

  handle('get-asset-content', z.tuple([z.string()]), async (_, url) => {
    return RobloxUserService.getAssetContent(url)
  })

  handle('fetch-account-stats', z.tuple([z.string()]), async (_, cookieRaw) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    // Step 1: Get User ID
    const authData = await RobloxUserService.getAuthenticatedUser(cookie)

    // Step 2: Get Stats
    return RobloxUserService.getAccountStats(cookie, authData.id)
  })

  handle('get-account-status', z.tuple([z.string()]), async (_, cookieRaw) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    // Step 1: Get User ID
    const authData = await RobloxUserService.getAuthenticatedUser(cookie)

    // Step 2: Get Presence
    return RobloxUserService.getPresence(cookie, authData.id)
  })

  handle('get-batch-account-statuses', z.tuple([z.array(z.string())]), async (_, cookieRaws) => {
    // Extract cookies for the service, but keep original cookies for the result keys
    const cookieMap = new Map<string, string>() // original -> extracted
    const extractedCookies: string[] = []

    for (const cookieRaw of cookieRaws) {
      const extracted = RobloxAuthService.extractCookie(cookieRaw)
      cookieMap.set(cookieRaw, extracted)
      extractedCookies.push(extracted)
    }

    const results = await RobloxUserService.getBatchAccountStatuses(extractedCookies)

    // Convert Map to object for IPC serialization, using original cookies as keys
    const resultObj: Record<string, { userId: number; presence: any } | null> = {}
    for (const [originalCookie] of cookieMap.entries()) {
      const extractedCookie = cookieMap.get(originalCookie)!
      const data = results.get(extractedCookie) || null
      resultObj[originalCookie] = data
    }
    return resultObj
  })

  handle(
    'get-friends-statuses',
    z.tuple([z.string(), z.array(z.number())]),
    async (_, cookieRaw, userIds) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxUserService.getBatchPresences(cookie, userIds)
    }
  )

  handle('get-user-presence', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getPresence(cookie, userId)
  })

  handle('get-user-by-username', z.tuple([z.string()]), async (_, username) => {
    return RobloxUserService.getUserByUsername(username)
  })

  handle(
    'get-user-details-extended',
    z.tuple([z.string(), z.number()]),
    async (_, cookieRaw, userId) => {
      const cookie = RobloxAuthService.extractCookie(cookieRaw)
      return RobloxUserService.getExtendedUserDetails(cookie, userId)
    }
  )

  handle('get-user-groups', z.tuple([z.number()]), async (_, userId) => {
    return RobloxUserService.getUserGroups(userId)
  })

  handle('get-batch-user-details', z.tuple([z.array(z.number())]), async (_, userIds) => {
    const resultMap = await RobloxUserService.getBatchUserDetails(userIds)
    // Convert Map to object for IPC serialization
    const resultObj: Record<number, { id: number; name: string; displayName: string } | null> = {}
    for (const [userId, details] of resultMap.entries()) {
      resultObj[userId] = details
    }
    return resultObj
  })

  handle('get-detailed-stats', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getDetailedStats(cookie, userId)
  })

  handle('get-roblox-badges', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getRobloxBadges(cookie, userId)
  })

  handle('get-player-badges', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getPlayerBadges(cookie, userId)
  })

  handle('get-past-usernames', z.tuple([z.string(), z.number()]), async (_, cookieRaw, userId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.getPastUsernames(cookie, userId)
  })

  handle('block-user', z.tuple([z.string(), z.number()]), async (_, cookieRaw, targetUserId) => {
    const cookie = RobloxAuthService.extractCookie(cookieRaw)
    return RobloxUserService.blockUser(cookie, targetUserId)
  })
}
