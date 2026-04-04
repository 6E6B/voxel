import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody,
  DialogFooter
} from '@renderer/shared/ui/dialogs/Dialog'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDangerous?: boolean
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false
}) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <DialogBody>
          <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">{message}</p>

          <DialogFooter>
            <button
              onClick={onClose}
              className="pressable flex-1 px-4 py-2.5 text-sm font-medium bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] rounded-lg transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className={`pressable flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${isDangerous
                  ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                  : 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)] hover:bg-[var(--accent-color-muted)]'
                }`}
            >
              {confirmText}
            </button>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmModal

