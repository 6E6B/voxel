export interface SalesItem {
  id: number
  sales: number
}

/**
 * Get sales data for a single asset from the database
 */
export async function getSalesData(assetId: number): Promise<SalesItem | null> {
  try {
    const result = await window.api.getSalesData(assetId)
    return result
  } catch (error) {
    console.error('[salesData] Failed to get sales data:', error)
    return null
  }
}

/**
 * Get sales data for multiple assets from the database
 */
export async function getBatchSalesData(assetIds: number[]): Promise<Map<number, SalesItem>> {
  try {
    const result = await window.api.getBatchSalesData(assetIds)
    const salesMap = new Map<number, SalesItem>()
    for (const [assetIdStr, sales] of Object.entries(result)) {
      const assetId = parseInt(assetIdStr, 10)
      if (!isNaN(assetId)) {
        salesMap.set(assetId, { id: assetId, sales: sales as number })
      }
    }
    return salesMap
  } catch (error) {
    console.error('[salesData] Failed to get batch sales data:', error)
    return new Map()
  }
}

/**
 * Check if sales data exists for an asset
 * Note: This now requires an async call to the database
 */
export async function hasSalesData(assetId: number): Promise<boolean> {
  const data = await getSalesData(assetId)
  return data !== null
}

export function formatNumber(num: number): string {
  return num.toLocaleString()
}
