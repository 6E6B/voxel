import React, { useState } from 'react'
import { Loader2, Box, Laptop } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '@renderer/shared/ui/dialogs/Dialog'
import CustomDropdown from '@renderer/shared/ui/menus/CustomDropdown'
import { BinaryType } from '@renderer/shared/types'
import { getApiType } from '../useInstallationsStore'

interface CreateInstallationModalProps {
  isOpen: boolean
  onClose: () => void
  isMac: boolean
  history: Record<string, string[]>
  isInstalling: boolean
  installProgress: { status: string; percent: number; detail: string }
  onCreate: (name: string, type: BinaryType, version: string, channel: string) => void
}

export const CreateInstallationModal: React.FC<CreateInstallationModalProps> = ({
  isOpen,
  onClose,
  isMac,
  history,
  isInstalling,
  installProgress,
  onCreate
}) => {
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<BinaryType>(
    isMac ? BinaryType.MacPlayer : BinaryType.WindowsPlayer
  )
  const [newVersion, setNewVersion] = useState('')
  const [newChannel, setNewChannel] = useState('live')

  const availableVersions = history[getApiType(newType)] || []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate(newName, newType, newVersion || availableVersions[0], newChannel)
  }

  const binaryTypeOptions = isMac
    ? [BinaryType.MacPlayer, BinaryType.MacStudio]
    : [BinaryType.WindowsPlayer, BinaryType.WindowsStudio]

  return (
    <Dialog isOpen={isOpen} onClose={() => !isInstalling && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Installation</DialogTitle>
          {!isInstalling && <DialogClose />}
        </DialogHeader>
        <DialogBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)] block">Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. My Custom Version"
                className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-border-strong)] transition-colors placeholder:text-[var(--color-text-muted)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-muted)] block">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {binaryTypeOptions.map((type) => {
                  const isStudio =
                    type === BinaryType.WindowsStudio || type === BinaryType.MacStudio
                  const isSelected = newType === type
                  const selectedClasses = isStudio
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                    : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewType(type)}
                      className={`pressable flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all ${isSelected
                        ? selectedClasses
                        : 'bg-[var(--color-surface-muted)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                        }`}
                    >
                      {isStudio ? <Box size={16} /> : <Laptop size={16} />}
                      <span className="text-sm font-medium">{isStudio ? 'Studio' : 'Player'}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)] block">Version</label>
                <CustomDropdown
                  options={
                    availableVersions.length > 0
                      ? availableVersions.map((v) => ({
                        value: v,
                        label: v,
                        subLabel: v === availableVersions[0] ? '(Latest)' : undefined
                      }))
                      : [{ value: '', label: 'Loading...' }]
                  }
                  value={newVersion}
                  onChange={setNewVersion}
                  placeholder={availableVersions.length > 0 ? 'Latest' : 'Loading...'}
                  buttonClassName="bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-border-strong)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-text-muted)] block">Channel</label>
                <input
                  type="text"
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  placeholder="live"
                  className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[var(--color-border-strong)] transition-colors placeholder:text-[var(--color-text-muted)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isInstalling || !newName}
              className={`pressable w-full flex items-center justify-center gap-2 text-sm font-medium bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isInstalling ? 'py-3.5' : 'py-2.5'
                }`}
            >
              {isInstalling ? (
                <div className="w-full flex flex-col items-center gap-1.5 px-4">
                  <div className="flex items-center gap-2 text-xs">
                    <Loader2 size={14} className="animate-spin" />
                    <span>
                      {installProgress.status} ({installProgress.percent}%)
                    </span>
                  </div>
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${installProgress.percent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <span>Install</span>
              )}
            </button>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

