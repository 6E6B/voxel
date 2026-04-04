import React, { useState } from 'react'
import { HardDrive, Check } from 'lucide-react'
import { RobloxInstallation } from '@renderer/shared/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody,
  DialogFooter
} from '@renderer/shared/ui/dialogs/Dialog'

interface InstanceSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (installPath?: string) => void
  installations: RobloxInstallation[]
}

const InstanceSelectionModal: React.FC<InstanceSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  installations
}) => {
  const [selectedPath, setSelectedPath] = useState<string>('')

  const handleConfirm = () => {
    onSelect(selectedPath || undefined)
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Installation</DialogTitle>
          <DialogClose />
        </DialogHeader>

        <DialogBody className="space-y-1.5">
          <button
            type="button"
            onClick={() => setSelectedPath('')}
            className={`pressable w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left transition-all ${selectedPath === ''
              ? 'bg-[var(--accent-color)]/10 text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
              }`}
          >
            <HardDrive size={16} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">System Default</div>
            </div>
            {selectedPath === '' && <Check size={14} className="text-[var(--accent-color)] shrink-0" />}
          </button>

          {installations.map((inst) => (
            <button
              key={inst.id}
              type="button"
              onClick={() => setSelectedPath(inst.path)}
              className={`pressable w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-left transition-all ${selectedPath === inst.path
                ? 'bg-[var(--accent-color)]/10 text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                }`}
            >
              <HardDrive size={16} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{inst.name}</div>
                <div className="text-xs opacity-60 truncate">{inst.version}</div>
              </div>
              {selectedPath === inst.path && <Check size={14} className="text-[var(--accent-color)] shrink-0" />}
            </button>
          ))}

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="pressable flex-1 px-4 py-2.5 text-sm font-medium bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="pressable flex-1 px-4 py-2.5 text-sm font-medium bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] rounded-lg transition-colors"
            >
              Launch
            </button>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

export default InstanceSelectionModal

