import { useMemo } from 'react'

interface InventoryItem {
  id: number
  name: string
  type: string
  imageUrl: string
}

interface UseInventoryFilterOptions {
  inventoryItems: InventoryItem[]
  searchQuery: string
  favoriteIds: Set<number>
}

export const useInventoryFilter = ({
  inventoryItems,
  searchQuery,
  favoriteIds
}: UseInventoryFilterOptions) => {
  const filteredItems = useMemo(() => {
    let items = inventoryItems

    if (searchQuery) {
      items = items.filter((i) => (i.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
    }

    return [...items].sort((a, b) => {
      const aFav = favoriteIds.has(a.id)
      const bFav = favoriteIds.has(b.id)
      if (aFav && !bFav) return -1
      if (!aFav && bFav) return 1
      return 0
    })
  }, [inventoryItems, searchQuery, favoriteIds])

  return { filteredItems }
}
