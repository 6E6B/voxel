import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogBody, DialogFooter } from './Dialog'
import { Input } from '../inputs/Input'
import { Account } from '@renderer/shared/types'
import { Loader2 } from 'lucide-react'

interface RedeemCodeDialogProps {
  isOpen: boolean
  onClose: () => void
  account: Account
}

export default function RedeemCodeDialog({ isOpen, onClose, account }: RedeemCodeDialogProps) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleRedeem = async () => {
    if (!code.trim()) return

    if (!account.cookie) {
      setMessage({ type: 'error', text: 'You must be logged in to redeem a code.' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const response = await window.api.redeemPromoCode(account.cookie, code)

      if (response.success) {
        setMessage({ type: 'success', text: response.successMsg || 'Code redeemed successfully!' })
        setCode('')
      } else {
        setMessage({ type: 'error', text: response.errorMsg || 'Failed to redeem code' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setMessage(null)
    setCode('')
    onClose()
  }

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Redeem Code</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <DialogBody className="space-y-3">
          <Input
            placeholder="Enter promo code..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.trim() && !isLoading) {
                handleRedeem()
              }
            }}
            className="rounded-lg"
          />

          {message && (
            <div
              className={`text-xs p-2.5 rounded-lg ${message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
                }`}
            >
              {message.text}
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={handleRedeem}
              disabled={!code.trim() || isLoading}
              className="pressable flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
              <span>{isLoading ? 'Redeeming...' : 'Redeem'}</span>
            </button>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
