import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { User } from 'lucide-react'
import { Account } from '@renderer/types'
import AccessoryContextMenu from './UI/AccessoryContextMenu'
import RenameOutfitModal from './Modals/RenameOutfitModal'
import ConfirmModal from '@renderer/components/UI/dialogs/ConfirmModal'
import AccessoryDetailsModal from './Modals/AccessoryDetailsModal'
import { useNotification } from '@renderer/features/system/stores/useSnackbarStore'
import { useAvatarRenderResize } from '@renderer/hooks/useAvatarRenderResize'
import {
  useCurrentAvatar,
  useInventory,
  useUserOutfits,
  useFavoriteItems
} from '@renderer/hooks/queries'
import { useInvalidateAvatar3D } from './hooks/useAvatar3DManifest'
import { useAvatarStore } from './stores/useAvatarStore'
import { AvatarViewport } from './components/AvatarViewport'
import { InventoryGrid } from './components/InventoryGrid'
import { CategorySelector } from './components/CategorySelector'
import { SearchBar } from './components/SearchBar'
import { useInventoryFilter } from './hooks/useInventoryFilter'
import { useAvatarActions } from './hooks/useAvatarActions'
import {
  CATEGORIES,
  getAssetTypeIds,
  isInventoryCategory,
  type MainCategory
} from './utils/categoryUtils'

interface AvatarTabProps {
  account: Account | null
}

interface InventoryItem {
  id: number
  name: string
  type: string
  imageUrl: string
}

