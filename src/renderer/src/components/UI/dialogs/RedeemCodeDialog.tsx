import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './Dialog'
import { Input } from '../inputs/Input'
import { Button } from '../buttons/Button'
import { Account } from '@renderer/types'
import { Loader2, Ticket } from 'lucide-react'

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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="w-5 h-5" />
            Redeem Promo Code
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Enter a promo code to redeem exclusive items or Robux.
          </p>

          <div className="grid gap-4">
            <Input
              placeholder="Enter code here"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.trim() && !isLoading) {
                  handleRedeem()
                }
              }}
            />

            {message && (
              <div
                className={`text-sm p-3 rounded-md ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-red-500/10 text-red-500'
                }`}
              >
                {message.text}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleRedeem} disabled={isLoading || !code.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Redeem
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
