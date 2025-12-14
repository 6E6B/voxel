import { requestWithCsrf, request } from '@main/lib/request'
import {
  thumbnail3DResponseSchema,
  thumbnailBatchSchema,
  thumbnailEntrySchema
} from '@shared/ipc-schemas/avatar'
import { z } from 'zod'

type ThumbnailEntry = z.infer<typeof thumbnailEntrySchema>

export class RobloxThumbnailService {
  private static THUMBNAIL_BATCH_LIMIT = 100
  private static thumbnailChunkPromises = new Map<string, Promise<ThumbnailEntry[]>>()

  private static chunkArray<T>(items: T[], size: number): T[][] {
    if (size <= 0 || items.length <= size) {
      return items.length ? [items.slice()] : []
    }

    const chunks: T[][] = []
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size))
    }
    return chunks
  }

  private static async fetchThumbnailChunk(
    namespace: string,
    ids: number[],
    type: 'Asset' | 'Outfit' | 'BadgeIcon' | 'GroupIcon',
    size: string,
    format: string
  ): Promise<ThumbnailEntry[]> {
    if (ids.length === 0) {
      return []
    }

    const chunkKey = `thumbnail-chunk|${namespace}|${ids.join(',')}`
    if (this.thumbnailChunkPromises.has(chunkKey)) {
      return this.thumbnailChunkPromises.get(chunkKey)!
    }

    const promise = (async () => {
      const requests = ids.map((id) => ({
        requestId: `req_${id}`,
        targetId: id,
        type,
        size,
        format,
        isCircular: false
      }))

      try {
        const response = await request(thumbnailBatchSchema, {
          method: 'POST',
          url: 'https://thumbnails.roblox.com/v1/batch',
          headers: {
            'Content-Type': 'application/json'
          },
          body: requests
        })

        return response.data || []
      } catch (error: any) {
        console.error('[RobloxThumbnailService] Failed to fetch thumbnail chunk:', error)
        return []
      }
    })()

    this.thumbnailChunkPromises.set(chunkKey, promise)

    try {
      return await promise
    } finally {
      this.thumbnailChunkPromises.delete(chunkKey)
    }
  }

  static async getBatchThumbnails(
    targetIds: number[],
    size: string = '420x420',
    format: string = 'png',
    type: 'Asset' | 'Outfit' | 'BadgeIcon' | 'GroupIcon' = 'Asset'
  ) {
    const resolvedType = type ?? 'Asset'
    const resolvedSize =
      resolvedType === 'BadgeIcon' || resolvedType === 'GroupIcon' ? '150x150' : size
    const resolvedFormat =
      resolvedType === 'BadgeIcon' || resolvedType === 'GroupIcon' ? 'Png' : format
    const sanitizedIds = Array.from(
      new Set(
        (targetIds || []).filter(
          (id): id is number => typeof id === 'number' && Number.isFinite(id)
        )
      )
    )

    if (sanitizedIds.length === 0) {
      return { data: [] }
    }

    const cacheNamespace = `${resolvedType}|${resolvedSize}|${resolvedFormat}`
    const entryMap = new Map<number, ThumbnailEntry>()

    // Fetch all IDs sequentially to avoid hitting rate limits
    const chunks = this.chunkArray(sanitizedIds, this.THUMBNAIL_BATCH_LIMIT)
    const chunkResults: ThumbnailEntry[][] = []

    for (const chunk of chunks) {
      const result = await this.fetchThumbnailChunk(
        cacheNamespace,
        chunk,
        resolvedType,
        resolvedSize,
        resolvedFormat
      )
      chunkResults.push(result)
    }

    chunkResults.forEach((entries) => {
      entries.forEach((entry) => {
        entryMap.set(entry.targetId, entry)
      })
    })

    const orderedData = sanitizedIds
      .map((id) => entryMap.get(id))
      .filter((entry): entry is ThumbnailEntry => Boolean(entry))

    return { data: orderedData }
  }

  /**
   * Fetches the 3D manifest URL for an avatar with authentication and CSRF
   * Retry/polling is handled by TanStack Query on the renderer side
   */
  static async getAvatar3DManifest(
    cookie: string,
    userId: number | string
  ): Promise<{ imageUrl: string; state: string }> {
    const url = `https://thumbnails.roblox.com/v1/users/avatar-3d?userId=${userId}`

    const data = await requestWithCsrf(thumbnail3DResponseSchema, {
      method: 'GET',
      url,
      cookie
    })

    const imageUrl = this.parseThumbnailUrl(data)
    const state = data.state || (Array.isArray(data.data) && data.data[0]?.state) || 'Unknown'

    if (state === 'Error') {
      throw new Error('Avatar thumbnail generation failed')
    }

    return { imageUrl: imageUrl || '', state }
  }

  /**
   * Fetches the 3D manifest URL for an asset with authentication and CSRF
   * Note: Caching is handled by TanStack Query on the renderer side
   */
  static async getAsset3DManifest(
    cookie: string,
    assetId: number | string
  ): Promise<{ imageUrl: string }> {
    const url = `https://thumbnails.roblox.com/v1/assets-thumbnail-3d?assetId=${assetId}`

    const data = await requestWithCsrf(thumbnail3DResponseSchema, {
      method: 'GET',
      url,
      cookie
    })

    if (data.state !== 'Completed' || !data.imageUrl) {
      throw new Error('3D thumbnail not available for this asset')
    }

    return { imageUrl: data.imageUrl }
  }

  private static parseThumbnailUrl(
    payload: z.infer<typeof thumbnail3DResponseSchema>
  ): string | undefined {
    if (!payload) return undefined
    if (typeof payload.imageUrl === 'string') return payload.imageUrl
    if (Array.isArray(payload.data) && payload.data[0]?.imageUrl) return payload.data[0].imageUrl
    return undefined
  }
}
