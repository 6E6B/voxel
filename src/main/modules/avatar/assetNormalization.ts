/**
 * Normalize asset data from various input formats
 */
export function normalizeAssets(
  assets?: Array<{
    id?: number
    assetId?: number
    assetTypeId?: number
    assetType?: { id?: number }
  }>
): { id: number; assetTypeId: number }[] | undefined {
  if (!assets || !Array.isArray(assets)) {
    return undefined
  }

  const normalized = assets
    .map((asset) => {
      if (!asset) return null
      const id =
        typeof asset.id === 'number'
          ? asset.id
          : typeof asset.assetId === 'number'
            ? asset.assetId
            : undefined

      const assetTypeId =
        typeof asset.assetTypeId === 'number'
          ? asset.assetTypeId
          : typeof asset.assetType?.id === 'number'
            ? asset.assetType.id
            : undefined

      if (id === undefined || assetTypeId === undefined) {
        return null
      }

      return { id, assetTypeId }
    })
    .filter((entry): entry is { id: number; assetTypeId: number } => entry !== null)

  return normalized.length > 0 ? normalized : undefined
}

/**
 * Extract asset IDs from assets array
 */
export function extractAssetIds(assets?: { id?: number; assetId?: number }[]): number[] {
  if (!assets || !Array.isArray(assets)) return []

  const ids = assets
    .map((asset) => {
      if (!asset) return undefined
      if (typeof asset.id === 'number') return asset.id
      if (typeof asset.assetId === 'number') return asset.assetId
      return undefined
    })
    .filter((id): id is number => typeof id === 'number')

  // Roblox expects unique asset IDs
  return Array.from(new Set(ids))
}
