import { request } from '@main/lib/request'
import { z } from 'zod'
import {
  groupGamesResponseSchema,
  groupMembersResponseSchema,
  groupRoleMembersResponseSchema,
  userGroupMembershipSchema,
  pendingGroupRequestRawSchema,
  type PendingGroupRequestRaw
} from '@shared/contracts/games'

export class RobloxGroupService {
  /**
   * Get batch group details using V2 API
   */
  static async getBatchGroupDetails(groupIds: number[]) {
    if (groupIds.length === 0) return []

    const responseSchema = z.object({
      data: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          description: z.string().nullable().optional(),
          owner: z
            .object({
              id: z.number(),
              type: z.string()
            })
            .nullable()
            .optional(),
          created: z.string().optional(),
          hasVerifiedBadge: z.boolean().optional()
        })
      )
    })

    const result = await request(responseSchema, {
      url: `https://groups.roblox.com/v2/groups?groupIds=${groupIds.join(',')}`
    })

    return result.data
  }

  /**
   * Get games created by a group
   */
  static async getGroupGames(groupId: number, cursor?: string, limit: number = 50) {
    const queryParams = new URLSearchParams({
      accessFilter: 'Public',
      limit: limit.toString(),
      sortOrder: 'Desc'
    })
    if (cursor) queryParams.append('cursor', cursor)

    return request(groupGamesResponseSchema, {
      url: `https://games.roblox.com/v2/groups/${groupId}/gamesV2?${queryParams.toString()}`
    })
  }

  /**
   * Get all groups a user has joined
   */
  static async getUserGroups(userId: number) {
    const responseSchema = z.object({
      data: z.array(userGroupMembershipSchema)
    })

    const result = await request(responseSchema, {
      url: `https://groups.roblox.com/v1/users/${userId}/groups/roles`
    })

    return result.data
  }

  /**
   * Get group members, optionally filtered by role
   */
  static async getGroupMembers(groupId: number, roleId?: number, limit: number = 25) {
    const queryParams = new URLSearchParams({
      sortOrder: 'Desc',
      limit: limit.toString()
    })

    const url =
      roleId !== undefined
        ? `https://groups.roblox.com/v1/groups/${groupId}/roles/${roleId}/users?${queryParams.toString()}`
        : `https://groups.roblox.com/v1/groups/${groupId}/users?${queryParams.toString()}`

    if (roleId !== undefined) {
      return request(groupRoleMembersResponseSchema, {
        url
      })
    }

    return request(groupMembersResponseSchema, {
      url
    })
  }

  /**
   * Get pending group join requests for the authenticated user
   */
  static async getPendingGroupRequests(cookie: string) {
    // The API returns flat group data, not nested under 'group'
    const responseSchema = z.object({
      data: z.array(pendingGroupRequestRawSchema)
    })

    const result = await request(responseSchema, {
      url: 'https://groups.roblox.com/v1/user/groups/pending',
      cookie
    })

    // Transform to the expected format with 'group' wrapper
    return result.data.map((item: PendingGroupRequestRaw) => ({
      group: {
        id: item.id,
        name: item.name,
        description: item.description,
        owner: item.owner,
        memberCount: item.memberCount,
        hasVerifiedBadge: item.hasVerifiedBadge
      },
      created: item.created
    }))
  }

  /**
   * Get group icon/thumbnail
   */
  static async getGroupThumbnails(groupIds: number[]) {
    if (groupIds.length === 0) return new Map<number, string>()

    const thumbnailSchema = z.object({
      data: z.array(
        z.object({
          targetId: z.number(),
          state: z.string(),
          imageUrl: z.string().nullable().optional()
        })
      )
    })

    const result = await request(thumbnailSchema, {
      url: `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupIds.join(',')}&size=420x420&format=Png&isCircular=false`
    })

    const thumbnailMap = new Map<number, string>()
    result.data.forEach((item) => {
      if (item.state === 'Completed' && item.imageUrl) {
        thumbnailMap.set(item.targetId, item.imageUrl)
      }
    })

    return thumbnailMap
  }

  /**
   * Get user's role in a specific group
   */
  static async getUserRoleInGroup(userId: number, groupId: number) {
    const responseSchema = z.object({
      groupId: z.number(),
      role: z
        .object({
          id: z.number(),
          name: z.string(),
          rank: z.number()
        })
        .nullable()
    })

    try {
      const result = await request(responseSchema, {
        url: `https://groups.roblox.com/v1/users/${userId}/groups/roles?groupIds=${groupId}`
      })
      return result.role
    } catch {
      return null
    }
  }

}
