import {
  Star,
  BadgeCheck,
  User,
  Shirt,
  Sparkles,
  Layers,
  Box,
  Clock,
  Paintbrush,
  CircleUser
} from 'lucide-react'
import type React from 'react'
import {
  CategoryDictionary,
  SortInfo,
  SortDivision,
  AssetTypes
} from 'roavatar-renderer'

// ---------------------------------------------------------------------------
// Derive categories & subcategories from roavatar-renderer's CategoryDictionary
// ---------------------------------------------------------------------------

/** Map renderer category names → display names the app uses. */
const RENDERER_CATEGORY_MAP: Record<string, string> = {
  Recent: 'Recent',
  Avatars: 'Characters',
  Clothing: 'Clothing',
  Accessories: 'Accessories',
  Head: 'Head',
  Body: 'Body',
  Makeup: 'Makeup',
  Animations: 'Animations'
}

/** App-specific categories prepended before the renderer-derived ones. */
const APP_CATEGORIES: Record<string, string[]> = {
  Favorites: ['All'],
  'Currently Wearing': ['All']
}

/**
 * Walk the CategoryDictionary.Inventory object and build:
 *  - CATEGORIES: Record<string, string[]>  (main → subcategory names)
 *  - _subCategoryAssetIds: Record<string, number[]>  (subCategory name → asset type IDs)
 */
function buildFromDictionary() {
  const categories: Record<string, string[]> = { ...APP_CATEGORIES }
  const subCategoryAssetIds: Record<string, number[]> = {}
  const categorySubAssetIds: Record<string, Record<string, number[]>> = {}

  const inventory = (CategoryDictionary as any)['Inventory']
  if (!inventory) return { categories, subCategoryAssetIds, categorySubAssetIds }

  for (const [rendererKey, subMap] of Object.entries(inventory)) {
    const displayName = RENDERER_CATEGORY_MAP[rendererKey] || rendererKey
    const subs: string[] = []
    const displaySubAssetIds: Record<string, number[]> = {}

    for (const [subName, info] of Object.entries(subMap as Record<string, any>)) {
      // Skip dividers and hidden items (prefixed with _)
      if (info instanceof SortDivision || subName === '|' || subName.startsWith('_')) continue

      subs.push(subName)

      // Extract asset type IDs from SortInfo entries (skip outfit-type sorts)
      if (info instanceof SortInfo && info.itemCategories) {
        const ids = info.itemCategories
          .filter((ic: any) => !ic.itemType || ic.itemType === 'Asset')
          .map((ic: any) => ic.subType)
          .filter((id: number) => id > 0)
        if (ids.length > 0) {
          const uniqueIds = [...new Set(ids)]
          displaySubAssetIds[subName] = uniqueIds

          if (!(subName in subCategoryAssetIds)) {
            subCategoryAssetIds[subName] = uniqueIds
          }
        }
      }
    }

    if (subs.length > 0) {
      categories[displayName] = subs
      categorySubAssetIds[displayName] = displaySubAssetIds
    }
  }

  return { categories, subCategoryAssetIds, categorySubAssetIds }
}

const {
  categories: _builtCategories,
  subCategoryAssetIds: _subCategoryAssetIds,
  categorySubAssetIds: _categorySubAssetIds
} =
  buildFromDictionary()

// ---------------------------------------------------------------------------
// Public exports (compatible with existing consumers)
// ---------------------------------------------------------------------------

export type MainCategory = keyof typeof CATEGORIES

export const CATEGORIES: Record<string, string[]> = _builtCategories

export const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Favorites: Star,
  'Currently Wearing': BadgeCheck,
  Recent: Clock,
  Characters: User,
  Clothing: Shirt,
  Accessories: Sparkles,
  Head: CircleUser,
  Body: Layers,
  Makeup: Paintbrush,
  Animations: Box
}

/**
 * Flat lookup: subcategory display-name → array of Roblox asset type IDs.
 * Built automatically from the renderer's CategoryDictionary.
 */
export const SUB_CATEGORY_IDS: Record<string, number[]> = _subCategoryAssetIds

const CATEGORY_SUB_CATEGORY_IDS: Record<string, Record<string, number[]>> = _categorySubAssetIds

/**
 * Return the asset type IDs to query the inventory for a given category + subcategory.
 */
export const getAssetTypeIds = (_mainCategory: string, subCategory: string): number[] => {
  return CATEGORY_SUB_CATEGORY_IDS[_mainCategory]?.[subCategory] ?? SUB_CATEGORY_IDS[subCategory] ?? []
}

/**
 * Whether the main category should fetch from the user's Roblox inventory.
 * App-only categories (Favorites, Currently Wearing) and outfit categories do not.
 */
export const isInventoryCategory = (mainCategory: string): boolean => {
  return (
    mainCategory !== 'Favorites' &&
    mainCategory !== 'Currently Wearing' &&
    mainCategory !== 'Characters'
  )
}

/**
 * Build asset-type-id → human-readable name map from the renderer's AssetTypes array.
 */
export const ASSET_TYPE_NAMES: Record<number, string> = (() => {
  const map: Record<number, string> = {}
  for (let i = 0; i < AssetTypes.length; i++) {
    if (AssetTypes[i]) {
      // Insert spaces before capitals: "LeftShoeAccessory" → "Left Shoe Accessory"
      map[i] = AssetTypes[i].replace(/([a-z])([A-Z])/g, '$1 $2')
    }
  }
  return map
})()

const normalizeAssetTypeName = (value: string): string => value.replace(/\s+/g, '').toLowerCase()

const ASSET_TYPE_IDS_BY_NAME: Record<string, number> = (() => {
  const map: Record<string, number> = {}

  for (let i = 0; i < AssetTypes.length; i++) {
    const rawName = AssetTypes[i]
    if (!rawName) continue

    map[normalizeAssetTypeName(rawName)] = i

    const displayName = ASSET_TYPE_NAMES[i]
    if (displayName) {
      map[normalizeAssetTypeName(displayName)] = i
    }
  }

  return map
})()

export const getAssetTypeIdByName = (typeName: string): number | null => {
  if (!typeName) return null
  return ASSET_TYPE_IDS_BY_NAME[normalizeAssetTypeName(typeName)] ?? null
}

export const getAssetTypeNameById = (assetTypeId: number): string | null => {
  return ASSET_TYPE_NAMES[assetTypeId] ?? AssetTypes[assetTypeId] ?? null
}

export const ASSET_TYPES_WITH_MODELS = [
  8, 41, 42, 43, 44, 45, 46, 47, 19, 17, 27, 29, 28, 30, 31, 67, 70, 71, 72, 4, 40, 10,
  79
]
