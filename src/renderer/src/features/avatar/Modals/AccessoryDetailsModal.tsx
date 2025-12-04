import React, { useEffect, useState } from 'react'
import { Sparkles, Info, FileCode, TrendingUp } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHandle,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetBody
} from '@renderer/components/UI/dialogs/Sheet'
import { Button } from '@renderer/components/UI/buttons/Button'
import { Tabs } from '@renderer/components/UI/navigation/Tabs'
import { Account } from '@renderer/types'
import { RecommendationItem, AssetDetails } from '@shared/ipc-schemas/avatar'
import AssetImageContextMenu from '../UI/AssetImageContextMenu'
import UniversalProfileModal from '@renderer/components/Modals/UniversalProfileModal'
import { useRolimonsData, useRolimonsItem, useRolimonsItemPage } from '@renderer/hooks/queries'
import { getSalesData, SalesItem } from '@renderer/utils/salesData'
import { useAssetDetailsWithRecommendations } from '../api/useAssetDetailsQuery'
import { useAssetResellersWithPurchase } from '../api/useAssetResellersQuery'
import { useAssetOwnersWithDetails } from '../api/useAssetOwnersQuery'
import { useResaleDataQuery } from '../api/useResaleDataQuery'
import { useTryOn } from '../hooks/useTryOn'
import { AssetPreview } from '../components/AssetPreview'
import { AssetInfoTab } from '../components/AssetInfoTab'
import { AssetEconomyTab } from '../components/AssetEconomyTab'
import { PurchaseSuccessDialog, PurchaseErrorDialog } from '../components/AssetPricing'
import { AssetHierarchyModal } from './AssetHierarchyModal'
import { ASSET_TYPES_WITH_3D_MODELS } from '../hooks/useAvatar3DManifest'

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
  const [imageContextMenu, setImageContextMenu] = useState<{
    x: number
    y: number
    assetId: number
    assetName: string
    assetType?: number
  } | null>(null)
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
    account && account.cookie ? { cookie: account.cookie } : null
  )

  const { owners, ownersLoading, ownerAvatars, ownerNames, loadMoreOwners } =
    useAssetOwnersWithDetails(
      details,
      currentAssetId,
      account && account.cookie ? { cookie: account.cookie } : null
    )

  const { isTryingOn, tryOnLoading, tryOnImageUrl, handleTryOn, handleRevertTryOn } = useTryOn(
    currentAssetId,
    account
  )

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
      const supports3D = ASSET_TYPES_WITH_3D_MODELS.has(details.AssetTypeId)
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
      setShowHierarchy(false)
    }
  }, [isOpen])

  // Fetch creator avatar when details change
  useEffect(() => {
    if (details?.creatorType === 'User' && details.creatorTargetId) {
      ;(window as any).api
        .getAvatarUrl(String(details.creatorTargetId))
        .then((url: string) => setCreatorAvatarUrl(url))
        .catch(() => setCreatorAvatarUrl(null))
    } else {
      setCreatorAvatarUrl(null)
    }
  }, [details?.creatorTargetId, details?.creatorType])

  // Refresh owners after purchase
  const handleBuyResellerWithRefresh = async (reseller: any) => {
    await handleBuyReseller(reseller)
    // Refresh owners after purchase
    if (currentAssetId && account?.cookie) {
      // Owners will be refreshed automatically via useAssetOwners hook
    }
  }

  const handleImageContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (currentAssetId && details?.name) {
      setImageContextMenu({
        x: e.clientX,
        y: e.clientY,
        assetId: currentAssetId,
        assetName: details.name,
        assetType: details.AssetTypeId
      })
    }
  }

  const handleDownloadObj = async (assetId: number, assetName: string) => {
    try {
      const result = await (window as any).api.downloadAsset3D(assetId, 'obj', assetName)
      if (result.success) {
      }
    } catch (err) {
      console.error('Failed to download OBJ:', err)
    }
  }

  const handleDownloadTexture = async (assetId: number, assetName: string) => {
    try {
      const result = await (window as any).api.downloadAsset3D(assetId, 'texture', assetName)
      if (result.success) {
      }
    } catch (err) {
      console.error('Failed to download texture:', err)
    }
  }

  const handleDownloadTemplate = async (assetId: number, assetName: string) => {
    try {
      const result = await window.api.downloadCatalogTemplate(assetId, assetName, account?.cookie)
      if (result.success) {
      } else {
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
    ;(window as any).api.getBatchThumbnails([item.id]).then((res: any) => {
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
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-900 rounded-lg">
              <Sparkles className="text-neutral-300" size={20} />
            </div>
            <SheetTitle>Accessory Details</SheetTitle>
          </div>
          <SheetClose />
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
                  currentAssetId={currentAssetId}
                  assetTypeId={details.AssetTypeId}
                  imageUrl={getImageUrl()}
                  assetName={details.name || 'Unknown Asset'}
                  isTryingOn={isTryingOn}
                  tryOnImageUrl={tryOnImageUrl}
                  tryOnLoading={tryOnLoading}
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
                        onBuyReseller={handleBuyResellerWithRefresh}
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
            onDownloadObj={handleDownloadObj}
            onDownloadTexture={handleDownloadTexture}
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
