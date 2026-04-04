import React, { useState, useEffect } from 'react'
import { Loader2, AlertCircle, UserPlus, Send, AtSign } from 'lucide-react'
import { Account } from '@renderer/shared/types'
import { useNotification } from '@renderer/features/system/useSnackbarStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '@renderer/shared/ui/dialogs/Dialog'

interface AddFriendModalProps {
  isOpen: boolean
  onClose: () => void
  selectedAccount: Account | null
  onFriendRequestSent?: () => void
}

interface UsernameLookupResult {
  id: number
  displayName: string
  avatarUrl?: string
}

interface SendFriendRequestResult {
  success?: boolean
  isCaptchaRequired?: boolean
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({
  isOpen,
  onClose,
  selectedAccount,
  onFriendRequestSent
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resolvedUser, setResolvedUser] = useState<{
    displayName: string
    avatarUrl?: string
  } | null>(null)
  const { showNotification } = useNotification()

  useEffect(() => {
    if (isOpen) {
      setIsLoading(false)
      setUsername('')
      setError(null)
      setResolvedUser(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || isLoading || !selectedAccount?.cookie) return

    setIsLoading(true)
    setError(null)

    try {
      const userData = (await window.api.getUserByUsername(
        username.trim()
      )) as UsernameLookupResult | null
      if (!userData) {
        setError('User not found.')
        setIsLoading(false)
        return
      }

      setResolvedUser({
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl
      })

      const result = (await window.api.sendFriendRequest(
        selectedAccount.cookie,
        userData.id
      )) as SendFriendRequestResult

      if (result.success) {
        showNotification(`Friend request sent to ${userData.displayName}!`, 'success')
        setUsername('')
        onFriendRequestSent?.()
        onClose()
      } else if (result.isCaptchaRequired) {
        setError('Captcha required. Please try again later.')
      } else {
        setError('Failed to send friend request.')
      }
    } catch (err: any) {
      console.error('Failed to send friend request:', err)
      const errorMessage =
        err.message || 'Failed to send friend request. Please check the username and try again.'
      setError(errorMessage)
      showNotification(errorMessage, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Icon header */}
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="w-12 h-12 rounded-full bg-[var(--accent-color)]/10 flex items-center justify-center">
              <UserPlus size={20} className="text-[var(--accent-color)]" />
            </div>
            <p className="text-xs text-[var(--color-text-muted)] text-center max-w-[240px]">
              Enter a username to send them a friend request
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="flex items-center gap-2.5 text-xs text-red-400 bg-red-500/8 border border-red-500/15 rounded-[var(--control-radius)] px-3 py-2.5">
                <AlertCircle className="shrink-0" size={14} />
                <span>{error}</span>
              </div>
            )}

            {!selectedAccount && (
              <div className="flex items-center gap-2.5 text-xs text-yellow-400 bg-yellow-500/8 border border-yellow-500/15 rounded-[var(--control-radius)] px-3 py-2.5">
                <AlertCircle className="shrink-0" size={14} />
                <span>Select an account first</span>
              </div>
            )}

            {/* Input with inline icon */}
            <div className="relative">
              <AtSign
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
              />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError(null)
                  setResolvedUser(null)
                }}
                disabled={isLoading || !selectedAccount}
                placeholder="Username"
                className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--control-radius)] pl-9 pr-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)] focus:outline-none focus:border-[var(--color-border-strong)] focus:bg-[var(--color-surface)] focus:shadow-[0_0_0_1px_var(--focus-ring)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                autoFocus
              />
            </div>

            {/* Send button */}
            <button
              type="submit"
              disabled={!username.trim() || isLoading || !selectedAccount}
              className="pressable w-full flex items-center justify-center gap-2 h-10 rounded-[var(--control-radius)] bg-[var(--accent-color)] text-[var(--accent-color-foreground)] text-sm font-bold transition-colors hover:bg-[color:color-mix(in_srgb,var(--accent-color)_92%,var(--color-text-primary))] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-[0_5px_15px_var(--accent-color-shadow)] border border-[color:color-mix(in_srgb,var(--accent-color)_65%,var(--color-text-primary))]"
            >
              {isLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <>
                  <Send size={14} />
                  Send Request
                </>
              )}
            </button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export default AddFriendModal