const AvatarTab: React.FC<AvatarTabProps> = ({ account }) => {
  const { showNotification } = useNotification()

  const {
    mainCategory,
    subCategory,
    searchQuery,
    scrollPosition,
    setMainCategory,
    setSubCategory,
    setSearchQuery,
    setScrollPosition
  } = useAvatarStore()

  const avatarRenderContainerRef = useRef<HTMLDivElement | null>(null)
  const { avatarRenderWidth, isResizing, handleResizeStart } =
    useAvatarRenderResize(avatarRenderContainerRef)
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024)

  const [isRendering, setIsRendering] = useState(false)
  const [renderText, setRenderText] = useState('')

  const handleRenderStart = useCallback(() => {
    setIsRendering(true)
  }, [])

  const handleRenderComplete = useCallback(() => {
    setIsRendering(false)
  }, [])

  const handleRenderError = useCallback((_error: string) => {
    setIsRendering(false)
  }, [])

  const handleRenderStatusChange = useCallback((status: string) => {
    setRenderText(status)
  }, [])

  const resetCamera = useCallback(() => {}, [])

  const renderAvatar = useCallback(async (_userId: string) => {}, [])

  const { data: currentAvatarData, refetch: refetchCurrentAvatar } = useCurrentAvatar(account)
  const { data: favoriteItems = [] } = useFavoriteItems()
  const { invalidateAvatar } = useInvalidateAvatar3D()

  const assetTypeIds = useMemo(() => {
    return getAssetTypeIds(mainCategory, subCategory)
  }, [mainCategory, subCategory])

  const isInventoryCat = isInventoryCategory(mainCategory)

  const { data: inventoryData = [], isLoading: isLoadingInventory } = useInventory(
    account,
    assetTypeIds,
    { enabled: isInventoryCat && assetTypeIds.length > 0 }
  )

  const isEditable = subCategory === 'Creations'
  const { data: outfitsData = [], isLoading: isLoadingOutfits } = useUserOutfits(
    account,
    isEditable
  )

  const equippedIds = useMemo(() => {
    return new Set<number>(currentAvatarData?.assets.map((a) => a.id) || [])
  }, [currentAvatarData])

  const currentAvatarAssets = useMemo(() => {
    return currentAvatarData?.assets || []
  }, [currentAvatarData])

  const currentBodyColors = currentAvatarData?.bodyColors || null
  const currentScales = currentAvatarData?.scales || null
  const currentAvatarType = currentAvatarData?.playerAvatarType || null

  const favoriteIds = useMemo(() => {
    return new Set<number>(favoriteItems.map((f) => f.id))
  }, [favoriteItems])

  const currentlyWearingItems = useMemo((): InventoryItem[] => {
    if (!currentAvatarData?.assets) return []
    return currentAvatarData.assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      type: asset.assetType?.name || 'Equipped Item',
      imageUrl: '' // Will be fetched separately if needed
    }))
  }, [currentAvatarData])

  const inventoryItems = useMemo((): InventoryItem[] => {
    if (mainCategory === 'Currently Wearing') {
      return currentlyWearingItems
    }
    if (mainCategory === 'Favorites') {
      return favoriteItems
    }
    if (mainCategory === 'Characters') {
      return outfitsData
    }
    return inventoryData
  }, [mainCategory, currentlyWearingItems, favoriteItems, outfitsData, inventoryData])

  const isLoading =
    mainCategory === 'Characters' ? isLoadingOutfits : isInventoryCat ? isLoadingInventory : false

  const { filteredItems } = useInventoryFilter({
    inventoryItems,
    searchQuery,
    favoriteIds
  })

  const {
    isUpdatingAvatar,
    loadingItemId,
    favoriteBurstKeys,
    handleFavorite,
    toggleEquip,
    handleRename,
    handleUpdateWithWorn,
    handleDeleteOutfit
  } = useAvatarActions({
    account,
    mainCategory,
    subCategory,
    inventoryItems,
    currentAvatarAssets,
    equippedIds,
    favoriteIds,
    renderAvatar,
    refetchCurrentAvatar
  })

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean
    outfitId: number | null
    currentName: string
  }>({ isOpen: false, outfitId: null, currentName: '' })

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    outfitId: number | null
    outfitName: string
  }>({ isOpen: false, outfitId: null, outfitName: '' })

  const [selectedAccessory, setSelectedAccessory] = useState<{
    id: number
    name: string
    imageUrl: string
  } | null>(null)

  const [contextMenu, setContextMenu] = useState<{
    id: number
    name: string
    isFavorite: boolean
    x: number
    y: number
    canEdit?: boolean
  } | null>(null)

  const handleContextMenu = (e: React.MouseEvent, item: InventoryItem) => {
    e.preventDefault()
    const isCreation = mainCategory === 'Characters' && subCategory === 'Creations'
    setContextMenu({
      id: item.id,
      name: item.name,
      isFavorite: favoriteIds.has(item.id),
      x: e.clientX,
      y: e.clientY,
      canEdit: isCreation
    })
  }

  const handleCopyId = (id: number) => {
    navigator.clipboard.writeText(id.toString())
    showNotification('Accessory ID copied to clipboard', 'success')
  }

  const handleFavoriteFromMenu = async (id: number, name: string) => {
    await handleFavorite(id, name)
  }

  const handleMainCategoryChange = (category: MainCategory) => {
    setMainCategory(category)
    setSubCategory(CATEGORIES[category][0])
    setScrollPosition(0)
  }

  const handleRefreshAvatar = async () => {
    if (account?.userId) {
      await refetchCurrentAvatar()
      invalidateAvatar(account.userId)
    }
  }

  const handleDeleteOutfitWithConfirmation = (outfitId: number, name: string) => {
    setDeleteConfirmation({
      isOpen: true,
      outfitId,
      outfitName: name
    })
  }

  const confirmDelete = async () => {
    if (!deleteConfirmation.outfitId) return
    await handleDeleteOutfit(deleteConfirmation.outfitId)
    setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }))
  }

  const openRenameModal = (id: number, currentName: string) => {
    setRenameModal({ isOpen: true, outfitId: id, currentName })
  }

  const openDetailsModal = (id: number) => {
    const item = inventoryItems.find((i) => i.id === id)
    if (item) {
      setSelectedAccessory({
        id: item.id,
        name: item.name,
        imageUrl: item.imageUrl
      })
    } else {
      setSelectedAccessory({
        id,
        name: 'Unknown Item',
        imageUrl: ''
      })
    }
  }

  const handleUpdate = async () => {
    await refetchCurrentAvatar()
    if (account?.userId) {
      invalidateAvatar(account.userId)
    }
  }

  if (!account) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-950 text-neutral-500 flex-col gap-2">
        <User size={48} className="opacity-20" />
        <p>Please select an account to view the avatar editor.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-neutral-950 animate-tab-enter overflow-hidden">
      <div className="w-full lg:w-1/2 h-full">
        <AvatarViewport
          userId={account?.userId}
          cookie={account?.cookie}
          account={account}
          currentAvatarType={
            currentAvatarType === 'R6' || currentAvatarType === 'R15' ? currentAvatarType : null
          }
          isRendering={isRendering}
          renderText={renderText}
          onRefresh={handleRefreshAvatar}
          onReset={resetCamera}
          onRenderStart={handleRenderStart}
          onRenderComplete={handleRenderComplete}
          onRenderError={handleRenderError}
          onRenderStatusChange={handleRenderStatusChange}
          isLargeScreen={isLargeScreen}
          isResizing={isResizing}
          onResizeStart={handleResizeStart}
          avatarRenderWidth={avatarRenderWidth}
          containerRef={avatarRenderContainerRef}
        />
      </div>

      <div className="w-full lg:w-1/2 h-full bg-neutral-950 flex flex-col min-w-0">
        <div className="flex flex-col border-b border-neutral-800 bg-neutral-950 z-10 shadow-sm">
          <CategorySelector
            mainCategory={mainCategory}
            subCategory={subCategory}
            onMainCategoryChange={handleMainCategoryChange}
            onSubCategoryChange={setSubCategory}
          />

          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder={`Search ${subCategory}...`}
            show={!(mainCategory === 'Body' && (subCategory === 'Skin' || subCategory === 'Scale'))}
          />
        </div>

        <InventoryGrid
          account={account}
          filteredItems={filteredItems}
          isLoading={isLoading}
          isUpdatingAvatar={isUpdatingAvatar}
          loadingItemId={loadingItemId}
          equippedIds={equippedIds}
          favoriteIds={favoriteIds}
          favoriteBurstKeys={favoriteBurstKeys}
          mainCategory={mainCategory}
          subCategory={subCategory}
          currentBodyColors={currentBodyColors}
          currentScales={currentScales}
          currentAvatarType={currentAvatarType}
          onItemClick={toggleEquip}
          onItemContextMenu={handleContextMenu}
          onUpdate={handleUpdate}
          scrollPosition={scrollPosition}
          onScroll={setScrollPosition}
        />
      </div>

      <AccessoryContextMenu
        activeMenu={contextMenu}
        onClose={() => setContextMenu(null)}
        onViewDetails={openDetailsModal}
        onFavorite={handleFavoriteFromMenu}
        onCopyId={handleCopyId}
        onRename={openRenameModal}
        onUpdate={handleUpdateWithWorn}
        onDelete={handleDeleteOutfitWithConfirmation}
      />

      <AccessoryDetailsModal
        isOpen={!!selectedAccessory}
        onClose={() => setSelectedAccessory(null)}
        assetId={selectedAccessory?.id || null}
        account={account}
        initialData={
          selectedAccessory
            ? {
                name: selectedAccessory.name,
                imageUrl: selectedAccessory.imageUrl
              }
            : undefined
        }
      />

      <RenameOutfitModal
        isOpen={renameModal.isOpen}
        onClose={() => setRenameModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleRename}
        outfitId={renameModal.outfitId}
        currentName={renameModal.currentName}
      />

      <ConfirmModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDelete}
        title="Delete Outfit"
        message={`Are you sure you want to delete the outfit "${deleteConfirmation.outfitName}"? This action cannot be undone.`}
        confirmText="Delete"
        isDangerous={true}
      />
    </div>
  )
}

export default AvatarTab
