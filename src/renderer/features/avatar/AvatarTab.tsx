import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw, RotateCcw, User } from 'lucide-react'
import { Account } from '@renderer/shared/types'
import AccessoryContextMenu from './components/AccessoryContextMenu'
import RenameOutfitModal from './dialogs/RenameOutfitModal'
import CreateOutfitModal from './dialogs/CreateOutfitModal'
import ConfirmModal from '@renderer/shared/ui/dialogs/ConfirmModal'
import AccessoryDetailsModal from './dialogs/AccessoryDetailsModal'
import { useNotification } from '@renderer/features/system/useSnackbarStore'
import { useAvatarRenderResize } from '@renderer/shared/hooks/useAvatarRenderResize'
import {
  useCurrentAvatar,
  useInventory,
  useUserOutfits,
  useFavoriteItems,
  useCreateOutfit
} from '@renderer/features/avatar/api/useAvatar'
import { useBatchThumbnails } from '@renderer/features/avatar/api/useBatchQueries'
import { useAvatarStore } from './useAvatarStore'
import { AvatarViewport } from './components/AvatarViewport'
import { InventoryGrid } from './components/InventoryGrid'
import { CategorySidebar, SubCategoryTabs } from './components/CategorySelector'
import { EmptyState } from '@renderer/shared/ui/feedback/EmptyState'
import { PageHeaderPortal } from '@renderer/shared/ui/navigation/PageHeaderPortal'
import { FloatingAction } from '@renderer/shared/ui/navigation/FloatingAction'
import { useInventoryFilter } from './hooks/useInventoryFilter'
import { useAvatarActions } from './hooks/useAvatarActions'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import {
  createAnchoredOverlayPosition,
  type AnchoredOverlayPosition
} from '@renderer/shared/ui/menus/anchoredPosition'
import {
  CATEGORIES,
  getAssetTypeIds,
  isInventoryCategory,
  type MainCategory
} from './categoryUtils'

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
  const queryClient = useQueryClient()

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
  const [resetCameraSignal, setResetCameraSignal] = useState(0)

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

  const resetCamera = useCallback(() => {
    setResetCameraSignal((signal) => signal + 1)
  }, [])

  const [refreshAvatarSignal, setRefreshAvatarSignal] = useState(0)

  const triggerAvatarRenderRefresh = useCallback(() => {
    setIsRendering(true)
    setRefreshAvatarSignal((signal) => signal + 1)
  }, [])

  const renderAvatar = useCallback(async (_userId: string) => {
    triggerAvatarRenderRefresh()
  }, [triggerAvatarRenderRefresh])

  const RefreshRenderIcon = ({ size = 18 }: { size?: number; className?: string }) => (
    <RefreshCw size={size} className={isRendering ? 'animate-spin' : undefined} />
  )

  const { data: currentAvatarData, refetch: refetchCurrentAvatar } = useCurrentAvatar(account)
  const { data: favoriteItems = [] } = useFavoriteItems()

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

  const currentAvatarAssetIds = useMemo(
    () => currentAvatarAssets.map((asset) => asset.id),
    [currentAvatarAssets]
  )

  const { thumbnails: currentAvatarThumbnails } = useBatchThumbnails({
    assetIds: currentAvatarAssetIds,
    enabled: currentAvatarAssetIds.length > 0
  })

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
      imageUrl: currentAvatarThumbnails[asset.id] || ''
    }))
  }, [currentAvatarData, currentAvatarThumbnails])

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

  const previousSelectionRef = useRef<{
    accountId: string
    mainCategory: MainCategory
    subCategory: string
  } | null>(null)
  const [suppressedLoadingSelectionKey, setSuppressedLoadingSelectionKey] = useState<string | null>(
    null
  )

  const accountId = account?.id || ''
  const selectionKey = `${accountId}:${mainCategory}:${subCategory}`
  const previousSelection = previousSelectionRef.current
  const didSwitchSubCategory =
    previousSelection?.accountId === accountId &&
    previousSelection.mainCategory === mainCategory &&
    previousSelection.subCategory !== subCategory

  const hasCachedSelectionData = useMemo(() => {
    if (mainCategory === 'Characters') {
      return queryClient.getQueryState(queryKeys.avatar.outfits(accountId, isEditable))?.data !== undefined
    }

    if (isInventoryCat) {
      return (
        queryClient.getQueryState(queryKeys.avatar.inventory(accountId, assetTypeIds))?.data !==
        undefined
      )
    }

    return true
  }, [accountId, assetTypeIds, isEditable, isInventoryCat, mainCategory, queryClient])

  const shouldStartSuppressingLoading = didSwitchSubCategory && !hasCachedSelectionData
  const shouldSuppressLoadingForSelection =
    shouldStartSuppressingLoading || suppressedLoadingSelectionKey === selectionKey
  const showInventoryLoading = isLoading && !shouldSuppressLoadingForSelection

  const { filteredItems } = useInventoryFilter({
    inventoryItems,
    searchQuery,
    favoriteIds
  })

  useEffect(() => {
    if (shouldStartSuppressingLoading) {
      setSuppressedLoadingSelectionKey(selectionKey)
    }

    previousSelectionRef.current = {
      accountId,
      mainCategory,
      subCategory
    }
  }, [accountId, mainCategory, selectionKey, shouldStartSuppressingLoading, subCategory])

  useEffect(() => {
    if (!isLoading && suppressedLoadingSelectionKey === selectionKey) {
      setSuppressedLoadingSelectionKey(null)
    }
  }, [isLoading, selectionKey, suppressedLoadingSelectionKey])

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

  const [createOutfitModalOpen, setCreateOutfitModalOpen] = useState(false)
  const createOutfitMutation = useCreateOutfit(account)

  const handleCreateOutfit = async (name: string) => {
    try {
      await createOutfitMutation.mutateAsync(name)
      showNotification('Outfit created successfully', 'success')
      setCreateOutfitModalOpen(false)
    } catch (error) {
      console.error('Failed to create outfit:', error)
      showNotification('Failed to create outfit', 'error')
    }
  }

  const [selectedAccessory, setSelectedAccessory] = useState<{
    id: number
    name: string
    imageUrl: string
  } | null>(null)

  const [contextMenu, setContextMenu] = useState<({
    id: number
    name: string
    isFavorite: boolean
    canEdit?: boolean
  } & AnchoredOverlayPosition) | null>(null)

  const handleContextMenu = (e: React.MouseEvent, item: InventoryItem) => {
    e.preventDefault()
    const isCreation = mainCategory === 'Characters' && subCategory === 'Creations'
    setContextMenu({
      id: item.id,
      name: item.name,
      isFavorite: favoriteIds.has(item.id),
      ...createAnchoredOverlayPosition(e),
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

  const handleRefreshAvatar = useCallback(() => {
    if (!account?.userId || isRendering) return

    triggerAvatarRenderRefresh()
    void refetchCurrentAvatar()
  }, [account?.userId, isRendering, refetchCurrentAvatar, triggerAvatarRenderRefresh])

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
  }

  if (!account) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface)]">
        <EmptyState
          icon={User}
          title="Select an account to view the avatar editor"
          description="Choose an account to load avatar customization, outfits, and worn items."
          className="h-full w-full"
        />
      </div>
    )
  }

  return (
    <>
      <PageHeaderPortal>
        {!(mainCategory === 'Body' && (subCategory === 'Skin Color' || subCategory === 'Scale')) && (
          <>
            <FloatingAction.Search
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={`Search ${subCategory}...`}
            />
            <FloatingAction.Separator />
          </>
        )}
        <FloatingAction.Button
          icon={RefreshRenderIcon}
          tooltip="Refresh Render"
          onClick={handleRefreshAvatar}
          disabled={isRendering}
        />
        <FloatingAction.Button
          icon={RotateCcw}
          tooltip="Reset Camera"
          onClick={resetCamera}
        />
      </PageHeaderPortal>
      <div className="flex flex-col lg:flex-row h-full w-full bg-[var(--color-surface)] animate-tab-enter overflow-hidden">
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
            resetSignal={resetCameraSignal}
            refreshSignal={refreshAvatarSignal}
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

        <div className="w-full lg:w-1/2 h-full bg-[var(--color-surface)] flex flex-row min-w-0">
          <div className="flex-1 flex flex-col min-w-0">
            <SubCategoryTabs
              mainCategory={mainCategory}
              subCategory={subCategory}
              onSubCategoryChange={setSubCategory}
            />

            <InventoryGrid
              account={account}
              filteredItems={filteredItems}
              isLoading={showInventoryLoading}
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
              onCreateOutfit={() => setCreateOutfitModalOpen(true)}
              scrollPosition={scrollPosition}
              onScroll={setScrollPosition}
            />
          </div>

          <CategorySidebar
            mainCategory={mainCategory}
            onMainCategoryChange={handleMainCategoryChange}
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

        <CreateOutfitModal
          isOpen={createOutfitModalOpen}
          onClose={() => setCreateOutfitModalOpen(false)}
          onCreate={handleCreateOutfit}
          isLoading={createOutfitMutation.isPending}
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
    </>
  )
}

export default AvatarTab



