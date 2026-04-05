import React, { useEffect, useMemo, useState } from 'react'
import { Info, FileCode, TrendingUp } from 'lucide-react'
import { Outfit } from 'roavatar-renderer'
import {
  Sheet,
  SheetContent,
  SheetHandle,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetBody
} from '@renderer/shared/ui/dialogs/Sheet'
import { Button } from '@renderer/shared/ui/buttons/Button'
import { Tabs } from '@renderer/shared/ui/navigation/Tabs'
import { Account } from '@renderer/shared/types'
import { RecommendationItem, AssetDetails, ResellerItem } from '@shared/contracts/avatar'
import AssetImageContextMenu from '../components/AssetImageContextMenu'
import UniversalProfileModal from '@renderer/app/dialogs/UniversalProfileModal'
import { useRolimonsData, useRolimonsItem, useRolimonsItemPage } from '@renderer/features/avatar/api/useRolimons'
import { getSalesData, SalesItem } from '@renderer/shared/utils/salesData'
import { useAssetDetailsWithRecommendations } from '../api/useAssetDetailsQuery'
import { useAssetResellersWithPurchase } from '../api/useAssetResellersQuery'
import { useAssetOwnersWithDetails } from '../api/useAssetOwnersQuery'
import { useResaleDataQuery } from '../api/useResaleDataQuery'
import { useCurrentAvatar } from '../api/useAvatar'
import { useTryOn } from '../hooks/useTryOn'
import { AssetPreview } from '../components/AssetPreview'
import { AssetInfoTab } from '../components/AssetInfoTab'
import { AssetEconomyTab } from '../components/AssetEconomyTab'
import {
  createAnchoredOverlayPosition,
  type AnchoredOverlayPosition
} from '@renderer/shared/ui/menus/anchoredPosition'
import {
  PurchaseConfirmDialog,
  PurchaseSuccessDialog,
  PurchaseErrorDialog
} from '../components/AssetPricing'
import { AssetHierarchyModal } from './AssetHierarchyModal'
import { ASSET_TYPES_WITH_MODELS } from '../categoryUtils'

interface AccessoryDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  assetId: number | null
  account: Account | null
  initialData?: {
    name: string
    imageUrl: string
  }
}

