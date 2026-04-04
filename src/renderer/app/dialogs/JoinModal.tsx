import React, { useState } from 'react'
import { User, MapPin, Briefcase } from 'lucide-react'
import { JoinMethod, JoinConfig } from '@renderer/shared/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody,
  DialogFooter
} from '@renderer/shared/ui/dialogs/Dialog'

interface JoinModalProps {
  isOpen: boolean
  onClose: () => void
  onLaunch: (config: JoinConfig) => void
  selectedCount: number
}

const JoinModal: React.FC<JoinModalProps> = ({ isOpen, onClose, onLaunch, selectedCount }) => {
  const [method, setMethod] = useState<JoinMethod>(JoinMethod.Username)
  const [target, setTarget] = useState('')
  const [placeId, setPlaceId] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let finalTarget = target
    if (method === JoinMethod.JobId) {
      finalTarget = `${placeId.trim()}:${target.trim()}`
    }
    onLaunch({ method, target: finalTarget })
  }

  const canSubmit = target.trim() && (method !== JoinMethod.JobId || placeId.trim())

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Game</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-[var(--color-text-muted)]">
              {selectedCount} account{selectedCount !== 1 ? 's' : ''} selected
            </p>

            {/* Method Selection */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { method: JoinMethod.Username, icon: User, label: 'Username' },
                { method: JoinMethod.PlaceId, icon: MapPin, label: 'Place ID' },
                { method: JoinMethod.JobId, icon: Briefcase, label: 'Job ID' }
              ].map(({ method: m, icon: Icon, label }) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`pressable flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${method === m
                    ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)]'
                    : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-secondary)]'
                    }`}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {method === JoinMethod.JobId ? (
                <>
                  <input
                    type="text"
                    value={placeId}
                    onChange={(e) => setPlaceId(e.target.value)}
                    placeholder="Place ID (e.g. 1818)"
                    className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-strong)] transition-colors"
                    required
                  />
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="Job ID (e.g. 772-112-991)"
                    className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-strong)] transition-colors"
                    required
                  />
                </>
              ) : (
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder={method === JoinMethod.Username ? 'Username (e.g. Builderman)' : 'Place ID (e.g. 1818)'}
                  className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-strong)] transition-colors"
                  required
                />
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="pressable w-full py-2.5 text-sm font-medium bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Launch
            </button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export default JoinModal

