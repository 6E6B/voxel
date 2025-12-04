import { useEffect, useState, useCallback, useRef } from 'react'
import { useRolimonsData } from '../../avatar/api/useRolimons'
import { LimitedSearchResult } from '../stores/useCommandPaletteStore'
import {
  searchService,
  RolimonsSearchResult,
  CatalogItem,
  ExportedIndexData
} from '../workers/searchService'

export { type CatalogItem, type RolimonsSearchResult }

const CATALOG_INDEX_STORAGE_KEY = 'voxel_catalog_search_index'

/**
 * Compute a simple hash for items to detect changes
 */
function computeItemsHash(items: CatalogItem[]): string {
  if (items.length === 0) return 'empty'
  const first = items[0]?.AssetId ?? 0
  const last = items[items.length - 1]?.AssetId ?? 0
  return `v1_${items.length}_${first}_${last}`
}

/**
 * Load persisted index from localStorage
 */
function loadPersistedIndex(): ExportedIndexData | null {
  try {
    const stored = localStorage.getItem(CATALOG_INDEX_STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as ExportedIndexData
  } catch (err) {
    console.warn('[useCatalogSearch] Failed to load persisted index:', err)
    return null
  }
}

/**
 * Save index to localStorage
 */
function savePersistedIndex(data: ExportedIndexData): void {
  try {
    localStorage.setItem(CATALOG_INDEX_STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.warn('[useCatalogSearch] Failed to persist index:', err)
  }
}

let catalogInitStarted = false
let rolimonsInitStarted = false

/**
 * Initialize catalog search index at app startup.
 * This should be called once in the App component to preload the search index
 * before the command palette is ever opened, preventing lag on first open.
 */
export function initCatalogSearchIndex(): void {
  if (catalogInitStarted) return
  catalogInitStarted = true

  const initCatalog = async () => {
    try {
      // Fetch catalog items from the SQLite database via IPC
      const items = await window.api.getAllCatalogItems()
      const currentHash = computeItemsHash(items)

      const persistedIndex = loadPersistedIndex()
      if (persistedIndex && persistedIndex.catalogHash === currentHash) {
        console.log('[CatalogSearch] Loading persisted index...')
        const imported = await searchService.importCatalogIndex(persistedIndex)
        if (imported) {
          console.log('[CatalogSearch] Successfully loaded persisted index')
          return
        }
        console.log('[CatalogSearch] Failed to import persisted index, rebuilding...')
      }

      console.log('[CatalogSearch] Building new catalog index...')
      searchService.initCatalog(items)

      const checkAndExport = () => {
        const currentStatus = searchService.getStatus()
        if (currentStatus.catalogReady) {
          searchService.exportCatalogIndex(currentHash).then((exportedData) => {
            if (exportedData) {
              savePersistedIndex(exportedData)
              console.log('[CatalogSearch] Index persisted for future use')
            }
          })
        } else {
          setTimeout(checkAndExport, 100)
        }
      }
      checkAndExport()
    } catch (error) {
      console.error('[CatalogSearch] Error initializing catalog:', error)
    }
  }

  initCatalog()
}

/**
 * Hook for searching limiteds (Rolimons items) using FlexSearch.
 * Indexing is done in a web worker to keep the main thread responsive.
 */
export function useLimitedsSearch(options: { maxResults?: number } = {}) {
  const { maxResults = 50 } = options
  const { data: rolimonsData, isLoading: rolimonsLoading, error } = useRolimonsData()

  const [status, setStatus] = useState({
    catalogReady: false,
    rolimonsReady: false,
    catalogCount: 0,
    rolimonsCount: 0
  })

  const [results, setResults] = useState<LimitedSearchResult[]>([])
  const latestQuery = useRef<string>('')

  useEffect(() => {
    const unsubscribe = searchService.onStatusChange(setStatus)
    return unsubscribe
  }, [])

  useEffect(() => {
    if (rolimonsInitStarted || !rolimonsData?.items || status.rolimonsReady) return
    rolimonsInitStarted = true
    searchService.initRolimons(rolimonsData.items)
  }, [rolimonsData, status.rolimonsReady])

  const resetSearch = useCallback(() => {
    latestQuery.current = ''
    setResults([])
  }, [])

  const searchLimiteds = useCallback(
    (query: string): void => {
      if (!query.trim()) {
        latestQuery.current = ''
        setResults([])
        return
      }

      latestQuery.current = query

      searchService.searchRolimons(query, maxResults).then((searchResults) => {
        if (latestQuery.current === query) {
          const converted = searchResults.map((item) => ({
            type: 'limited' as const,
            id: item.id,
            name: item.name,
            acronym: item.acronym,
            rap: item.rap,
            value: item.value,
            demand: item.demand,
            demandLabel: item.demandLabel,
            trend: item.trend,
            trendLabel: item.trendLabel,
            isProjected: item.isProjected,
            isHyped: item.isHyped,
            isRare: item.isRare
          }))
          setResults(converted)
        }
      })
    },
    [maxResults]
  )

  return {
    searchLimiteds,
    resetSearch,
    results,
    isLoading: rolimonsLoading || !status.rolimonsReady,
    error,
    itemCount: status.rolimonsCount
  }
}

/**
 * Hook for catalog items search
 */
export function useCatalogSearch(options: { maxResults?: number } = {}) {
  const { maxResults = 50 } = options

  const [status, setStatus] = useState({
    catalogReady: false,
    rolimonsReady: false,
    catalogCount: 0,
    rolimonsCount: 0
  })

  const [results, setResults] = useState<CatalogItem[]>([])
  const latestQuery = useRef<string>('')

  useEffect(() => {
    const unsubscribe = searchService.onStatusChange(setStatus)
    return unsubscribe
  }, [])

  useEffect(() => {
    initCatalogSearchIndex()
  }, [])

  const resetSearch = useCallback(() => {
    latestQuery.current = ''
    setResults([])
  }, [])

  const searchCatalog = useCallback(
    (query: string): void => {
      if (!query.trim()) {
        latestQuery.current = ''
        setResults([])
        return
      }

      latestQuery.current = query

      searchService.searchCatalog(query, maxResults).then((searchResults) => {
        if (latestQuery.current === query) {
          setResults(searchResults)
        }
      })
    },
    [maxResults]
  )

  return {
    searchCatalog,
    resetSearch,
    results,
    isLoading: !status.catalogReady,
    itemCount: status.catalogCount,
    isReady: status.catalogReady
  }
}

/**
 * Hook to get all limited items sorted by value/rap
 * Kept for backwards compatibility
 */
export function useAllLimiteds() {
  const { data: rolimonsData, isLoading } = useRolimonsData()

  const allLimiteds = rolimonsData?.items
    ? Object.entries(rolimonsData.items)
        .map(([idStr, data]) => {
          const id = parseInt(idStr, 10)
          const arr = data as unknown[]
          const demand = (arr[5] as number) ?? -1
          const trend = (arr[6] as number) ?? -1
          const value = arr[3] as number

          return {
            type: 'limited' as const,
            id,
            name: (arr[0] as string) || '',
            acronym: (arr[1] as string) || '',
            rap: (arr[2] as number) || 0,
            value: value === -1 ? null : value,
            demand,
            demandLabel: getDemandLabel(demand),
            trend,
            trendLabel: getTrendLabel(trend),
            isProjected: arr[7] === 1,
            isHyped: arr[8] === 1,
            isRare: arr[9] === 1
          }
        })
        .sort((a, b) => {
          const aVal = a.value ?? a.rap
          const bVal = b.value ?? b.rap
          return bVal - aVal
        })
    : []

  return {
    allLimiteds,
    isLoading
  }
}

function getDemandLabel(demand: number): string {
  const labels: Record<number, string> = {
    [-1]: 'None',
    0: 'Terrible',
    1: 'Low',
    2: 'Normal',
    3: 'High',
    4: 'Amazing'
  }
  return labels[demand] || 'Unknown'
}

function getTrendLabel(trend: number): string {
  const labels: Record<number, string> = {
    [-1]: 'None',
    0: 'Lowering',
    1: 'Unstable',
    2: 'Stable',
    3: 'Raising',
    4: 'Fluctuating'
  }
  return labels[trend] || 'Unknown'
}
