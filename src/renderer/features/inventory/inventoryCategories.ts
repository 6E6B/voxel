import { useMemo } from 'react'
import { useCatalogNavigation } from '@renderer/features/catalog/useCatalog'
import type { CatalogCategory } from '@shared/contracts/avatar'

// Inventory categories based on Roblox Catalog API
// https://catalog.roblox.com/v1/categories

export interface InventorySubcategory {
  subcategory: string
  assetTypes: string[]
  subcategoryId: number
  name: string
}

export interface InventoryCategory {
  category: string
  assetTypes: string[]
  categoryId: number
  name: string
  orderIndex: number
  subcategories: InventorySubcategory[]
}

// Map asset type IDs to string names used by the inventory API
const ASSET_TYPE_MAP: Record<number, string> = {
  2: 'TShirt',
  8: 'Hat',
  11: 'Shirt',
  12: 'Pants',
  17: 'Head',
  18: 'Face',
  19: 'Gear',
  41: 'HairAccessory',
  42: 'FaceAccessory',
  43: 'NeckAccessory',
  44: 'ShoulderAccessory',
  45: 'FrontAccessory',
  46: 'BackAccessory',
  47: 'WaistAccessory',
  61: 'EmoteAnimation',
  64: 'TShirtAccessory',
  65: 'ShirtAccessory',
  66: 'PantsAccessory',
  67: 'JacketAccessory',
  68: 'SweaterAccessory',
  69: 'ShortsAccessory',
  72: 'DressSkirtAccessory'
}

// Convert asset type IDs to string names
const mapAssetTypeIds = (ids: number[]): string[] => {
  return ids.map((id) => ASSET_TYPE_MAP[id]).filter(Boolean)
}

const dedupeAssetTypes = (assetTypes: string[]): string[] => Array.from(new Set(assetTypes))

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
  {
    category: 'All',
    assetTypes: [
      'Hat',
      'TShirt',
      'Shirt',
      'Pants',
      'Head',
      'Face',
      'Gear',
      'HairAccessory',
      'FaceAccessory',
      'NeckAccessory',
      'ShoulderAccessory',
      'FrontAccessory',
      'BackAccessory',
      'WaistAccessory',
      'EmoteAnimation',
      'TShirtAccessory',
      'ShirtAccessory',
      'PantsAccessory',
      'JacketAccessory',
      'SweaterAccessory',
      'ShortsAccessory',
      'DressSkirtAccessory'
    ],
    categoryId: 1,
    name: 'All Items',
    orderIndex: 1,
    subcategories: []
  },
  {
    category: 'Body',
    assetTypes: mapAssetTypeIds([41, 17, 18]),
    categoryId: 18,
    name: 'Body',
    orderIndex: 2,
    subcategories: [
      {
        subcategory: 'HairAccessories',
        assetTypes: ['HairAccessory'],
        subcategoryId: 20,
        name: 'Hair'
      },
      {
        subcategory: 'Heads',
        assetTypes: ['Head'],
        subcategoryId: 15,
        name: 'Classic Heads'
      },
      {
        subcategory: 'Faces',
        assetTypes: ['Face'],
        subcategoryId: 10,
        name: 'Classic Faces'
      }
    ]
  },
  {
    category: 'Clothing',
    assetTypes: mapAssetTypeIds([11, 2, 12, 64, 65, 68, 67, 66, 69, 72]),
    categoryId: 3,
    name: 'Clothing',
    orderIndex: 3,
    subcategories: [
      {
        subcategory: 'TShirtAccessories',
        assetTypes: ['TShirtAccessory'],
        subcategoryId: 58,
        name: 'T-Shirts'
      },
      {
        subcategory: 'ShirtAccessories',
        assetTypes: ['ShirtAccessory'],
        subcategoryId: 59,
        name: 'Shirts'
      },
      {
        subcategory: 'SweaterAccessories',
        assetTypes: ['SweaterAccessory'],
        subcategoryId: 62,
        name: 'Sweaters'
      },
      {
        subcategory: 'JacketAccessories',
        assetTypes: ['JacketAccessory'],
        subcategoryId: 61,
        name: 'Jackets'
      },
      {
        subcategory: 'PantsAccessories',
        assetTypes: ['PantsAccessory'],
        subcategoryId: 60,
        name: 'Pants'
      },
      {
        subcategory: 'ShortsAccessories',
        assetTypes: ['ShortsAccessory'],
        subcategoryId: 63,
        name: 'Shorts'
      },
      {
        subcategory: 'DressSkirtAccessories',
        assetTypes: ['DressSkirtAccessory'],
        subcategoryId: 65,
        name: 'Dresses & Skirts'
      },
      {
        subcategory: 'ClassicShirts',
        assetTypes: ['Shirt'],
        subcategoryId: 56,
        name: 'Classic Shirts'
      },
      {
        subcategory: 'ClassicTShirts',
        assetTypes: ['TShirt'],
        subcategoryId: 55,
        name: 'Classic T-Shirts'
      },
      {
        subcategory: 'ClassicPants',
        assetTypes: ['Pants'],
        subcategoryId: 57,
        name: 'Classic Pants'
      }
    ]
  },
  {
    category: 'Accessories',
    assetTypes: mapAssetTypeIds([8, 42, 43, 44, 45, 46, 47, 19]),
    categoryId: 11,
    name: 'Accessories',
    orderIndex: 4,
    subcategories: [
      {
        subcategory: 'HeadAccessories',
        assetTypes: ['Hat'],
        subcategoryId: 54,
        name: 'Head'
      },
      {
        subcategory: 'FaceAccessories',
        assetTypes: ['FaceAccessory'],
        subcategoryId: 21,
        name: 'Face'
      },
      {
        subcategory: 'NeckAccessories',
        assetTypes: ['NeckAccessory'],
        subcategoryId: 22,
        name: 'Neck'
      },
      {
        subcategory: 'ShoulderAccessories',
        assetTypes: ['ShoulderAccessory'],
        subcategoryId: 23,
        name: 'Shoulder'
      },
      {
        subcategory: 'FrontAccessories',
        assetTypes: ['FrontAccessory'],
        subcategoryId: 24,
        name: 'Front'
      },
      {
        subcategory: 'BackAccessories',
        assetTypes: ['BackAccessory'],
        subcategoryId: 25,
        name: 'Back'
      },
      {
        subcategory: 'WaistAccessories',
        assetTypes: ['WaistAccessory'],
        subcategoryId: 26,
        name: 'Waist'
      },
      {
        subcategory: 'Gear',
        assetTypes: ['Gear'],
        subcategoryId: 5,
        name: 'Gear'
      }
    ]
  },
  {
    category: 'AvatarAnimations',
    assetTypes: mapAssetTypeIds([61]),
    categoryId: 12,
    name: 'Animations',
    orderIndex: 5,
    subcategories: [
      {
        subcategory: 'EmoteAnimations',
        assetTypes: ['EmoteAnimation'],
        subcategoryId: 39,
        name: 'Emotes'
      }
    ]
  }
]

