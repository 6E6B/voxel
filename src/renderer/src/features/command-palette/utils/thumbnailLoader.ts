// Batched thumbnail loader - batches requests together for efficiency

type ThumbnailCallback = (url: string | null) => void

class ThumbnailBatchLoader {
  private cache = new Map<number, string>()
  private pending = new Map<number, ThumbnailCallback[]>()
  private queue = new Set<number>()
  private isProcessing = false
  private batchTimeout: ReturnType<typeof setTimeout> | null = null

  // Configuration
  private readonly BATCH_SIZE = 100 // Max items per batch request
  private readonly BATCH_DELAY = 100 // ms to wait before processing batch

  /**
   * Get a cached thumbnail URL if available
   */
  getCached(assetId: number): string | null {
    return this.cache.get(assetId) || null
  }

  /**
   * Check if a thumbnail is cached
   */
  isCached(assetId: number): boolean {
    return this.cache.has(assetId)
  }

  /**
   * Request a thumbnail. Will be batched with other requests.
   * Returns a cleanup function to cancel the request.
   */
  request(assetId: number, callback: ThumbnailCallback): () => void {
    // If already cached, call immediately
    if (this.cache.has(assetId)) {
      // Use setTimeout to avoid calling callback synchronously during render
      setTimeout(() => callback(this.cache.get(assetId)!), 0)
      return () => {}
    }

    // Add callback to pending list for this asset
    if (!this.pending.has(assetId)) {
      this.pending.set(assetId, [])
    }
    this.pending.get(assetId)!.push(callback)
    this.queue.add(assetId)

    // Schedule batch processing
    this.scheduleBatch()

    // Return cleanup function
    return () => {
      const callbacks = this.pending.get(assetId)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
          if (callbacks.length === 0) {
            this.pending.delete(assetId)
            this.queue.delete(assetId)
          }
        }
      }
    }
  }

  private scheduleBatch() {
    if (this.batchTimeout) return

    this.batchTimeout = setTimeout(() => {
      this.batchTimeout = null
      this.processBatch()
    }, this.BATCH_DELAY)
  }

  private async processBatch() {
    if (this.isProcessing || this.queue.size === 0) return

    this.isProcessing = true

    try {
      // Take up to BATCH_SIZE items
      const batchIds = Array.from(this.queue).slice(0, this.BATCH_SIZE)

      // Remove from queue
      batchIds.forEach((id) => this.queue.delete(id))

      // Fetch thumbnails
      try {
        const response = await window.api.getBatchThumbnails(batchIds, 'Asset')

        if (response.data) {
          // Create a map for quick lookup
          const resultMap = new Map<number, string | null>()
          response.data.forEach((thumb) => {
            resultMap.set(thumb.targetId, thumb.imageUrl || null)
          })

          // Process all batch IDs
          batchIds.forEach((id) => {
            const url = resultMap.get(id) || null
            if (url) {
              this.cache.set(id, url)
            }

            // Notify all callbacks for this asset
            const callbacks = this.pending.get(id)
            if (callbacks) {
              callbacks.forEach((cb) => cb(url))
              this.pending.delete(id)
            }
          })
        } else {
          // No data - notify all as failed
          batchIds.forEach((id) => {
            const callbacks = this.pending.get(id)
            if (callbacks) {
              callbacks.forEach((cb) => cb(null))
              this.pending.delete(id)
            }
          })
        }
      } catch (error) {
        console.error('Batch thumbnail fetch failed:', error)
        // Notify callbacks of failure
        batchIds.forEach((id) => {
          const callbacks = this.pending.get(id)
          if (callbacks) {
            callbacks.forEach((cb) => cb(null))
            this.pending.delete(id)
          }
        })
      }

      // If there are more items in the queue, schedule another batch
      if (this.queue.size > 0) {
        this.scheduleBatch()
      }
    } finally {
      this.isProcessing = false
    }
  }
}

// Singleton instance
export const thumbnailLoader = new ThumbnailBatchLoader()
