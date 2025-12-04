/**
 * Search Service
 * Manages communication with the search worker for FlexSearch indexing and querying
 * Supports persisting indexes to avoid reindexing on every app start
 */

// Types for the indexed data (shared with worker)
export interface CatalogItem {
  AssetId: number
  Name: string
  Description: string
  AssetTypeId: number
  IsLimited: boolean
  IsLimitedUnique: boolean
  PriceInRobux: number
  IsForSale: boolean
  Sales: number
}

export interface RolimonsSearchResult {
  id: number
  name: string
  acronym: string
  rap: number
  value: number | null
  demand: number
  demandLabel: string
  trend: number
  trendLabel: string
  isProjected: boolean
  isHyped: boolean
  isRare: boolean
}

// Exported index data structure (must match worker)
export interface ExportedIndexData {
  version: number
  catalogHash: string
  catalogIndex: unknown
  catalogItems: [number, CatalogItem][]
}

// Worker message types
type WorkerMessage =
  | { type: 'INIT_CATALOG'; items: CatalogItem[] }
  | { type: 'INIT_ROLIMONS'; items: Record<string, unknown[]> }
  | { type: 'IMPORT_CATALOG_INDEX'; data: ExportedIndexData }
  | { type: 'EXPORT_CATALOG_INDEX'; hash: string }
  | { type: 'SEARCH_CATALOG'; query: string; maxResults?: number }
  | { type: 'SEARCH_ROLIMONS'; query: string; maxResults?: number }
  | { type: 'SEARCH_ALL'; query: string; maxResults?: number }
  | { type: 'GET_STATUS' }

type WorkerResponse =
  | { type: 'CATALOG_INDEXED'; count: number }
  | { type: 'ROLIMONS_INDEXED'; count: number }
  | { type: 'CATALOG_RESULTS'; results: CatalogItem[]; query: string }
  | { type: 'ROLIMONS_RESULTS'; results: RolimonsSearchResult[]; query: string }
  | { type: 'ALL_RESULTS'; catalog: CatalogItem[]; rolimons: RolimonsSearchResult[]; query: string }
  | {
      type: 'STATUS'
      catalogReady: boolean
      rolimonsReady: boolean
      catalogCount: number
      rolimonsCount: number
    }
  | { type: 'CATALOG_INDEX_EXPORTED'; data: ExportedIndexData }
  | { type: 'CATALOG_INDEX_IMPORTED'; count: number }
  | { type: 'ERROR'; message: string }

// Callback types for async operations
type SearchCallback<T> = (results: T[], query: string) => void
type StatusCallback = (status: SearchServiceStatus) => void

export interface SearchServiceStatus {
  catalogReady: boolean
  rolimonsReady: boolean
  catalogCount: number
  rolimonsCount: number
}

interface PendingSearch<T> {
  query: string
  callback: SearchCallback<T>
  timestamp: number
}

class SearchService {
  private worker: Worker | null = null
  private pendingCatalogSearches: PendingSearch<CatalogItem>[] = []
  private pendingRolimonsSearches: PendingSearch<RolimonsSearchResult>[] = []
  private statusCallbacks: StatusCallback[] = []
  private pendingExportResolve: ((data: ExportedIndexData | null) => void) | null = null
  private pendingImportResolve: ((success: boolean) => void) | null = null
  private status: SearchServiceStatus = {
    catalogReady: false,
    rolimonsReady: false,
    catalogCount: 0,
    rolimonsCount: 0
  }

  /**
   * Initialize the worker
   */
  init(): void {
    if (this.worker) return

    // Create the worker
    this.worker = new Worker(new URL('./searchWorker.ts', import.meta.url), { type: 'module' })

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      this.handleWorkerMessage(event.data)
    }