const buildInventoryCategories = (catalogCategories: CatalogCategory[]): InventoryCategory[] => {
  const mappedCategories = catalogCategories
    .map((category) => {
      const subcategories = category.subcategories
        .map<InventorySubcategory | null>((subcategory) => {
          const assetTypes = dedupeAssetTypes(mapAssetTypeIds(subcategory.assetTypeIds))

          if (assetTypes.length === 0) {
            return null
          }

          return {
            subcategory: subcategory.subcategory ?? subcategory.name,
            subcategoryId: subcategory.subcategoryId ?? -1,
            name: subcategory.name,
            assetTypes
          }
        })
        .filter((subcategory): subcategory is InventorySubcategory => subcategory !== null)

      const assetTypes = dedupeAssetTypes([
        ...mapAssetTypeIds(category.assetTypeIds),
        ...subcategories.flatMap((subcategory) => subcategory.assetTypes)
      ])

      if (assetTypes.length === 0) {
        return null
      }

      return {
        category: category.category,
        categoryId: category.categoryId,
        name: category.name,
        orderIndex: category.orderIndex,
        assetTypes,
        subcategories
      }
    })
    .filter((category): category is InventoryCategory => category !== null)
    .filter((category) => category.category !== 'All' && category.name !== 'All Items')
    .sort((left, right) => left.orderIndex - right.orderIndex)

  if (mappedCategories.length === 0) {
    return INVENTORY_CATEGORIES
  }

  const allAssetTypes = dedupeAssetTypes(mappedCategories.flatMap((category) => category.assetTypes))

  return [
    {
      category: 'All',
      categoryId: 1,
      name: 'All Items',
      orderIndex: 0,
      assetTypes: allAssetTypes.length > 0 ? allAssetTypes : INVENTORY_CATEGORIES[0].assetTypes,
      subcategories: []
    },
    ...mappedCategories
  ]
}

export function useInventoryCategories() {
  const { data, isLoading, isFetching, error } = useCatalogNavigation()

  const categories = useMemo(() => {
    if (!data || data.length === 0) {
      return INVENTORY_CATEGORIES
    }

    return buildInventoryCategories(data)
  }, [data])

  return {
    categories,
    isLoading: isLoading || isFetching,
    error
  }
}
