import Database from 'better-sqlite3'
import { app, net } from 'electron'
import path from 'path'
import fs from 'fs'
import type { CatalogIndexExport } from '@shared/ipc-schemas/avatar'

const DATABASE_DOWNLOAD_URL =
  'https://github.com/6E6B/items-dataset/releases/download/v1/roblox_items.db'

export interface CatalogDbItem {
  AssetId: number
  ProductId: number | null
  Name: string
  Description: string | null
  ProductType: string | null
  AssetTypeId: number | null
  Created: string | null
  Updated: string | null
  PriceInRobux: number | null
  Sales: number
  IsForSale: boolean
  IsLimited: boolean
  IsLimitedUnique: boolean
  CollectiblesItemDetails: string | null
}

export interface CatalogSearchResult {
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

export interface DatabaseStatus {
  exists: boolean
  downloading: boolean
  error: string | null
  path: string
}

class CatalogDatabaseService {
  private db: Database.Database | null = null
  private dbPath: string = ''
  private isDownloading: boolean = false
  private downloadError: string | null = null
  private indexPromise: Promise<CatalogIndexExport> | null = null

  constructor() {
    // Always store in userData directory for persistence
    const userDataPath = app.getPath('userData')
    const dbDir = path.join(userDataPath, 'data')
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    this.dbPath = path.join(dbDir, 'roblox_items.db')
  }

  /**
   * Get the current database status
   */
  getStatus(): DatabaseStatus {
    return {
      exists: fs.existsSync(this.dbPath),
      downloading: this.isDownloading,
      error: this.downloadError,
      path: this.dbPath
    }
  }

  /**
   * Check if the database exists
   */
  isDatabaseReady(): boolean {
    return fs.existsSync(this.dbPath)
  }

