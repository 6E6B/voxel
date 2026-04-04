import React, { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '@renderer/shared/ui/dialogs/Dialog'

interface CreateOutfitModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string) => void
  isLoading?: boolean
}

const CreateOutfitModal: React.FC<CreateOutfitModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isLoading = false
}) => {
  const [name, setName] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName('')
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onCreate(trimmed)
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Outfit</DialogTitle>
          <DialogClose
            label={isLoading ? undefined : 'Create'}
            onClick={!isLoading && name.trim() ? () => onCreate(name.trim()) : undefined}
            disabled={!name.trim() || isLoading}
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined}
          </DialogClose>
        </DialogHeader>

        <DialogBody>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Outfit name..."
              className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-strong)] transition-colors"
              autoFocus
              disabled={isLoading}
            />
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export default CreateOutfitModal

