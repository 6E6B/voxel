/**
 * Web Worker for FlexSearch indexing and searching
 * Handles heavy lifting of indexing catalog database and rolimons data off the main thread
 * Supports importing/exporting indexes for persistence
 */

// @ts-nocheck - FlexSearch types are not well-maintained
import FlexSearch from 'flexsearch'

// Types for the indexed data
interface CatalogItem {
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

interface RolimonsItem {
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

// Exported index data structure
interface ExportedIndexData {
  version: number
  catalogHash: string
  catalogIndex: unknown
  catalogItems: [number, CatalogItem][]
}

// Message types
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
  | { type: 'ROLIMONS_RESULTS'; results: RolimonsItem[]; query: string }
  | { type: 'ALL_RESULTS'; catalog: CatalogItem[]; rolimons: RolimonsItem[]; query: string }
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

// Current index version - increment when index format changes
const INDEX_VERSION = 1

// Demand labels
const DEMAND_LABELS: Record<number, string> = {
  [-1]: 'None',
  0: 'Terrible',
  1: 'Low',
  2: 'Normal',
  3: 'High',
  4: 'Amazing'
}

// Trend labels
const TREND_LABELS: Record<number, string> = {
  [-1]: 'None',
  0: 'Lowering',
  1: 'Unstable',
  2: 'Stable',
  3: 'Raising',
  4: 'Fluctuating'
}

// Create simple indexes using FlexSearch Index
let catalogNameIndex = new FlexSearch.Index({
  tokenize: 'forward',
  cache: 100
})

const rolimonsNameIndex = new FlexSearch.Index({
  tokenize: 'forward',
  cache: 100
})

const rolimonsAcronymIndex = new FlexSearch.Index({
  tokenize: 'forward',
  cache: 100
})

// Store items for retrieval after search
const catalogItems = new Map<number, CatalogItem>()
const rolimonsItems = new Map<number, RolimonsItem>()

let catalogReady = false
let rolimonsReady = false
let currentCatalogHash = ''

// Parse rolimons item data array to structured object
function parseRolimonsItem(id: number, data: unknown[]): RolimonsItem {
  const demand = (data[5] as number) ?? -1
  const trend = (data[6] as number) ?? -1
  const value = data[3] as number

  return {
    id,
    name: (data[0] as string) || '',
    acronym: (data[1] as string) || '',
    rap: (data[2] as number) || 0,
    value: value === -1 ? null : value,
    demand,
    demandLabel: DEMAND_LABELS[demand] || 'Unknown',
    trend,
    trendLabel: TREND_LABELS[trend] || 'Unknown',
    isProjected: data[7] === 1,
    isHyped: data[8] === 1,
    isRare: data[9] === 1
  }
}

// Handle messages from the main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data