const AccessoryDetailsModal: React.FC<AccessoryDetailsModalProps> = ({
  isOpen,
  onClose,
  assetId,
  account,
  initialData
}) => {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d')
  const [has3DView, setHas3DView] = useState<boolean>(true)
  const [currentAssetId, setCurrentAssetId] = useState<number | null>(assetId)
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(
    initialData?.imageUrl || null
  )
  const [imageContextMenu, setImageContextMenu] = useState<({
    assetId: number
    assetName: string
    assetType?: number
  } & AnchoredOverlayPosition) | null>(null)
  const [salesData, setSalesData] = useState<SalesItem | null>(null)
  const [creatorAvatarUrl, setCreatorAvatarUrl] = useState<string | null>(null)
  const [showCreatorProfile, setShowCreatorProfile] = useState(false)
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | number | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'economy'>('info')
  const [purchaseSuccess, setPurchaseSuccess] = useState<{
    assetName: string
    creatorName: string
    price: number | string
    thumbnailUrl: string
  } | null>(null)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)
  const [pendingResellerPurchase, setPendingResellerPurchase] = useState<ResellerItem | null>(null)
  const [resellerBalance, setResellerBalance] = useState<number | null>(null)
  const [ownershipRefreshKey, setOwnershipRefreshKey] = useState(0)
  const [showHierarchy, setShowHierarchy] = useState(false)

  // Rolimons data
  const { isLoading: _rolimonsLoading } = useRolimonsData()
  const rolimonsItem = useRolimonsItem(currentAssetId)

  // Custom hooks - TanStack Query based
  const {
    details,
    recommendations,
    recommendationThumbnails,
    isLoading,
    error,
    refetch: fetchDetails
  } = useAssetDetailsWithRecommendations(currentAssetId, account?.cookie, isOpen)

  // Determine if this is a limited item for fetching detailed Rolimons page data
  // This must be after useAssetDetails since we need details
  const isLimited = details?.isLimited || details?.isLimitedUnique || !!rolimonsItem
  const { data: rolimonsPageData, isLoading: rolimonsPageLoading } = useRolimonsItemPage(
    currentAssetId,
    isOpen && activeTab === 'economy' && isLimited
  )

  const {
    resellers,
    resellersLoading,
    resellerAvatars,
    purchasingReseller,
    handleBuyReseller,
    loadMoreResellers
  } = useAssetResellersWithPurchase(
    details,
    account && account.cookie ? { cookie: account.cookie, userId: account.userId } : null
  )

  const { owners, ownersLoading, ownerAvatars, ownerNames, loadMoreOwners } =
    useAssetOwnersWithDetails(
      details,
      currentAssetId,
      account && account.cookie ? { cookie: account.cookie } : null
    )

  const {
    isTryingOn,
    handleTryOn,
    handleRevertTryOn
  } = useTryOn(currentAssetId)

  const { data: currentAvatarData, isLoading: isLoadingCurrentAvatar } = useCurrentAvatar(account)

  const tryOnPreviewOutfit = useMemo(() => {
    if (!isTryingOn || !currentAssetId || !details?.AssetTypeId || !currentAvatarData) {
      return null
    }

    const previewOutfit = new Outfit()
    previewOutfit.fromJson({
      assets: currentAvatarData.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        assetType: asset.assetType,
        currentVersionId: asset.currentVersionId,
        meta: asset.meta
      })),
      bodyColors: currentAvatarData.bodyColors ?? undefined,
      scales: currentAvatarData.scales ?? undefined,
      playerAvatarType: currentAvatarData.playerAvatarType === 'R6' ? 'R6' : 'R15',
      name: details.name || 'Try On Preview'
    })
    previewOutfit.addAsset(currentAssetId, details.AssetTypeId, details.name || 'Try On Preview')
    return previewOutfit
  }, [currentAvatarData, currentAssetId, details?.AssetTypeId, details?.name, isTryingOn])

  const defaultPreviewOutfit = useMemo(() => {
    if (!currentAssetId || !details?.AssetTypeId || !currentAvatarData) {
      return null
    }

    const previewOutfit = new Outfit()
    previewOutfit.fromJson({
      assets: currentAvatarData.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        assetType: asset.assetType,
        currentVersionId: asset.currentVersionId,
        meta: asset.meta
      })),
      bodyColors: currentAvatarData.bodyColors ?? undefined,
      scales: currentAvatarData.scales ?? undefined,
      playerAvatarType: currentAvatarData.playerAvatarType === 'R6' ? 'R6' : 'R15',
      name: details.name || 'Asset Preview'
    })

    if (!previewOutfit.containsAsset(currentAssetId)) {
      previewOutfit.addAsset(currentAssetId, details.AssetTypeId, details.name || 'Asset Preview')
    }

    return previewOutfit
  }, [currentAvatarData, currentAssetId, details?.AssetTypeId, details?.name])

  const tryOnLoading = isTryingOn && !tryOnPreviewOutfit && isLoadingCurrentAvatar
  const defaultPreviewLoading =
    !isTryingOn &&
    viewMode === '3d' &&
    !!account?.cookie &&
    !!currentAssetId &&
    details?.AssetTypeId != null &&
    !defaultPreviewOutfit &&
    isLoadingCurrentAvatar
  const canTryOn = !!currentAssetId && details?.AssetTypeId != null && !!account?.cookie && !!account?.userId

  // Resale data query - TanStack Query handles fetching automatically
  const isLimitedForResale = details?.isLimited || details?.isLimitedUnique
  const { data: resaleData, isLoading: resaleDataLoading } = useResaleDataQuery({
    assetId: currentAssetId,
    enabled: isOpen && activeTab === 'economy' && !!isLimitedForResale && !!currentAssetId
  })

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen && assetId && account?.cookie) {
      setCurrentAssetId(assetId)
      setCurrentImageUrl(initialData?.imageUrl || null)
      getSalesData(assetId).then(setSalesData)
      setHas3DView(true)
      setViewMode('3d')
    }
  }, [isOpen, assetId, account?.cookie, initialData?.imageUrl])

  // TanStack Query handles fetching automatically when currentAssetId changes
  // No need for manual useEffect to trigger fetch

  // Update 3D view support based on asset type when details load
  useEffect(() => {
    if (details?.AssetTypeId != null) {
      const supports3D = ASSET_TYPES_WITH_MODELS.includes(details.AssetTypeId)
      setHas3DView(supports3D)
      if (!supports3D && viewMode === '3d') {
        setViewMode('2d')
      }
    }
  }, [details?.AssetTypeId, viewMode])

  // Ensure view mode is 2D if 3D is not available
  useEffect(() => {
    if (!has3DView && viewMode === '3d') {
      setViewMode('2d')
    }
  }, [has3DView, viewMode])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setViewMode('3d')
      setHas3DView(true)
      setCurrentAssetId(null)
      setCurrentImageUrl(null)
      setSalesData(null)
      setCreatorAvatarUrl(null)
      setActiveTab('info')
      // Note: resaleData is managed by TanStack Query, no need to reset manually
      setImageContextMenu(null)
      setShowCreatorProfile(false)
      setSelectedProfileUserId(null)
      setPurchaseSuccess(null)
      setPurchaseError(null)
      setPendingResellerPurchase(null)
      setResellerBalance(null)
      setOwnershipRefreshKey(0)
      setShowHierarchy(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!pendingResellerPurchase || !account?.cookie) {
      setResellerBalance(null)
      return
    }

    let isMounted = true

      ; (window as any).api
        .fetchAccountStats(account.cookie)
        .then((stats: { robuxBalance?: number } | null | undefined) => {
          if (isMounted) {
            setResellerBalance(stats?.robuxBalance ?? null)
          }
        })
        .catch((err: unknown) => {
          console.warn('Failed to fetch balance for reseller purchase:', err)
          if (isMounted) {
            setResellerBalance(null)
          }
        })

    return () => {
      isMounted = false
    }
  }, [account?.cookie, pendingResellerPurchase])

  // Fetch creator avatar when details change
  useEffect(() => {
    if (details?.creatorType === 'User' && details.creatorTargetId) {
      ; (window as any).api
        .getAvatarUrl(String(details.creatorTargetId))
        .then((url: string) => setCreatorAvatarUrl(url))
        .catch(() => setCreatorAvatarUrl(null))
    } else {
      setCreatorAvatarUrl(null)
    }
  }, [details?.creatorTargetId, details?.creatorType])

  const handleResellerPurchaseClick = (reseller: ResellerItem) => {
    if (!account?.cookie || !details?.collectibleItemId) {
      setPurchaseError('You need an authenticated account to buy this reseller listing.')
      return
    }

    setResellerBalance(null)
    setPendingResellerPurchase(reseller)
  }

  const handleConfirmResellerPurchase = async () => {
    if (!pendingResellerPurchase) {
      return
    }

    const reseller = pendingResellerPurchase
    setPendingResellerPurchase(null)
    setResellerBalance(null)

    try {
      const result = await handleBuyReseller(reseller)

      if (result.purchased) {
        setOwnershipRefreshKey((value) => value + 1)
        setPurchaseSuccess({
          assetName: details?.name || 'Unknown Asset',
          creatorName: reseller.seller.name || details?.creatorName || 'Unknown Seller',
          price: reseller.price,
          thumbnailUrl: getImageUrl()
        })
        return
      }

      setPurchaseError(
        result.errorMessage || result.reason || result.purchaseResult || 'Unknown error'
      )
    } catch (err: any) {
      console.error('Reseller purchase error:', err)
      setPurchaseError(err?.message || 'An error occurred during purchase')
    }
  }

  const handleImageContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (currentAssetId && details?.name) {
      setImageContextMenu({
        assetId: currentAssetId,
        assetName: details.name,
        assetType: details.AssetTypeId,
        ...createAnchoredOverlayPosition(e)
      })
    }
  }

  const handleDownloadTemplate = async (assetId: number, assetName: string) => {
    try {
      const result = await window.api.downloadCatalogTemplate(assetId, assetName, account?.cookie)
      if (!result.success) {
        console.error('Failed to download template:', result.message)
      }
    } catch (err) {
      console.error('Failed to download template:', err)
    }
  }

  const handleRecommendationClick = (item: RecommendationItem) => {
    if (!item.id || !account?.cookie) return

    // Reset state for new item
    getSalesData(item.id).then(setSalesData)
    setActiveTab('info')
    // Note: resaleData is managed by TanStack Query and will refetch automatically
    setHas3DView(true)
    setViewMode('3d')
    setCurrentAssetId(item.id)

      // Fetch thumbnail for the new item
      ; (window as any).api.getBatchThumbnails([item.id]).then((res: any) => {
        if (res.data && res.data.length > 0) {
          setCurrentImageUrl(res.data[0].imageUrl)
        }
      })

    // TanStack Query handles fetching automatically when currentAssetId changes
  }

  const getImageUrl = () => {
    if (currentImageUrl) return currentImageUrl
    if (initialData?.imageUrl) return initialData.imageUrl
    return ''
  }

  const handlePurchaseSuccess = (purchasedDetails: AssetDetails, price: number | string) => {
    setOwnershipRefreshKey((value) => value + 1)
    setPurchaseSuccess({
      assetName: purchasedDetails.name || 'Unknown Asset',
      creatorName: purchasedDetails.creatorName || 'Unknown Creator',
      price,
      thumbnailUrl: getImageUrl()
    })
  }

  const handlePurchaseError = (error: string) => {
    setPurchaseError(error)
  }

  const handleOwnerClick = (
    userId: string | number,
    _displayName?: string,
    _avatarUrl?: string
  ) => {
    setSelectedProfileUserId(userId)
  }

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <SheetContent className="h-full flex flex-col">
        <SheetHandle />

        <SheetHeader>
          <SheetTitle>{details?.name || 'Accessory Details'}</SheetTitle>
        </SheetHeader>

        <SheetBody className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading && !details ? (
            <div className="p-8 flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-neutral-500">Loading details...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center">
              <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                <Info size={24} />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Error Loading Asset</h3>
              <p className="text-neutral-400 mb-4">{error}</p>
              <Button onClick={fetchDetails} variant="outline">
                Try Again
              </Button>
            </div>
          ) : details ? (
            <div className="flex flex-col h-full">
              <div className="flex flex-col lg:flex-row flex-1 min-h-0">
                {/* LEFT SIDE: Preview */}
                <AssetPreview
                  viewMode={viewMode}
                  has3DView={has3DView}
                  imageUrl={getImageUrl()}
                  assetName={details.name || 'Unknown Asset'}
                  isTryingOn={isTryingOn}
                  tryOnOutfit={tryOnPreviewOutfit}
                  previewOutfit={defaultPreviewOutfit}
                  tryOnLoading={tryOnLoading}
                  previewOutfitLoading={defaultPreviewLoading}
                  canTryOn={canTryOn}
                  cookie={account?.cookie}
                  onViewModeChange={setViewMode}
                  on3DError={() => {
                    setHas3DView(false)
                    setViewMode('2d')
                  }}
                  onContextMenu={handleImageContextMenu}
                  onTryOn={handleTryOn}
                  onRevertTryOn={handleRevertTryOn}
                />

                {/* RIGHT SIDE: Info */}
                <div className="w-full lg:w-1/2 flex flex-col overflow-hidden bg-neutral-950">
                  <Tabs
                    tabs={[
                      { id: 'info', label: 'Info', icon: Info },
                      {
                        id: 'economy',
                        label: 'Economy',
                        icon: TrendingUp,
                        hidden: !(details.isLimited || details.isLimitedUnique)
                      }
                    ]}
                    activeTab={activeTab}
                    onTabChange={(tabId) => setActiveTab(tabId as 'info' | 'economy')}
                    layoutId="accessoryDetailsTabIndicator"
                    actions={
                      <button
                        onClick={() => setShowHierarchy(true)}
                        className="px-4 py-3 text-sm font-medium text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/50 active:bg-neutral-900 transition-colors flex items-center gap-2"
                        title="View XML Hierarchy"
                      >
                        <FileCode size={16} />
                      </button>
                    }
                  />
                  <div className="flex-1 overflow-y-auto scrollbar-thin p-6 flex flex-col gap-6">
                    {activeTab === 'info' ? (
                      <AssetInfoTab
                        details={details}
                        currentAssetId={currentAssetId}
                        creatorAvatarUrl={creatorAvatarUrl}
                        salesData={salesData}
                        rolimonsItem={rolimonsItem}
                        recommendations={recommendations}
                        recommendationThumbnails={recommendationThumbnails}
                        resellers={resellers}
                        resellersLoading={resellersLoading}
                        resellerAvatars={resellerAvatars}
                        purchasingReseller={purchasingReseller}
                        onBuyReseller={handleResellerPurchaseClick}
                        onLoadMoreResellers={loadMoreResellers}
                        onCreatorClick={() => {
                          if (details.creatorType === 'User' && details.creatorTargetId) {
                            setShowCreatorProfile(true)
                          }
                        }}
                        onRecommendationClick={handleRecommendationClick}
                        onPurchaseSuccess={handlePurchaseSuccess}
                        onPurchaseError={handlePurchaseError}
                        cookie={account?.cookie}
                        userId={account?.userId}
                        ownershipRefreshKey={ownershipRefreshKey}
                      />
                    ) : (
                      <AssetEconomyTab
                        rolimonsItem={rolimonsItem}
                        resaleData={resaleData ?? null}
                        resaleDataLoading={resaleDataLoading}
                        rolimonsPageData={rolimonsPageData ?? null}
                        rolimonsPageLoading={rolimonsPageLoading}
                        owners={owners}
                        ownersLoading={ownersLoading}
                        ownerAvatars={ownerAvatars}
                        ownerNames={ownerNames}
                        onLoadMoreOwners={loadMoreOwners}
                        onOwnerClick={handleOwnerClick}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Context Menu for Image */}
          <AssetImageContextMenu
            activeMenu={imageContextMenu}
            onClose={() => setImageContextMenu(null)}
            onDownloadTemplate={handleDownloadTemplate}
          />

          {/* Asset Hierarchy Modal */}
          <AssetHierarchyModal
            isOpen={showHierarchy}
            onClose={() => setShowHierarchy(false)}
            assetId={currentAssetId}
            assetName={details?.name || 'Asset'}
          />

          {/* Creator Profile Modal */}
          {showCreatorProfile &&
            details?.creatorType === 'User' &&
            details.creatorTargetId &&
            details.creatorName && (
              <UniversalProfileModal
                isOpen={showCreatorProfile}
                onClose={() => setShowCreatorProfile(false)}
                userId={String(details.creatorTargetId)}
                selectedAccount={account}
                initialData={{
                  name: details.creatorName,
                  displayName: details.creatorName,
                  headshotUrl: creatorAvatarUrl || undefined
                }}
              />
            )}

          {/* Owner/Hoarder Profile Modal */}
          {selectedProfileUserId && (
            <UniversalProfileModal
              isOpen={!!selectedProfileUserId}
              onClose={() => setSelectedProfileUserId(null)}
              userId={selectedProfileUserId}
              selectedAccount={account}
            />
          )}

          <PurchaseConfirmDialog
            isOpen={!!pendingResellerPurchase}
            onClose={() => {
              if (!purchasingReseller) {
                setPendingResellerPurchase(null)
                setResellerBalance(null)
              }
            }}
            onConfirm={handleConfirmResellerPurchase}
            assetName={details?.name || 'Unknown Asset'}
            price={pendingResellerPurchase?.price || 0}
            userBalance={resellerBalance}
          />

          {/* Purchase Success Dialog */}
          {purchaseSuccess && (
            <PurchaseSuccessDialog
              isOpen={!!purchaseSuccess}
              onClose={() => setPurchaseSuccess(null)}
              assetName={purchaseSuccess.assetName}
              creatorName={purchaseSuccess.creatorName}
              price={purchaseSuccess.price}
              thumbnailUrl={purchaseSuccess.thumbnailUrl}
            />
          )}

          {/* Purchase Error Dialog */}
          <PurchaseErrorDialog
            isOpen={!!purchaseError}
            onClose={() => setPurchaseError(null)}
            errorMessage={purchaseError || ''}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

export default AccessoryDetailsModal



