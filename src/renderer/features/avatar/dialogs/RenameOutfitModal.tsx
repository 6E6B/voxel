import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '@renderer/shared/ui/dialogs/Dialog'

interface RenameOutfitModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (outfitId: number, newName: string) => void
  outfitId: number | null
  currentName: string
}

const RenameOutfitModal: React.FC<RenameOutfitModalProps> = ({
  isOpen,
  onClose,
  onSave,
  outfitId,
  currentName
}) => {
  const [name, setName] = useState('')

  useEffect(() => {
    if (isOpen && outfitId) {
      setName(currentName)
    }
  }, [isOpen, outfitId, currentName])

  if (!outfitId) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(outfitId, name)
    onClose()
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename Outfit</DialogTitle>
          <DialogClose onClick={() => { onSave(outfitId, name); onClose() }} />
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
            />
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export default RenameOutfitModal

