import React, { useState, useEffect } from 'react'
import { Save, FileText } from 'lucide-react'
import { Account } from '@renderer/types'
import { Dialog, DialogContent, DialogClose } from '@renderer/components/UI/dialogs/Dialog'

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
      <DialogContent className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-[var(--accent-color-ring)]">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-900 rounded-lg">
              <FileText className="text-neutral-300" size={20} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Edit Note</h3>
              <p className="text-sm text-neutral-500 privacy-blur">For @{account.username}</p>
            </div>
          </div>
          <DialogClose />
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="noteInput" className="text-sm font-medium text-neutral-400">
              Account Note
            </label>
            <textarea
              id="noteInput"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Main storage account"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-base text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-all min-h-[120px] resize-none"
              autoFocus
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="pressable flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="pressable flex-[2] flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold py-3 rounded-lg transition-colors border border-[var(--accent-color-border)] shadow-[0_5px_20px_var(--accent-color-shadow)]"
            >
              <Save size={18} />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default EditNoteModal
