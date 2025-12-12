import React, { useState, useRef } from 'react'
import { ShoppingCart, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/UI/buttons/Button'
import { RobuxIcon } from '@renderer/components/UI/icons/RobuxIcon'
import { AssetDetails } from '@shared/ipc-schemas/avatar'
import { Dialog, DialogContent, DialogBody } from '@renderer/components/UI/dialogs/Dialog'

// Inline Purchase Confirm Dialog
const PurchaseConfirmDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  assetName: string
  price: number | string
  userBalance?: number | null
}> = ({ isOpen, onClose, onConfirm, assetName, price, userBalance }) => {
  const numericPrice = typeof price === 'number' ? price : 0
  const hasBalance = userBalance !== null && userBalance !== undefined
  const remainingBalance = hasBalance ? userBalance! - numericPrice : null
  const canAfford = hasBalance ? remainingBalance! >= 0 : true

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogBody className="flex flex-col items-center text-center py-6">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
            <ShoppingCart className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Confirm Purchase</h2>
          <p className="text-neutral-300 text-sm leading-relaxed mb-6">
            Are you sure you want to buy{' '}
            <span className="font-semibold text-white">&quot;{assetName}&quot;</span> for{' '}
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
              {typeof price === 'number' ? price.toLocaleString() : price}
              {typeof price === 'number' && <RobuxIcon className="w-4 h-4" />}
            </span>
            ?
          </p>
          {hasBalance && typeof price === 'number' && (
            <div className="w-full bg-neutral-800/50 rounded-lg p-3 mb-6 text-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-neutral-400">Current Balance</span>
                <span className="flex items-center gap-1 text-white font-medium">
                  {userBalance!.toLocaleString()}
                  <RobuxIcon className="w-3 h-3" />
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-neutral-700">
                <span className="text-neutral-400">After Purchase</span>
                <span
                  className={cn(
                    'flex items-center gap-1 font-medium',
                    remainingBalance! < 0 ? 'text-red-400' : 'text-emerald-400'
                  )}
                >
                  {remainingBalance!.toLocaleString()}
                  <RobuxIcon className="w-3 h-3" />
                </span>
              </div>
            </div>
          )}
          <div className="flex gap-3 w-full">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!canAfford}
              className={cn(
                'flex-1 text-white',
                !canAfford
                  ? 'bg-red-600 hover:bg-red-500 cursor-not-allowed opacity-80'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              )}
            >
              {!canAfford ? 'Insufficient Funds' : 'Buy Now'}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

// Inline Purchase Success Dialog
export const PurchaseSuccessDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  assetName: string
  creatorName: string
  price: number | string
  thumbnailUrl: string
}> = ({ isOpen, onClose, assetName, creatorName, price, thumbnailUrl }) => (
  <Dialog isOpen={isOpen} onClose={onClose}>
    <DialogContent className="max-w-sm">
      <DialogBody className="flex flex-col items-center text-center py-8">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-6">Purchase Complete</h2>
        <div className="w-32 h-32 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 mb-4">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={assetName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-600">
              No Image
            </div>
          )}
        </div>
        <p className="text-neutral-300 text-base leading-relaxed">
          You have successfully acquired the{' '}
          <span className="font-semibold text-white">{assetName}</span> from{' '}
          <span className="font-semibold text-white">{creatorName}</span> for{' '}
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
            {typeof price === 'number' ? price.toLocaleString() : price}
            {typeof price === 'number' && <RobuxIcon className="w-4 h-4" />}
          </span>
          .
        </p>
        <Button
          onClick={onClose}
          className="mt-8 bg-emerald-600 hover:bg-emerald-500 text-white px-8"
        >
          Done
        </Button>
      </DialogBody>
    </DialogContent>
  </Dialog>
)

// Inline Purchase Error Dialog
export const PurchaseErrorDialog: React.FC<{
  isOpen: boolean
  onClose: () => void
  errorMessage: string
}> = ({ isOpen, onClose, errorMessage }) => (
  <Dialog isOpen={isOpen} onClose={onClose}>
    <DialogContent className="max-w-sm">
      <DialogBody className="flex flex-col items-center text-center py-6">
        <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-3">Purchase Failed</h2>
        <p className="text-neutral-400 text-sm leading-relaxed mb-6">{errorMessage}</p>
        <Button onClick={onClose} variant="outline" className="px-8">
          Close
        </Button>
      </DialogBody>
    </DialogContent>
  </Dialog>
)

interface AssetPricingProps {
  details: AssetDetails
  onPurchaseSuccess?: (details: AssetDetails, price: number | string) => void
  onPurchaseError?: (error: string) => void
  cookie?: string
  userId?: string
}

