import React, { useState, useEffect } from 'react'
import { Account } from '@renderer/shared/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody,
  DialogFooter
} from '@renderer/shared/ui/dialogs/Dialog'

interface EditNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (accountId: string, newNote: string) => void
  account: Account | null
}

const EditNoteModal: React.FC<EditNoteModalProps> = ({ isOpen, onClose, onSave, account }) => {
  const [note, setNote] = useState('')

  useEffect(() => {
    if (isOpen && account) {
      setNote(account.notes)
    }
  }, [isOpen, account])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (account) {
      onSave(account.id, note)
      onClose()
    }
  }

  if (!isOpen || !account) return null

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
          <DialogClose onClick={() => {
            if (account) onSave(account.id, note)
          }} />
        </DialogHeader>

        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-[var(--color-text-muted)] privacy-blur">@{account.username}</p>
            <textarea
              id="noteInput"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note for this account..."
              className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-strong)] transition-colors min-h-[100px] resize-none"
              autoFocus
            />
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export default EditNoteModal