  try {
    switch (message.type) {
      case 'INIT_CATALOG': {
        catalogItems.clear()
        // Reset the index
        catalogNameIndex = new FlexSearch.Index({
          tokenize: 'forward',
          cache: 100
        })
        const items = message.items

        // Index all items
        for (const item of items) {
          catalogItems.set(item.AssetId, item)
          catalogNameIndex.add(item.AssetId, item.Name)
        }

        catalogReady = true
        const response: WorkerResponse = { type: 'CATALOG_INDEXED', count: catalogItems.size }
        self.postMessage(response)
        break
      }

      case 'IMPORT_CATALOG_INDEX': {
        const { data } = message

        // Validate version
        if (data.version !== INDEX_VERSION) {
          const response: WorkerResponse = {
            type: 'ERROR',
            message: `Index version mismatch: expected ${INDEX_VERSION}, got ${data.version}`
          }
          self.postMessage(response)
          break
        }

        try {
          catalogItems.clear()
          // Reset the index
          catalogNameIndex = new FlexSearch.Index({
            tokenize: 'forward',
            cache: 100
          })

          // Restore catalog items
          for (const [id, item] of data.catalogItems) {
            catalogItems.set(id, item)
          }

          // Import the FlexSearch index data
          // FlexSearch 0.8.x uses key-based export, so we import each key
          const indexData = data.catalogIndex as Record<string, string>
          for (const [key, value] of Object.entries(indexData)) {
            catalogNameIndex.import(key, value)
          }

          currentCatalogHash = data.catalogHash
          catalogReady = true

          const response: WorkerResponse = {
            type: 'CATALOG_INDEX_IMPORTED',
            count: catalogItems.size
          }
          self.postMessage(response)
        } catch (err) {
          const response: WorkerResponse = {
            type: 'ERROR',
            message: `Failed to import index: ${err instanceof Error ? err.message : 'Unknown error'}`
          }
          self.postMessage(response)
        }
        break
      }

      case 'EXPORT_CATALOG_INDEX': {
        if (!catalogReady) {
          const response: WorkerResponse = {
            type: 'ERROR',
            message: 'Catalog index not ready for export'
          }
          self.postMessage(response)
          break
        }

        try {
          // Export the FlexSearch index
          // FlexSearch 0.8.x export uses callbacks with key-value pairs
          const exportedData: Record<string, string> = {}
          let pendingExports = 0
          let exportComplete = false

          catalogNameIndex.export((key: string, data: string) => {
            if (data !== undefined) {
              exportedData[key] = data
              pendingExports++
            }
          })

          // Give FlexSearch time to complete the export
          // The export is synchronous in practice for Index type
          const exportData: ExportedIndexData = {
            version: INDEX_VERSION,
            catalogHash: message.hash,
            catalogIndex: exportedData,
            catalogItems: Array.from(catalogItems.entries())
          }

          currentCatalogHash = message.hash

          const response: WorkerResponse = {
            type: 'CATALOG_INDEX_EXPORTED',
            data: exportData
          }
          self.postMessage(response)
        } catch (err) {
          const response: WorkerResponse = {
            type: 'ERROR',
            message: `Failed to export index: ${err instanceof Error ? err.message : 'Unknown error'}`
          }
          self.postMessage(response)
        }
        break
      }

      case 'INIT_ROLIMONS': {
        rolimonsItems.clear()
        const items = message.items

        // Parse and index all items
        for (const [idStr, data] of Object.entries(items)) {
          const id = parseInt(idStr, 10)
          const parsed = parseRolimonsItem(id, data as unknown[])
          rolimonsItems.set(id, parsed)
          rolimonsNameIndex.add(id, parsed.name)
          rolimonsAcronymIndex.add(id, parsed.acronym)
        }

        rolimonsReady = true
        const response: WorkerResponse = { type: 'ROLIMONS_INDEXED', count: rolimonsItems.size }
        self.postMessage(response)
        break
      }

      case 'SEARCH_CATALOG': {
        if (!catalogReady) {
          const response: WorkerResponse = {
            type: 'CATALOG_RESULTS',
            results: [],
            query: message.query
          }
          self.postMessage(response)
          break
        }

        const maxResults = message.maxResults || 50
        const searchResults = catalogNameIndex.search(message.query, maxResults)

        // Collect results
        const results: CatalogItem[] = []
        for (const id of searchResults) {
          const item = catalogItems.get(id as number)
          if (item) {
            results.push(item)
          }
          if (results.length >= maxResults) break
        }

        const response: WorkerResponse = { type: 'CATALOG_RESULTS', results, query: message.query }
        self.postMessage(response)
        break
      }

      case 'SEARCH_ROLIMONS': {
        if (!rolimonsReady) {
          const response: WorkerResponse = {
            type: 'ROLIMONS_RESULTS',
            results: [],
            query: message.query
          }
          self.postMessage(response)
          break
        }

        const maxResults = message.maxResults || 50

        // Search both name and acronym
        const nameResults = rolimonsNameIndex.search(message.query, maxResults)
        const acronymResults = rolimonsAcronymIndex.search(message.query, maxResults)

        // Merge and deduplicate results
        const seenIds = new Set<number>()
        const results: RolimonsItem[] = []

        // Name matches first (more relevant)
        for (const id of nameResults) {
          if (!seenIds.has(id as number)) {
            seenIds.add(id as number)
            const item = rolimonsItems.get(id as number)
            if (item) results.push(item)
          }
          if (results.length >= maxResults) break
        }

        // Then acronym matches
        if (results.length < maxResults) {
          for (const id of acronymResults) {
            if (!seenIds.has(id as number)) {
              seenIds.add(id as number)
              const item = rolimonsItems.get(id as number)
              if (item) results.push(item)
            }
            if (results.length >= maxResults) break
          }
        }

        const response: WorkerResponse = { type: 'ROLIMONS_RESULTS', results, query: message.query }
        self.postMessage(response)
        break
      }

      case 'SEARCH_ALL': {
        const maxResults = message.maxResults || 50
        const halfMax = Math.ceil(maxResults / 2)

        let catalogResults: CatalogItem[] = []
        let rolimonsResults: RolimonsItem[] = []

        // Search catalog if ready
        if (catalogReady) {
          const searchResults = catalogNameIndex.search(message.query, halfMax)
          for (const id of searchResults) {
            const item = catalogItems.get(id as number)
            if (item) catalogResults.push(item)
            if (catalogResults.length >= halfMax) break
          }
        }

        // Search rolimons if ready
        if (rolimonsReady) {
          const nameResults = rolimonsNameIndex.search(message.query, halfMax)
          const acronymResults = rolimonsAcronymIndex.search(message.query, halfMax)

          const seenIds = new Set<number>()
          for (const id of nameResults) {
            if (!seenIds.has(id as number)) {
              seenIds.add(id as number)
              const item = rolimonsItems.get(id as number)
              if (item) rolimonsResults.push(item)
            }
            if (rolimonsResults.length >= halfMax) break
          }

          if (rolimonsResults.length < halfMax) {
            for (const id of acronymResults) {
              if (!seenIds.has(id as number)) {
                seenIds.add(id as number)
                const item = rolimonsItems.get(id as number)
                if (item) rolimonsResults.push(item)
              }
              if (rolimonsResults.length >= halfMax) break
            }
          }
        }

        const response: WorkerResponse = {
          type: 'ALL_RESULTS',
          catalog: catalogResults,
          rolimons: rolimonsResults,
          query: message.query
        }
        self.postMessage(response)
        break
      }

      case 'GET_STATUS': {
        const response: WorkerResponse = {
          type: 'STATUS',
          catalogReady,
          rolimonsReady,
          catalogCount: catalogItems.size,
          rolimonsCount: rolimonsItems.size
        }
        self.postMessage(response)
        break
      }

      default:
        const response: WorkerResponse = { type: 'ERROR', message: 'Unknown message type' }
        self.postMessage(response)
    }
  } catch (error) {
    const response: WorkerResponse = {
      type: 'ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
    self.postMessage(response)
  }
}

// Notify main thread that worker is ready
self.postMessage({
  type: 'STATUS',
  catalogReady: false,
  rolimonsReady: false,
  catalogCount: 0,
  rolimonsCount: 0
})
