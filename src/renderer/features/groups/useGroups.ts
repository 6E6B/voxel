import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import type { Account } from '@renderer/shared/types'
import {
  groupDetailsSchema,
  groupRolesResponseSchema,
  groupMembersResponseSchema,
  groupRoleMembersResponseSchema,
  groupStoreResponseSchema,
  groupSocialLinksResponseSchema,
  type GroupMembersResponse,
  type GroupRoleMembersResponse,
  type GroupStoreResponse
} from '@shared/contracts/games'
import { robloxGet, robloxDelete } from '@renderer/shared/lib/robloxApi'
import { z } from 'zod'

// Types for group data
export interface GroupMembership {
  group: {
    id: number
    name: string
    description?: string | null
    owner?: any
    memberCount?: number
    hasVerifiedBadge?: boolean
  }
  role: {
    id: number
    name: string
    rank: number
  }
  isPrimaryGroup?: boolean
  thumbnail?: string
}

export interface PendingGroupRequest {
  group: {
    id: number
    name: string
    description?: string | null
    owner?: any
    memberCount?: number
    hasVerifiedBadge?: boolean
  }
  created?: string
  thumbnail?: string
}

export interface GroupDetails {
  id: number
  name: string
  description?: string | null
  owner?: {
    hasVerifiedBadge?: boolean
    userId?: number
    username?: string
    displayName?: string
  } | null
  shout?: {
    body?: string
    poster?: any
    created: string
    updated: string
  } | null
  memberCount?: number
  isBuildersClubOnly?: boolean
  publicEntryAllowed?: boolean
  hasVerifiedBadge?: boolean
  hasSocialModules?: boolean
  isLocked?: boolean
}

export interface GroupRole {
  id: number
  name: string
  rank: number
  memberCount?: number
}

export interface GroupGame {
  id: number
  name: string
  description?: string | null
  creator?: {
    id: number
    type: string
  }
  rootPlace?: {
    id: number
    type: string
  }
  created?: string
  updated?: string
  placeVisits?: number
  thumbnailUrl?: string
}

export interface GroupSocialLink {
  id: number
  type: string
  url: string
  title: string
}

/**
 * Fetch all groups a user has joined with thumbnails
 */
export function useJoinedGroups(userId: number | null) {
  return useQuery({
    queryKey: queryKeys.groups.userGroups(userId || 0),
    queryFn: async (): Promise<GroupMembership[]> => {
      if (!userId) return []

      const groups = await window.api.getUserGroupsFull(userId)

      if (groups.length === 0) return []

      // Fetch thumbnails for all groups
      const groupIds = groups.map((g: any) => g.group.id)
      const thumbnails = await window.api.getGroupThumbnails(groupIds)

      return groups.map((g: any) => ({
        ...g,
        thumbnail: thumbnails[g.group.id] || ''
      }))
    },
    enabled: !!userId,
    staleTime: 60 * 1000 // 1 minute
  })
}

/**
 * Fetch pending group join requests for the authenticated user
 */
export function usePendingGroups(account: Account | null) {
  return useQuery({
    queryKey: queryKeys.groups.pending(account?.id || ''),
    queryFn: async (): Promise<PendingGroupRequest[]> => {
      if (!account?.cookie) return []

      const pendingGroups = await window.api.getPendingGroupRequests(account.cookie)

      if (pendingGroups.length === 0) return []

      // Fetch thumbnails for all groups
      const groupIds = pendingGroups.map((g: any) => g.group.id)
      const thumbnails = await window.api.getGroupThumbnails(groupIds)

      return pendingGroups.map((g: any) => ({
        ...g,
        thumbnail: thumbnails[g.group.id] || ''
      }))
    },
    enabled: !!account?.cookie,
    staleTime: 30 * 1000 // 30 seconds
  })
}

/**
 * Fetch detailed group info
 */
export function useGroupDetails(groupId: number | null, cookie?: string) {
  return useQuery({
    queryKey: queryKeys.groups.details(groupId || 0),
    queryFn: async (): Promise<GroupDetails | null> => {
      if (!groupId) return null
      return robloxGet(groupDetailsSchema, `https://groups.roblox.com/v1/groups/${groupId}`, cookie ? { cookie } : undefined)
    },
    enabled: !!groupId,
    staleTime: 60 * 1000 // 1 minute
  })
}

/**
 * Fetch group roles
 */
