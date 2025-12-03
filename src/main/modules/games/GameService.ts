import { request, requestWithCsrf } from '@main/lib/request'

import { randomUUID } from 'crypto'
import { z } from 'zod'
import {
  gameThumbnailSchema,
  gameSortsSchema,
  searchResponseSchema,
  gameDetailsSchema,
  gameVoteSchema,
  pagedServerSchema,
  placeDetailsSchema,
  socialLinksResponseSchema,
  voteResponseSchema,
  gamePassesResponseSchema,
  GameDetails
} from '@shared/ipc-schemas/games'

export class RobloxGameService {
  static async getGameThumbnail16x9(universeId: number): Promise<string[]> {
    try {
      const thumbResult = await request(
        z.object({
          data: z.array(
            z.object({
              targetId: z.number().optional(),
              state: z.string().optional(),
              imageUrl: z.string().nullable().optional(),
              thumbnails: z.array(z.object({ imageUrl: z.string() })).optional()
            })
          )
        }),
        {
          url: `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=10&defaults=true&size=768x432&format=Png&isCircular=false`
        }
      )

      if (thumbResult.data && thumbResult.data.length > 0) {
        const gameData = thumbResult.data[0]
        if (gameData.thumbnails && gameData.thumbnails.length > 0) {
          return gameData.thumbnails.map((t) => t.imageUrl)
        }
      }
      return []
    } catch (e) {
      console.error('Failed to fetch 16x9 thumbnail', e)
      return []
    }
  }

  static async getGameSorts(sessionId: string = randomUUID()) {
    const result = await request(gameSortsSchema, {
      url: `https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=${sessionId}&gameSortsContext=GamesDefaultSorts`
    })

    // Handle different response structures
    let rawSorts: any[] = []
    if (result.sorts && Array.isArray(result.sorts)) {
      rawSorts = result.sorts
    } else if (result.data && Array.isArray(result.data)) {
      rawSorts = result.data
    } else if (Array.isArray(result)) {
      rawSorts = result
    }

    // Filter out non-game sorts (e.g. Filters)
    const gameSorts = rawSorts.filter((s: any) => s.contentType === 'Games' || !s.contentType)

    return gameSorts.map((s: any) => ({
      token: s.sortId || s.token || s.id, // Ensure we capture the ID
      name: s.sortDisplayName || s.name || s.displayName || 'Unknown',
      displayName: s.sortDisplayName || s.displayName || s.name || 'Unknown'
    }))
  }

  static async getGamesInSort(
    sortId: string,
    sessionId: string = randomUUID(),
    count: number = 40
  ) {
    const result = await request(
      z.object({
        games: z.array(z.any()).optional(),
        gameSortContents: z.array(z.any()).optional()
      }),
      {
        url: `https://apis.roblox.com/explore-api/v1/get-sort-content?sortId=${sortId}&sessionId=${sessionId}&count=${count}`
      }
    )

    const games = result.games || result.gameSortContents || []
    if (games.length === 0) return []

    const universeIds = games.map((g: any) => g.universeId)
    return this.hydrateGames(universeIds, games)
  }

  static async getGamesByUniverseIds(universeIds: number[]) {
    return this.hydrateGames(universeIds, [])
  }

  static async searchGames(query: string, sessionId: string = randomUUID()) {
    const result = await request(searchResponseSchema, {
      url: `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(query)}&sessionId=${sessionId}&pageType=Games`
    })

    if (!result.searchResults || result.searchResults.length === 0) return []

    // Filter for groups that contain games
    const gameGroups = result.searchResults.filter(
      (g: any) =>
        (g.contentGroupType === 'Game' || g.contentGroupType === 'Games') &&
        g.contents &&
        g.contents.length > 0
    )

    if (gameGroups.length === 0) {
      return []
    }

    // Flatten all games from all matching groups
    const allGames = gameGroups.flatMap((group: any) => group.contents)

    // Filter out invalid games (no universeId)
    const validGames = allGames.filter((g: any) => !!g.universeId)

    // Get unique universe IDs to avoid duplicates if same game appears multiple times
    const universeIds = [...new Set(validGames.map((g: any) => g.universeId))] as number[]

    return this.hydrateGames(universeIds, validGames)
  }

