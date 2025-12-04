import { z } from 'zod'
import { handle } from '../core/utils/handle'
import { catalogDatabaseService } from './CatalogDatabaseService'

/**
 * Registers catalog database IPC handlers
 */
export const registerCatalogDatabaseHandlers = (): void => {
  // Get database status (exists, downloading, error)
  handle('get-catalog-db-status', z.tuple([]), async () => {
    return catalogDatabaseService.getStatus()
  })

  // Download the database if not present
  handle('download-catalog-db', z.tuple([]), async () => {
    return catalogDatabaseService.downloadDatabase()
  })

  // Get all items for search indexing
  handle('get-all-catalog-items', z.tuple([]), async () => {
    return catalogDatabaseService.getAllItems()
  })

  // Search items by name
  handle(
    'search-catalog-db',
    z.tuple([z.string(), z.number().optional()]),
    async (_, query, limit) => {
      return catalogDatabaseService.searchByName(query, limit)
    }
  )

  // Get item by ID
  handle('get-catalog-item-by-id', z.tuple([z.number()]), async (_, assetId) => {
    return catalogDatabaseService.getItemById(assetId)
  })

  // Get sales data for a single asset
  handle('get-sales-data', z.tuple([z.number()]), async (_, assetId) => {
    return catalogDatabaseService.getSalesData(assetId)
  })

  // Get batch sales data for multiple assets
  handle('get-batch-sales-data', z.tuple([z.array(z.number())]), async (_, assetIds) => {
    return catalogDatabaseService.getBatchSalesData(assetIds)
  })

  // Get total item count
  handle('get-catalog-item-count', z.tuple([]), async () => {
    return catalogDatabaseService.getItemCount()
  })
}