    this.worker.onerror = (error) => {
      console.error('[SearchService] Worker error:', error)
    }
  }

  /**
   * Handle messages from the worker
   */
  private handleWorkerMessage(message: WorkerResponse): void {
    switch (message.type) {
      case 'STATUS':
        this.status = {
          catalogReady: message.catalogReady,
          rolimonsReady: message.rolimonsReady,
          catalogCount: message.catalogCount,
          rolimonsCount: message.rolimonsCount
        }
        this.notifyStatusCallbacks()
        break

      case 'CATALOG_INDEXED':
        this.status.catalogReady = true
        this.status.catalogCount = message.count
        this.notifyStatusCallbacks()
        console.log(`[SearchService] Catalog indexed: ${message.count} items`)
        break

      case 'ROLIMONS_INDEXED':
        this.status.rolimonsReady = true
        this.status.rolimonsCount = message.count
        this.notifyStatusCallbacks()
        console.log(`[SearchService] Rolimons indexed: ${message.count} items`)
        break

      case 'CATALOG_RESULTS':
        // Find and resolve pending catalog searches for this query
        const catalogSearches = this.pendingCatalogSearches.filter((s) => s.query === message.query)
        catalogSearches.forEach((s) => s.callback(message.results, message.query))
        this.pendingCatalogSearches = this.pendingCatalogSearches.filter(
          (s) => s.query !== message.query
        )
        break

      case 'ROLIMONS_RESULTS':
        // Find and resolve pending rolimons searches for this query
        const rolimonsSearches = this.pendingRolimonsSearches.filter(
          (s) => s.query === message.query
        )
        rolimonsSearches.forEach((s) => s.callback(message.results, message.query))
        this.pendingRolimonsSearches = this.pendingRolimonsSearches.filter(
          (s) => s.query !== message.query
        )
        break

      case 'CATALOG_INDEX_EXPORTED':
        // Resolve pending export
        if (this.pendingExportResolve) {
          this.pendingExportResolve(message.data)
          this.pendingExportResolve = null
        }
        console.log(`[SearchService] Catalog index exported`)
        break

      case 'CATALOG_INDEX_IMPORTED':
        this.status.catalogReady = true
        this.status.catalogCount = message.count
        this.notifyStatusCallbacks()
        // Resolve pending import
        if (this.pendingImportResolve) {
          this.pendingImportResolve(true)
          this.pendingImportResolve = null
        }
        console.log(`[SearchService] Catalog index imported: ${message.count} items`)
        break

      case 'ERROR':
        console.error('[SearchService] Worker error:', message.message)
        // Reject pending operations on error
        if (this.pendingImportResolve) {
          this.pendingImportResolve(false)
          this.pendingImportResolve = null
        }
        if (this.pendingExportResolve) {
          this.pendingExportResolve(null)
          this.pendingExportResolve = null
        }
        break
    }
  }

  /**
   * Notify all status callbacks
   */
  private notifyStatusCallbacks(): void {
    this.statusCallbacks.forEach((cb) => cb(this.status))
  }

  /**
   * Subscribe to status updates
   */
  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.push(callback)
    // Immediately notify with current status
    callback(this.status)

    return () => {
      this.statusCallbacks = this.statusCallbacks.filter((cb) => cb !== callback)
    }
  }

  /**
   * Get current status
   */
  getStatus(): SearchServiceStatus {
    return this.status
  }

  /**
   * Send a message to the worker
   */
  private postMessage(message: WorkerMessage): void {
    if (!this.worker) {
      console.warn('[SearchService] Worker not initialized')
      return
    }
    this.worker.postMessage(message)
  }

  /**
   * Initialize the catalog index with items
   */
  initCatalog(items: CatalogItem[]): void {
    this.init()
    this.postMessage({ type: 'INIT_CATALOG', items })
  }

  /**
   * Initialize the rolimons index with items
   */
  initRolimons(items: Record<string, unknown[]>): void {
    this.init()
    this.postMessage({ type: 'INIT_ROLIMONS', items })
  }

  /**
   * Import a previously exported catalog index
   */
  importCatalogIndex(data: ExportedIndexData): Promise<boolean> {
    return new Promise((resolve) => {
      this.init()
      this.pendingImportResolve = resolve
      this.postMessage({ type: 'IMPORT_CATALOG_INDEX', data })

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingImportResolve) {
          this.pendingImportResolve(false)
          this.pendingImportResolve = null
        }
      }, 10000)
    })
  }

  /**
   * Export the current catalog index for persistence
   */
  exportCatalogIndex(hash: string): Promise<ExportedIndexData | null> {
    return new Promise((resolve) => {
      if (!this.status.catalogReady) {
        resolve(null)
        return
      }

      this.init()
      this.pendingExportResolve = resolve
      this.postMessage({ type: 'EXPORT_CATALOG_INDEX', hash })

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingExportResolve) {
          this.pendingExportResolve(null)
          this.pendingExportResolve = null
        }
      }, 10000)
    })
  }

  /**
   * Search the catalog
   */
  searchCatalog(query: string, maxResults: number = 50): Promise<CatalogItem[]> {
    return new Promise((resolve) => {
      if (!query.trim()) {
        resolve([])
        return
      }

      this.init()

      this.pendingCatalogSearches.push({
        query,
        callback: (results) => resolve(results),
        timestamp: Date.now()
      })

      this.postMessage({ type: 'SEARCH_CATALOG', query, maxResults })

      // Cleanup stale searches after 5 seconds
      setTimeout(() => {
        this.pendingCatalogSearches = this.pendingCatalogSearches.filter(
          (s) => Date.now() - s.timestamp < 5000
        )
      }, 5000)
    })
  }

  /**
   * Search rolimons items
   */
  searchRolimons(query: string, maxResults: number = 50): Promise<RolimonsSearchResult[]> {
    return new Promise((resolve) => {
      if (!query.trim()) {
        resolve([])
        return
      }

      this.init()

      this.pendingRolimonsSearches.push({
        query,
        callback: (results) => resolve(results),
        timestamp: Date.now()
      })

      this.postMessage({ type: 'SEARCH_ROLIMONS', query, maxResults })

      // Cleanup stale searches after 5 seconds
      setTimeout(() => {
        this.pendingRolimonsSearches = this.pendingRolimonsSearches.filter(
          (s) => Date.now() - s.timestamp < 5000
        )
      }, 5000)
    })
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.status = {
        catalogReady: false,
        rolimonsReady: false,
        catalogCount: 0,
        rolimonsCount: 0
      }
    }
  }
}

// Singleton instance
export const searchService = new SearchService()
