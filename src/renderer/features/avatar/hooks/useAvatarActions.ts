import { useState, useRef, useCallback, useEffect } from 'react'
import { useNotification } from '@renderer/features/system/useSnackbarStore'
import {
  useAddFavoriteItem,
  useRemoveFavoriteItem,
  useSetWearingAssets,
  useWearOutfit,
  useUpdateOutfit,
  useDeleteOutfit
} from '@renderer/features/avatar/api/useAvatar'
import {
  getAssetTypeIdByName,
  getAssetTypeIds,
  getAssetTypeNameById
} from '../categoryUtils'
import type { MainCategory } from '../categoryUtils'
import type { Account } from '@renderer/shared/types'

interface InventoryItem {
  id: number
  name: string
  type: string
  imageUrl: string
}

interface AvatarAsset {
  id: number
  name: string
  assetType: { id: number; name: string }
  currentVersionId?: number
  meta?: { order?: number; puffiness?: number; version?: number }
}

interface UseAvatarActionsOptions {
  account: Account | null
  mainCategory: MainCategory
  subCategory: string
  inventoryItems: InventoryItem[]
  currentAvatarAssets: AvatarAsset[]
  equippedIds: Set<number>
  favoriteIds: Set<number>
  renderAvatar: (userId: string) => Promise<void>
  refetchCurrentAvatar: () => Promise<any>
}