export const AssetPricing: React.FC<AssetPricingProps> = ({
  details,
  onPurchaseSuccess,
  onPurchaseError,
  cookie,
  userId
}) => {
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isOwned, setIsOwned] = useState(false)
  const [userBalance, setUserBalance] = useState<number | null>(null)
  const purchaseInProgressRef = useRef(false) // Guard against double purchases

  // Logic for display price
  let displayPrice: string | number = 'Off Sale'
  const isLimitedItem = details.isLimited || details.isLimitedUnique

  // For limited/collectible items, prioritize the collectible resale price
  if (
    isLimitedItem &&
    details.collectibleLowestResalePrice &&
    details.collectibleLowestResalePrice > 0
  ) {
    displayPrice = details.collectibleLowestResalePrice
  } else if (details.lowestPrice && details.lowestPrice > 0) {
    // Catalog API lowestPrice for limiteds
    displayPrice = details.lowestPrice
  } else if (details.price !== null && details.price !== undefined) {
    if (details.price === 0 && details.isPurchasable && !isLimitedItem) {
      // Only show "Free" if it's actually purchasable and not a limited item
      displayPrice = 'Free'
    } else if (details.price > 0) {
      displayPrice = details.price
    } else if (!details.isPurchasable) {
      displayPrice = 'Off Sale'
    }
  }

  // Check ownership and balance
  React.useEffect(() => {
    let isMounted = true
    const checkStatus = async () => {
      if (!cookie || !userId || !details.id) return

      try {
        // Check ownership
        const owned = await (window as any).api.checkAssetOwnership(
          cookie,
          userId,
          details.id,
          'Asset'
        )
        if (isMounted) setIsOwned(owned)

        // Get balance (only if we might buy)
        if (!owned && displayPrice !== 'Off Sale') {
          // We can get balance from account stats
          const stats = await (window as any).api.fetchAccountStats(cookie)
          if (isMounted && stats) setUserBalance(stats.robuxBalance)
        }
      } catch (err) {
        console.warn('Failed to check ownership or balance:', err)
      }
    }

    checkStatus()
    return () => {
      isMounted = false
    }
  }, [cookie, userId, details.id, displayPrice])

  // Check if item can be purchased (has collectibleItemId and is purchasable)
  const canPurchase = !isOwned && displayPrice !== 'Off Sale' && details.collectibleItemId && cookie

  const handlePurchaseClick = () => {
    if (!canPurchase) return
    setShowConfirm(true)
  }

  const handleConfirmPurchase = async () => {
    // Guard against double purchases (React StrictMode can cause double calls)
    if (purchaseInProgressRef.current) return
    if (!canPurchase || !details.collectibleItemId || !cookie) return

    purchaseInProgressRef.current = true
    setShowConfirm(false)
    setIsPurchasing(true)
    try {
      // Get the actual price as a number
      const expectedPrice = typeof displayPrice === 'number' ? displayPrice : 0
      // Get the seller ID from creatorTargetId
      const expectedSellerId = details.creatorTargetId || 0

      const result = await (window as any).api.purchaseCatalogItem(
        cookie,
        details.collectibleItemId,
        expectedPrice,
        expectedSellerId,
        details.collectibleProductId,
        userId,
        crypto.randomUUID() // idempotencyKey
      )

      if (result.purchased) {
        setIsOwned(true) // Mark as owned immediately on success
        onPurchaseSuccess?.(details, displayPrice)
      } else {
        const errorMsg =
          result.errorMessage || result.reason || result.purchaseResult || 'Unknown error'
        onPurchaseError?.(errorMsg)
      }
    } catch (err: any) {
      console.error('Purchase error:', err)
      onPurchaseError?.(err.message || 'An error occurred during purchase')
    } finally {
      setIsPurchasing(false)
      purchaseInProgressRef.current = false
    }
  }

  return (
    <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl flex items-center justify-between">
      <div>
        <div className="text-sm text-neutral-500 mb-1">Price</div>
        <div className="text-xl font-bold text-white flex items-center gap-1">
          {typeof displayPrice === 'number' ? (
            <>
              {displayPrice.toLocaleString()}
              <RobuxIcon className="w-4 h-4 ml-1" />
            </>
          ) : (
            <span className={displayPrice === 'Free' ? 'text-white' : 'text-neutral-400'}>
              {displayPrice}
            </span>
          )}
        </div>
      </div>
      <Button
        disabled={isOwned || displayPrice === 'Off Sale' || isPurchasing || !canPurchase}
        onClick={handlePurchaseClick}
        className={cn(
          'min-w-[120px]',
          isOwned
            ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed hover:bg-neutral-800'
            : displayPrice === 'Off Sale' || !canPurchase
              ? 'opacity-50 cursor-not-allowed bg-transparent text-neutral-400 border-2 border-dashed border-neutral-700 hover:bg-transparent'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
        )}
      >
        {isPurchasing ? (
          <Loader2 size={18} className="mr-2 animate-spin" />
        ) : isOwned ? (
          <span className="flex items-center">
            <span className="mr-2">✓</span> Owned
          </span>
        ) : (
          <ShoppingCart size={18} className="mr-2" />
        )}
        {isPurchasing
          ? 'Buying...'
          : isOwned
            ? ''
            : displayPrice === 'Off Sale'
              ? 'Unavailable'
              : 'Buy'}
      </Button>

      {/* Purchase Confirmation Dialog */}
      <PurchaseConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmPurchase}
        assetName={details.name || 'Unknown Asset'}
        price={displayPrice}
        userBalance={userBalance}
      />
    </div>
  )
}
