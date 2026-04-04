import { AssetDetails } from '@shared/contracts/avatar'

/**
 * Normalizes asset details from various API responses into a consistent format
 */
export function normalizeAssetDetails(detailsData: any): AssetDetails {
  return {
    ...detailsData,
    name: detailsData.name || detailsData.Name,
    description: detailsData.description || detailsData.Description,
    // Price logic: use price field, check purchasability
    price:
      detailsData.price !== undefined
        ? detailsData.price
        : detailsData.PriceInRobux !== undefined
          ? detailsData.PriceInRobux
          : null,
    // If offsale, price might be null or 0 depending on source, but we check other flags too
    creatorName: detailsData.creatorName || detailsData.Creator?.Name,
    creatorType: detailsData.creatorType || detailsData.Creator?.CreatorType,
    creatorHasVerifiedBadge:
      detailsData.creatorHasVerifiedBadge || detailsData.Creator?.HasVerifiedBadge,
    created: detailsData.itemCreatedUtc || detailsData.created || detailsData.Created,
    updated: detailsData.itemUpdatedUtc || detailsData.updated || detailsData.Updated,
    isLimited:
      detailsData.isLimited ||
      detailsData.IsLimited ||
      detailsData.CollectiblesItemDetails?.IsLimited,
    isLimitedUnique: detailsData.isLimitedUnique || detailsData.IsLimitedUnique,
    isPBR: detailsData.isPBR,
    itemType: detailsData.itemType || detailsData.ProductType || 'Asset',
    // Ensure flags are present
    isPurchasable: detailsData.isPurchasable,
    hasResellers: detailsData.hasResellers,
    lowestPrice: detailsData.lowestPrice,
    sales: detailsData.Sales,
    remaining:
      detailsData.Remaining !== undefined
        ? detailsData.Remaining
        : detailsData.unitsAvailableForConsumption,
    // Total quantity for limited items
    totalQuantity: detailsData.totalQuantity || detailsData.CollectiblesItemDetails?.TotalQuantity,
    // Collectible lowest resale price for limited items
    collectibleLowestResalePrice:
      detailsData.collectibleLowestResalePrice ||
      detailsData.CollectiblesItemDetails?.CollectibleLowestResalePrice
  }
}