export const useAvatarActions = ({
  account,
  mainCategory,
  subCategory,
  inventoryItems,
  currentAvatarAssets,
  equippedIds,
  favoriteIds,
  renderAvatar,
  refetchCurrentAvatar
}: UseAvatarActionsOptions) => {
  const { showNotification } = useNotification()
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false)
  const [loadingItemId, setLoadingItemId] = useState<number | null>(null)
  const favoriteBurstTimeouts = useRef<Map<number, number>>(new Map())
  const [favoriteBurstKeys, setFavoriteBurstKeys] = useState<Record<number, number>>({})

  const addFavoriteMutation = useAddFavoriteItem()
  const removeFavoriteMutation = useRemoveFavoriteItem()
  const setWearingAssetsMutation = useSetWearingAssets(account)
  const wearOutfitMutation = useWearOutfit(account)
  const updateOutfitMutation = useUpdateOutfit(account)
  const deleteOutfitMutation = useDeleteOutfit(account)

  const triggerFavoriteBurst = useCallback((id: number) => {
    setFavoriteBurstKeys((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) + 1
    }))

    const existingTimeout = favoriteBurstTimeouts.current.get(id)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    const timeoutId = window.setTimeout(() => {
      setFavoriteBurstKeys((prev) => {
        const { [id]: _, ...rest } = prev
        return rest
      })
      favoriteBurstTimeouts.current.delete(id)
    }, 900)

    favoriteBurstTimeouts.current.set(id, timeoutId)
  }, [])

  useEffect(() => {
    const timeouts = favoriteBurstTimeouts.current
    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId))
      timeouts.clear()
    }
  }, [])

  const handleFavorite = useCallback(
    async (id: number, name: string) => {
      const item = inventoryItems.find((i) => i.id === id)
      const type = item?.type || subCategory
      const isFav = favoriteIds.has(id)

      try {
        if (isFav) {
          await removeFavoriteMutation.mutateAsync(id)
          showNotification('Removed from favorites', 'info')
        } else {
          await addFavoriteMutation.mutateAsync({ id, name, type })
          triggerFavoriteBurst(id)
          showNotification('Added to favorites', 'success')
        }
      } catch (error) {
        console.error('Failed to update favorites:', error)
        showNotification('Failed to update favorites', 'error')
      }
    },
    [
      inventoryItems,
      subCategory,
      favoriteIds,
      addFavoriteMutation,
      removeFavoriteMutation,
      triggerFavoriteBurst,
      showNotification
    ]
  )

  const toggleEquip = useCallback(
    async (itemId: number) => {
      if (!account?.cookie || isUpdatingAvatar) return

      if (mainCategory === 'Characters') {
        setIsUpdatingAvatar(true)
        setLoadingItemId(itemId)
        try {
          const result = await wearOutfitMutation.mutateAsync(itemId)
          if (result.success) {
            showNotification('Outfit worn successfully', 'success')
            await renderAvatar(account.userId)
            await refetchCurrentAvatar()
          } else {
            showNotification('Failed to wear outfit', 'error')
          }
        } catch (error) {
          console.error('Error wearing outfit:', error)
          showNotification('Error wearing outfit', 'error')
        } finally {
          setIsUpdatingAvatar(false)
          setLoadingItemId(null)
        }
        return
      }

      setIsUpdatingAvatar(true)
      setLoadingItemId(itemId)
      const isRemoving = equippedIds.has(itemId)

      try {
        let newAssets: AvatarAsset[]

        if (isRemoving) {
          newAssets = currentAvatarAssets.filter((a) => a.id !== itemId)
        } else {
          const item = inventoryItems.find((i) => i.id === itemId)
          const itemName = item?.name || 'Unknown Item'
          const categoryAssetTypeIds = getAssetTypeIds(mainCategory, subCategory)
          const resolvedAssetTypeId = getAssetTypeIdByName(item?.type || '')

          let assetTypeId = resolvedAssetTypeId ?? categoryAssetTypeIds[0] ?? 0
          let assetTypeName =
            (assetTypeId > 0 ? getAssetTypeNameById(assetTypeId) : null) ||
            item?.type ||
            subCategory

          if (assetTypeId <= 0) {
            try {
              const details = await (window as any).api.getAssetDetails(account.cookie, itemId)
              assetTypeId = details.AssetTypeId || details.assetType || 8
              assetTypeName =
                getAssetTypeNameById(assetTypeId) || item?.type || assetTypeName || 'Hat'
            } catch (e) {
              console.warn('Could not fetch asset details, using default type', e)
              assetTypeId = 8
              assetTypeName = getAssetTypeNameById(assetTypeId) || 'Hat'
            }
          }

          const newAsset: AvatarAsset = {
            id: itemId,
            name: itemName,
            assetType: {
              id: assetTypeId,
              name: assetTypeName
            }
          }

          newAssets = [...currentAvatarAssets, newAsset]
        }

        const result = await setWearingAssetsMutation.mutateAsync(newAssets)

        if (!result.success) {
          console.error('Failed to equip assets', result)
          await refetchCurrentAvatar()
        } else {
          await renderAvatar(account.userId)
          await refetchCurrentAvatar()
        }
      } catch (error) {
        console.error('Error setting wearing assets:', error)
        await refetchCurrentAvatar()
      } finally {
        setIsUpdatingAvatar(false)
        setLoadingItemId(null)
      }
    },
    [
      account,
      mainCategory,
      subCategory,
      inventoryItems,
      currentAvatarAssets,
      equippedIds,
      isUpdatingAvatar,
      setWearingAssetsMutation,
      wearOutfitMutation,
      renderAvatar,
      refetchCurrentAvatar,
      showNotification
    ]
  )

  const handleRename = useCallback(
    async (outfitId: number, newName: string) => {
      if (!account?.cookie) return

      try {
        const result = await updateOutfitMutation.mutateAsync({
          outfitId,
          details: { name: newName }
        })
        if (result.success) {
          showNotification('Outfit renamed successfully', 'success')
        } else {
          showNotification('Failed to rename outfit', 'error')
        }
      } catch (error) {
        console.error('Failed to rename outfit:', error)
        showNotification('Error renaming outfit', 'error')
      }
    },
    [account, updateOutfitMutation, showNotification]
  )

  const handleUpdateWithWorn = useCallback(
    async (outfitId: number, name: string) => {
      if (!account?.cookie) return

      try {
        const avatarData = await window.api.getCurrentAvatar(account.cookie)
        const payload = {
          name: name,
          bodyColors: avatarData.bodyColors,
          assets: avatarData.assets,
          scale: avatarData.scales,
          playerAvatarType: avatarData.playerAvatarType
        }

        const result = await updateOutfitMutation.mutateAsync({ outfitId, details: payload })
        if (result.success) {
          showNotification('Outfit updated with current avatar', 'success')
        } else {
          showNotification('Failed to update outfit', 'error')
        }
      } catch (error) {
        console.error('Failed to update outfit:', error)
        showNotification('Error updating outfit', 'error')
      }
    },
    [account, updateOutfitMutation, showNotification]
  )

  const handleDeleteOutfit = useCallback(
    async (outfitId: number) => {
      if (!account?.cookie) return

      try {
        const result = await deleteOutfitMutation.mutateAsync(outfitId)
        if (result.success) {
          showNotification('Outfit deleted successfully', 'success')
        } else {
          showNotification('Failed to delete outfit', 'error')
        }
      } catch (error) {
        console.error('Failed to delete outfit:', error)
        showNotification('Error deleting outfit', 'error')
      }
    },
    [account, deleteOutfitMutation, showNotification]
  )

  return {
    isUpdatingAvatar,
    loadingItemId,
    favoriteBurstKeys,
    handleFavorite,
    toggleEquip,
    handleRename,
    handleUpdateWithWorn,
    handleDeleteOutfit
  }
}