  /**
   * Download the database from GitHub
   */
  async downloadDatabase(): Promise<{ success: boolean; error?: string }> {
    if (this.isDownloading) {
      return { success: false, error: 'Download already in progress' }
    }

    if (fs.existsSync(this.dbPath)) {
      return { success: true }
    }

    this.isDownloading = true
    this.downloadError = null

    try {
      console.log(
        '[CatalogDatabaseService] Starting database download from:',
        DATABASE_DOWNLOAD_URL
      )

      const buffer = await this.fetchWithRedirects(DATABASE_DOWNLOAD_URL)

      // Write the downloaded file
      fs.writeFileSync(this.dbPath, buffer)
      console.log('[CatalogDatabaseService] Database downloaded successfully to:', this.dbPath)

      this.isDownloading = false
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[CatalogDatabaseService] Failed to download database:', errorMessage)
      this.downloadError = errorMessage
      this.isDownloading = false
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Fetch a URL following redirects (GitHub releases use redirects)
   */
  private fetchWithRedirects(url: string, maxRedirects: number = 10): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (maxRedirects <= 0) {
        reject(new Error('Too many redirects'))
        return
      }

      const request = net.request({
        method: 'GET',
        url
      })

      request.on('redirect', (statusCode, _method, redirectUrl) => {
        console.log(`[CatalogDatabaseService] Redirect ${statusCode} to:`, redirectUrl)
        request.followRedirect()
      })

      request.on('response', (response) => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode}: Failed to download database`))
          return
        }

        const chunks: Buffer[] = []

        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })

        response.on('end', () => {
          resolve(Buffer.concat(chunks))
        })

        response.on('error', (error) => {
          reject(error)
        })
      })

      request.on('error', (error) => {
        reject(error)
      })

      request.end()
    })
  }

  /**
   * Initialize the database connection
   */
  initialize(): void {
    if (this.db) return

    if (!fs.existsSync(this.dbPath)) {
      console.error('[CatalogDatabaseService] Database not found at:', this.dbPath)
      throw new Error(`Database not found. Please download it first.`)
    }

    try {
      this.db = new Database(this.dbPath, { readonly: true })
      console.log('[CatalogDatabaseService] Database opened:', this.dbPath)
    } catch (error) {
      console.error('[CatalogDatabaseService] Failed to open database:', error)
      throw error
    }
  }

  /**
   * Ensure database is initialized, downloading if necessary
   */
  private async ensureInitializedAsync(): Promise<Database.Database> {
    if (this.db) return this.db

    // If database doesn't exist, download it first
    if (!fs.existsSync(this.dbPath)) {
      console.log('[CatalogDatabaseService] Database not found, downloading...')
      const result = await this.downloadDatabase()
      if (!result.success) {
        throw new Error(result.error || 'Failed to download database')
      }
    }

    this.initialize()
    return this.db!
  }

  async getExportedIndex(): Promise<CatalogIndexExport> {
    if (this.indexPromise) return this.indexPromise

    if (!fs.existsSync(this.dbPath)) {
      const result = await this.downloadDatabase()
      if (!result.success) {
        throw new Error(result.error || 'Failed to download catalog database')
      }
    }

    const dbPath = this.dbPath

    this.indexPromise = (async () => {
      const { spawn, move } = await import('multithreading')

      const handle = spawn(move(dbPath), async (dbPath) => {
        const Database = await import('better-sqlite3')
        const FlexSearch = await import('flexsearch')

        const INDEX_VERSION = 1

        function computeHash(rows: any[]) {
          if (!rows || rows.length === 0) return 'empty'
          const first = rows[0]?.AssetId ?? 0
          const last = rows[rows.length - 1]?.AssetId ?? 0
          return `v1_${rows.length}_${first}_${last}`
        }

        function exportIndex(index: any, hash: string, catalogItems: Map<number, any>) {
          const exportedData: Record<string, any> = {}
          index.export((key: string, data: any) => {
            if (data !== undefined) {
              exportedData[key] = data
            }
          })

          return {
            version: INDEX_VERSION,
            catalogHash: hash,
            catalogIndex: exportedData,
            catalogItems: Array.from(catalogItems.entries())
          }
        }

        const db = new Database.default(dbPath, { readonly: true })
        const rows = db
          .prepare(
            `
            SELECT 
              AssetId,
              Name,
              COALESCE(Description, '') as Description,
              COALESCE(AssetTypeId, 0) as AssetTypeId,
              COALESCE(IsLimited, 0) as IsLimited,
              COALESCE(IsLimitedUnique, 0) as IsLimitedUnique,
              COALESCE(PriceInRobux, 0) as PriceInRobux,
              COALESCE(IsForSale, 0) as IsForSale,
              COALESCE(Sales, 0) as Sales
            FROM items
            ORDER BY AssetId
          `
          )
          .all()

        const IndexCtor = FlexSearch.Index || FlexSearch.default.Index || FlexSearch.default
        const index = new IndexCtor({ tokenize: 'forward', cache: 100 })
        const catalogItems = new Map()

        for (const r of rows) {
          const row = r as any
          const item = {
            AssetId: row.AssetId,
            Name: row.Name,
            Description: row.Description ?? '',
            AssetTypeId: row.AssetTypeId ?? 0,
            IsLimited: !!row.IsLimited,
            IsLimitedUnique: !!row.IsLimitedUnique,
            PriceInRobux: row.PriceInRobux ?? 0,
            IsForSale: !!row.IsForSale,
            Sales: row.Sales ?? 0
          }

          catalogItems.set(item.AssetId, item)
          index.add(item.AssetId, item.Name)
        }

        const hash = computeHash(rows)
        return exportIndex(index, hash, catalogItems)
      })

      const result = await handle.join()
      if (!result.ok) {
        throw new Error(String((result as any).error))
      }

      const { catalogIndexExportSchema } = await import('@shared/ipc-schemas/avatar')
      return catalogIndexExportSchema.parse(result.value)
    })()

    return this.indexPromise
  }

  /**
   * Get all catalog items for search indexing
   */
  async getAllItems(): Promise<CatalogSearchResult[]> {
    const db = await this.ensureInitializedAsync()

    const stmt = db.prepare(`
      SELECT 
        AssetId,
        Name,
        COALESCE(Description, '') as Description,
        COALESCE(AssetTypeId, 0) as AssetTypeId,
        COALESCE(IsLimited, 0) as IsLimited,
        COALESCE(IsLimitedUnique, 0) as IsLimitedUnique,
        COALESCE(PriceInRobux, 0) as PriceInRobux,
        COALESCE(IsForSale, 0) as IsForSale,
        COALESCE(Sales, 0) as Sales
      FROM items
      ORDER BY AssetId
    `)

    const rows = stmt.all() as Array<{
      AssetId: number
      Name: string
      Description: string
      AssetTypeId: number
      IsLimited: number
      IsLimitedUnique: number
      PriceInRobux: number
      IsForSale: number
      Sales: number
    }>

    return rows.map((row) => ({
      AssetId: row.AssetId,
      Name: row.Name,
      Description: row.Description,
      AssetTypeId: row.AssetTypeId,
      IsLimited: row.IsLimited === 1,
      IsLimitedUnique: row.IsLimitedUnique === 1,
      PriceInRobux: row.PriceInRobux,
      IsForSale: row.IsForSale === 1,
      Sales: row.Sales
    }))
  }

  /**
   * Search items by name (prefix search)
   */
  async searchByName(query: string, limit: number = 50): Promise<CatalogSearchResult[]> {
    const db = await this.ensureInitializedAsync()

    const stmt = db.prepare(`
      SELECT 
        AssetId,
        Name,
        COALESCE(Description, '') as Description,
        COALESCE(AssetTypeId, 0) as AssetTypeId,
        COALESCE(IsLimited, 0) as IsLimited,
        COALESCE(IsLimitedUnique, 0) as IsLimitedUnique,
        COALESCE(PriceInRobux, 0) as PriceInRobux,
        COALESCE(IsForSale, 0) as IsForSale,
        COALESCE(Sales, 0) as Sales
      FROM items
      WHERE Name LIKE ?
      ORDER BY 
        CASE WHEN Name LIKE ? THEN 0 ELSE 1 END,
        Sales DESC
      LIMIT ?
    `)

    const searchPattern = `%${query}%`
    const exactStartPattern = `${query}%`

    const rows = stmt.all(searchPattern, exactStartPattern, limit) as Array<{
      AssetId: number
      Name: string
      Description: string
      AssetTypeId: number
      IsLimited: number
      IsLimitedUnique: number
      PriceInRobux: number
      IsForSale: number
      Sales: number
    }>

    return rows.map((row) => ({
      AssetId: row.AssetId,
      Name: row.Name,
      Description: row.Description,
      AssetTypeId: row.AssetTypeId,
      IsLimited: row.IsLimited === 1,
      IsLimitedUnique: row.IsLimitedUnique === 1,
      PriceInRobux: row.PriceInRobux,
      IsForSale: row.IsForSale === 1,
      Sales: row.Sales
    }))
  }

  /**
   * Get item by asset ID
   */
  async getItemById(assetId: number): Promise<CatalogDbItem | null> {
    const db = await this.ensureInitializedAsync()

    const stmt = db.prepare(`
      SELECT *
      FROM items
      WHERE AssetId = ?
    `)

    const row = stmt.get(assetId) as
      | {
          AssetId: number
          ProductId: number | null
          Name: string
          Description: string | null
          ProductType: string | null
          AssetTypeId: number | null
          Created: string | null
          Updated: string | null
          PriceInRobux: number | null
          Sales: number
          IsForSale: number
          IsLimited: number
          IsLimitedUnique: number
          CollectiblesItemDetails: string | null
        }
      | undefined

    if (!row) return null

    return {
      AssetId: row.AssetId,
      ProductId: row.ProductId,
      Name: row.Name,
      Description: row.Description,
      ProductType: row.ProductType,
      AssetTypeId: row.AssetTypeId,
      Created: row.Created,
      Updated: row.Updated,
      PriceInRobux: row.PriceInRobux,
      Sales: row.Sales,
      IsForSale: row.IsForSale === 1,
      IsLimited: row.IsLimited === 1,
      IsLimitedUnique: row.IsLimitedUnique === 1,
      CollectiblesItemDetails: row.CollectiblesItemDetails
    }
  }

  /**
   * Get sales data for an asset
   */
  async getSalesData(assetId: number): Promise<{ id: number; sales: number } | null> {
    const db = await this.ensureInitializedAsync()

    const stmt = db.prepare(`
      SELECT AssetId, COALESCE(Sales, 0) as Sales
      FROM items
      WHERE AssetId = ?
    `)

    const row = stmt.get(assetId) as { AssetId: number; Sales: number } | undefined

    if (!row) return null

    return {
      id: row.AssetId,
      sales: row.Sales
    }
  }

  /**
   * Get batch sales data for multiple assets
   */
  async getBatchSalesData(assetIds: number[]): Promise<Record<number, number>> {
    if (assetIds.length === 0) return {}

    const db = await this.ensureInitializedAsync()

    const placeholders = assetIds.map(() => '?').join(',')
    const stmt = db.prepare(`
      SELECT AssetId, COALESCE(Sales, 0) as Sales
      FROM items
      WHERE AssetId IN (${placeholders})
    `)

    const rows = stmt.all(...assetIds) as Array<{ AssetId: number; Sales: number }>

    const result: Record<number, number> = {}
    for (const row of rows) {
      result[row.AssetId] = row.Sales
    }
    return result
  }

  /**
   * Get total item count
   */
  async getItemCount(): Promise<number> {
    const db = await this.ensureInitializedAsync()

    const stmt = db.prepare('SELECT COUNT(*) as count FROM items')
    const row = stmt.get() as { count: number }
    return row.count
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      console.log('[CatalogDatabaseService] Database closed')
    }
  }
}

// Singleton instance
export const catalogDatabaseService = new CatalogDatabaseService()