  // Helper to hydrate games with details and thumbnails
  private static async hydrateGames(universeIds: number[], initialData: any[]) {
    if (universeIds.length === 0) return []

    // Chunk requests if needed
    const chunk = (arr: any[], size: number) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size)
      )

    // 1. Get Details
    let detailsMap: Record<number, GameDetails> = {}

    try {
      const chunks = chunk(universeIds, 50)

      // Run sequentially instead of Promise.all to avoid 429s
      for (const ids of chunks) {
        try {
          const detailsResult = await request(z.object({ data: z.array(gameDetailsSchema) }), {
            url: `https://games.roblox.com/v1/games?universeIds=${ids.join(',')}`
          })
          const detailsData = detailsResult.data || []

          detailsData.forEach((d: GameDetails) => {
            detailsMap[d.id] = d
          })
        } catch (err: any) {
          console.error('Failed to fetch game details chunk', err)
        }
        // Small delay between chunks
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    } catch (e) {
      console.error('Failed to fetch game details', e)
    }

    // 2. Get Thumbnails
    let thumbnailsMap: Record<number, string> = {}

    try {
      const chunks = chunk(universeIds, 50)
      // Also run sequentially
      for (const ids of chunks) {
        try {
          const thumbResult = await request(z.object({ data: z.array(gameThumbnailSchema) }), {
            url: `https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids.join(',')}&size=150x150&format=Png&isCircular=false`
          })
          const thumbData = thumbResult.data || []

          thumbData.forEach((t: any) => {
            if (t.imageUrl) {
              thumbnailsMap[t.targetId] = t.imageUrl
            }
          })
        } catch (err) {
          console.error('Failed to fetch game thumbnails chunk', err)
        }
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    } catch (e) {
      console.error('Failed to fetch game thumbnails', e)
    }

    // 3. Get Votes (only if we don't have initial data)
    let votesMap: Record<number, { up: number; down: number }> = {}
    if (initialData.length === 0) {
      try {
        const chunks = chunk(universeIds, 50)
        for (const ids of chunks) {
          try {
            const votesResult = await request(z.object({ data: z.array(gameVoteSchema) }), {
              url: `https://games.roblox.com/v1/games/votes?universeIds=${ids.join(',')}`
            })
            const votesData = votesResult.data || []

            votesData.forEach((v: any) => {
              const votes = { up: v.upVotes, down: v.downVotes }
              votesMap[v.id] = votes
            })
          } catch (err) {
            console.error('Failed to fetch game votes chunk', err)
          }
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      } catch (e) {
        console.error('Failed to fetch game votes', e)
      }
    }

    // If initialData is empty (like when fetching by Place ID), we need to build it from detailsMap
    if (initialData.length === 0) {
      // Create entries from detailsMap
      initialData = Object.values(detailsMap).map((d) => ({
        universeId: d.id,
        name: d.name,
        playerCount: d.playing,
        totalVisits: d.visits,
        description: d.description,
        totalUpVotes: 0,
        totalDownVotes: 0
      }))
    }

    // Merge
    return initialData.map((g: any) => {
      const d = detailsMap[g.universeId]
      const thumb = thumbnailsMap[g.universeId]

      return {
        id: g.universeId.toString(),
        universeId: g.universeId.toString(),
        placeId: d?.rootPlaceId?.toString() || '',
        name: g.name,
        creatorName: d?.creator?.name || 'Unknown',
        creatorId: d?.creator?.id?.toString() || '',
        playing: d?.playing || g.playerCount || 0,
        visits: d?.visits || g.totalVisits || 0, // OmniSearch might return totalVisits
        maxPlayers: d?.maxPlayers || 0,
        genre: d?.genre || 'Unknown',
        description: d?.description || g.description || '',
        likes: votesMap[g.universeId]?.up ?? g.totalUpVotes ?? 0,
        dislikes: votesMap[g.universeId]?.down ?? g.totalDownVotes ?? 0,
        thumbnailUrl: thumb || '',
        created: d?.created || '',
        updated: d?.updated || '',
        creatorHasVerifiedBadge: d?.creator?.hasVerifiedBadge || false
      }
    })
  }

  static async getGamesByPlaceIds(placeIds: string[], cookie?: string) {
    if (!placeIds || placeIds.length === 0) return []

    // 1. Get Universe IDs from Place IDs
    let universeIds: number[] = []

    // Chunk requests
    const chunk = (arr: any[], size: number) =>
      Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size)
      )
    const placeIdChunks = chunk(placeIds, 50)

    try {
      await Promise.all(
        placeIdChunks.map(async (ids) => {
          const result = await request(z.array(placeDetailsSchema), {
            url: `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${ids.join(',')}`,
            headers: { accept: 'application/json' },
            cookie // Use cookie if available
          })
          if (result) {
            result.forEach((item) => {
              if (item.universeId) {
                universeIds.push(item.universeId)
              }
            })
          }
        })
      )
    } catch (e) {
      console.error('Failed to convert placeIds to universeIds', e)
      return []
    }

    // 2. Hydrate Games
    return this.hydrateGames(universeIds, [])
  }

  static async getUniverseIdFromPlaceId(placeId: number, cookie?: string): Promise<number | null> {
    try {
      const result = await request(z.array(placeDetailsSchema), {
        url: `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${placeId}`,
        headers: {
          accept: 'application/json'
        },
        cookie
      })
      if (result && result.length > 0) {
        return result[0].universeId || null
      }
    } catch (e) {
      console.error('Failed to convert placeId to universeId', e)
    }
    return null
  }

  static async getGameServers(
    placeId: string | number,
    cursor?: string,
    limit: number = 100,
    sortOrder: 'Asc' | 'Desc' = 'Desc',
    excludeFullGames: boolean = false,
    cookie?: string
  ) {
    try {
      return await request(pagedServerSchema, {
        url: `https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=${limit}&sortOrder=${sortOrder}${cursor ? `&cursor=${cursor}` : ''}${excludeFullGames ? '&excludeFullGames=true' : ''}`,
        cookie
      })
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.warn(`getGameServers returned 404 for ${placeId}, trying with Universe ID...`)
        const universeId = await this.getUniverseIdFromPlaceId(Number(placeId), cookie)
        if (universeId && universeId !== Number(placeId)) {
          return await request(pagedServerSchema, {
            url: `https://games.roblox.com/v1/games/${universeId}/servers/Public?limit=${limit}&sortOrder=${sortOrder}${cursor ? `&cursor=${cursor}` : ''}${excludeFullGames ? '&excludeFullGames=true' : ''}`,
            cookie
          })
        }
      }
      throw error
    }
  }

  static async getJoinScript(placeId: string | number, serverId: string, cookie: string) {
    return requestWithCsrf(
      z
        .object({
          joinScript: z
            .object({
              UdmuxEndpoints: z
                .array(
                  z.object({
                    Address: z.string()
                  })
                )
                .optional()
            })
            .nullish(),
          status: z.number().optional()
        })
        .passthrough(),
      {
        url: 'https://gamejoin.roblox.com/v1/join-game-instance',
        method: 'POST',
        body: {
          placeId: Number(placeId),
          isTeleport: false,
          gameId: serverId,
          gameJoinAttemptId: serverId
        },
        cookie,
        headers: {
          'X-Roblox-Place-Id': placeId.toString(),
          'User-Agent': 'Roblox/WinInet'
        }
      }
    )
  }

  static async getRegionFromAddress(address: string) {
    let cleanIp = address
    // Handle IPv4 with port
    if (address.includes('.') && address.includes(':')) {
      cleanIp = address.split(':')[0]
    }
    // Handle IPv6 with port ([ip]:port)
    else if (address.startsWith('[') && address.includes(']:')) {
      const match = address.match(/^\[(.*?)\]/)
      if (match) cleanIp = match[1]
    }

    try {
      const geoResult = await request(
        z.object({
          status: z.string(),
          countryCode: z.string().optional(),
          regionName: z.string().optional(),
          region: z.string().optional()
        }),
        {
          url: `http://ip-api.com/json/${cleanIp}`
        }
      )
      let region = 'Unknown'
      if (geoResult && geoResult.status === 'success') {
        region = `${geoResult.countryCode},${geoResult.regionName || geoResult.region}`
      }
      return region
    } catch (e) {
      console.error('Failed to lookup IP', e)
      return 'Unknown'
    }
  }

  static async getRegionsBatch(addresses: string[]) {
    // 1. Normalize and Deduplicate
    const uniqueIps = [
      ...new Set(
        addresses.map((addr) => {
          if (addr.includes('.') && addr.includes(':')) return addr.split(':')[0]
          if (addr.startsWith('[') && addr.includes(']:')) {
            const match = addr.match(/^\[(.*?)\]/)
            if (match) return match[1]
          }
          return addr
        })
      )
    ]

    // 2. Create IP to region map
    const ipToRegion: Map<string, string> = new Map()

    // 3. Fetch all IPs in batches
    // Chunk into 100s (API limit)
    const chunks: string[][] = []
    for (let i = 0; i < uniqueIps.length; i += 100) {
      chunks.push(uniqueIps.slice(i, i + 100))
    }

    for (const chunk of chunks) {
      try {
        const batchResult = await request(
          z.array(
            z.object({
              query: z.string(),
              status: z.string(),
              countryCode: z.string().optional(),
              regionName: z.string().optional(),
              region: z.string().optional()
            })
          ),
          {
            url: 'http://ip-api.com/batch',
            method: 'POST',
            body: chunk
          }
        )

        if (Array.isArray(batchResult)) {
          batchResult.forEach((res) => {
            if (res && res.query) {
              let region = 'Unknown'
              if (res.status === 'success') {
                region = `${res.countryCode},${res.regionName || res.region}`
              }
              ipToRegion.set(res.query, region)
            }
          })
        }
      } catch (e) {
        console.error('Batch IP lookup failed', e)
      }
      // Small delay to be nice to the API if we have multiple chunks
      if (chunks.length > 1) await new Promise((r) => setTimeout(r, 1000))
    }

    // 4. Construct Result
    const result: Record<string, string> = {}
    addresses.forEach((addr) => {
      let cleanIp = addr
      if (addr.includes('.') && addr.includes(':')) cleanIp = addr.split(':')[0]
      else if (addr.startsWith('[') && addr.includes(']:')) {
        const match = addr.match(/^\[(.*?)\]/)
        if (match) cleanIp = match[1]
      }

      result[addr] = ipToRegion.get(cleanIp) || 'Unknown'
    })
    return result
  }

  static async getServerQueuePosition(
    placeId: string | number,
    serverId: string,
    cookie: string
  ): Promise<number | null> {
    try {
      const joinResult = await this.getJoinScript(placeId, serverId, cookie)

      // queuePosition is 0 when there's no queue, > 0 when queued
      if (typeof joinResult.queuePosition === 'number') {
        return joinResult.queuePosition
      }

      return null
    } catch (error) {
      console.error('[RobloxGameService] Failed to get queue position', error)
      return null
    }
  }

  static async getServerRegion(
    placeId: string | number,
    serverId: string,
    cookie: string
  ): Promise<string> {
    try {
      const joinResult = await this.getJoinScript(placeId, serverId, cookie)

      // Handle Full Servers (status 10) or Queued (status 22)
      // 10 = Game Full, 6 = Game Full/Error, 22 = Waiting in Queue
      if (joinResult.status === 10 || joinResult.status === 6) {
        console.warn('[RobloxGameService] Server full or restricted, cannot get IP directly.')
        return 'Full/Restricted'
      }
      if (joinResult.status === 22) {
        console.warn('[RobloxGameService] Server is queued, cannot get IP directly.')
        return 'Queued'
      }

      const joinScript = joinResult.joinScript

      if (!joinScript) {
        console.warn('[RobloxGameService] No joinScript found in response')
        return 'Unknown'
      }

      const address = joinScript.UdmuxEndpoints?.[0]?.Address

      if (!address) return 'Unknown'

      // 2. Get Geo Info

      return await this.getRegionFromAddress(address)
    } catch (error) {
      console.error('[RobloxGameService] Failed to get server region', error)
      throw error
    }
  }

  static async getGameSocialLinks(universeId: number, cookie?: string) {
    try {
      const result = await request(socialLinksResponseSchema, {
        url: `https://games.roblox.com/v1/games/${universeId}/social-links/list`,
        cookie
      })
      return result.data || []
    } catch (e) {
      console.error('Failed to fetch social links', e)
      return []
    }
  }

  static async voteOnGame(universeId: number, vote: boolean, cookie: string) {
    try {
      const result = await requestWithCsrf(voteResponseSchema, {
        url: `https://apis.roblox.com/voting-api/vote/asset/${universeId}?vote=${vote}`,
        method: 'POST',
        cookie
      })
      return result
    } catch (e) {
      console.error('Failed to vote on game', e)
      throw e
    }
  }

  static async getGamePasses(universeId: number, cookie?: string, pageSize: number = 50) {
    try {
      const result = await request(gamePassesResponseSchema, {
        url: `https://apis.roblox.com/game-passes/v1/universes/${universeId}/game-passes?pageSize=${pageSize}&passView=Full`,
        cookie
      })
      return result
    } catch (e) {
      console.error('Failed to fetch game passes', e)
      return { gamePasses: [], nextPageToken: null }
    }
  }
}