export function useGroupRoles(groupId: number | null) {
  return useQuery({
    queryKey: queryKeys.groups.roles(groupId || 0),
    queryFn: async () => {
      if (!groupId) return null
      return robloxGet(groupRolesResponseSchema, `https://groups.roblox.com/v1/groups/${groupId}/roles`)
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}

/**
 * Fetch games created by a group
 */
export function useGroupGames(groupId: number | null) {
  return useQuery({
    queryKey: queryKeys.groups.games(groupId || 0),
    queryFn: async (): Promise<GroupGame[]> => {
      if (!groupId) return []

      const response = await window.api.getGroupGames(groupId)
      const games = response.data || []

      if (games.length === 0) return games

      // Fetch thumbnails for games
      const universeIds = games.map((g: any) => g.id)
      try {
        const thumbnails = await window.api.getBatchThumbnails(universeIds)
        const thumbMap = new Map(thumbnails.data?.map((t: any) => [t.targetId, t.imageUrl]) || [])

        return games.map((game: any) => ({
          ...game,
          thumbnailUrl: thumbMap.get(game.id) || ''
        }))
      } catch {
        return games
      }
    },
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000 // 2 minutes
  })
}

/**
 * Fetch group social links
 */
export function useGroupSocialLinks(account: Account | null, groupId: number | null) {
  return useQuery({
    queryKey: queryKeys.groups.socialLinks(groupId || 0),
    queryFn: async (): Promise<GroupSocialLink[]> => {
      if (!groupId || !account?.cookie) return []
      const response = await robloxGet(groupSocialLinksResponseSchema, `https://groups.roblox.com/v1/groups/${groupId}/social-links`, { cookie: account.cookie })
      return response.data
    },
    enabled: !!groupId && !!account?.cookie,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}

/**
 * Fetch group members
 */
export function useGroupMembers(groupId: number | null, roleId?: number) {
  return useQuery({
    queryKey: queryKeys.groups.members(groupId || 0, roleId),
    queryFn: async (): Promise<{
      previousPageCursor?: string | null
      nextPageCursor?: string | null
      data: Array<GroupMembersResponse['data'][number] | GroupRoleMembersResponse['data'][number]>
    }> => {
      if (!groupId) return { data: [] }
      const params = new URLSearchParams({ sortOrder: 'Desc', limit: '10' })
      if (roleId) {
        return robloxGet(groupRoleMembersResponseSchema, `https://groups.roblox.com/v1/groups/${groupId}/roles/${roleId}/users?${params}`)
      }
      return robloxGet(groupMembersResponseSchema, `https://groups.roblox.com/v1/groups/${groupId}/users?${params}`)
    },
    enabled: !!groupId,
    staleTime: 60 * 1000 // 1 minute
  })
}

/**
 * Cancel a pending group join request
 */
export function useCancelPendingRequest(account: Account | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (groupId: number) => {
      if (!account?.cookie) throw new Error('No account cookie')
      return robloxDelete(z.object({}).passthrough(), `https://groups.roblox.com/v1/groups/${groupId}/join-requests/users`, { cookie: account.cookie, csrf: true })
    },
    onSuccess: () => {
      // Invalidate pending groups cache
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.pending(account?.id || '') })
    }
  })
}

/**
 * Leave a group
 */
export function useLeaveGroup(account: Account | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (groupId: number) => {
      if (!account?.cookie || !account?.userId) throw new Error('No account cookie')
      return robloxDelete(z.object({}).passthrough(), `https://groups.roblox.com/v1/groups/${groupId}/users/${account.userId}`, { cookie: account.cookie, csrf: true })
    },
    onSuccess: () => {
      // Invalidate user groups cache
      if (account?.userId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.groups.userGroups(parseInt(account.userId))
        })
      }
    }
  })
}

/**
 * Search group store items with infinite scrolling
 */
export function useGroupStore(groupId: number | null, keyword?: string, cookie?: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.groups.store(groupId || 0, keyword),
    queryFn: async ({ pageParam }): Promise<GroupStoreResponse> => {
      if (!groupId) return { data: [] }
      const params = new URLSearchParams({
        category: 'All',
        creatorTargetId: groupId.toString(),
        creatorType: 'Group',
        limit: '60',
        sortOrder: 'Desc',
        sortType: 'Updated'
      })
      if (pageParam) params.append('cursor', pageParam)
      if (keyword) params.append('keyword', keyword)
      return robloxGet(groupStoreResponseSchema, `https://catalog.roblox.com/v2/search/items/details?${params}`, cookie ? { cookie } : undefined)
    },
    initialPageParam: '' as string,
    getNextPageParam: (lastPage) => lastPage.nextPageCursor || undefined,
    enabled: !!groupId,
    staleTime: 30 * 1000 // 30 seconds
  })
}

/**
 * Fetch batch user avatars with TanStack Query caching
 * This prevents duplicate requests by caching results per user ID set
 */
export function useBatchUserAvatars(userIds: number[], size: string = '150x150') {
  // Sort and deduplicate for consistent cache keys
  const sortedUniqueIds = [...new Set(userIds)].sort((a, b) => a - b)

  return useQuery<Record<number, string>>({
    queryKey: queryKeys.thumbnails.userAvatars(sortedUniqueIds, size),
    queryFn: async (): Promise<Record<number, string>> => {
      if (sortedUniqueIds.length === 0) return {}
      const result: Record<string, string | null> = await window.api.getBatchUserAvatars(
        sortedUniqueIds,
        size
      )
      // Filter out null values
      const filtered: Record<number, string> = {}
      for (const [key, value] of Object.entries(result)) {
        if (typeof value === 'string') {
          filtered[parseInt(key)] = value
        }
      }
      return filtered
    },
    enabled: sortedUniqueIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - avatars don't change often
    gcTime: 10 * 60 * 1000 // Keep in cache for 10 minutes
  })
}
