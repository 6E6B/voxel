import React, { useState, useEffect } from 'react'
import { Settings2, Type, MousePointer2, Trash2, Plus, Download } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '@renderer/shared/ui/dialogs/Dialog'
import { Tabs } from '@renderer/shared/ui/navigation/Tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/shared/ui/display/Tooltip'
import { useNotification } from '@renderer/features/system/useSnackbarStore'
import { UnifiedInstallation } from '../types'

interface CustomizeInstallationModalProps {
  isOpen: boolean
  onClose: () => void
  install: UnifiedInstallation | null
}

export const CustomizeInstallationModal: React.FC<CustomizeInstallationModalProps> = ({
  isOpen,
  onClose,
  install
}) => {
  const { showNotification } = useNotification()
  const [customizeTab, setCustomizeTab] = useState<'fflags' | 'font' | 'cursor'>('fflags')
  const [fflags, setFFlags] = useState<Record<string, any>>({})
  const [newFlagKey, setNewFlagKey] = useState('')
  const [newFlagValue, setNewFlagValue] = useState('')

  useEffect(() => {
    if (install && isOpen) {
      loadFFlags(install)
    } else {
      setFFlags({})
      setCustomizeTab('fflags')
      setNewFlagKey('')
      setNewFlagValue('')
    }
  }, [install, isOpen])

  const loadFFlags = async (targetInstall: UnifiedInstallation) => {
    try {
      const flags = await window.api.getFFlags(targetInstall.path)
      setFFlags(flags || {})
    } catch (e) {
      console.error('Failed to load FFlags', e)
    }
  }

  const handleSaveFFlags = async () => {
    if (!install) return
    try {
      await window.api.setFFlags(install.path, fflags)
      showNotification('FFlags saved successfully', 'success')
    } catch (_e) {
      showNotification('Failed to save FFlags', 'error')
    }
  }

  const handleInstallFont = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!install || !e.target.files?.[0]) return
    const file = e.target.files[0] as File & { path: string }
    try {
      await window.api.installFont(install.path, file.path)
      showNotification('Font installed successfully', 'success')
    } catch (err) {
      console.error(err)
      showNotification('Failed to install font: ' + err, 'error')
    }
    e.target.value = ''
  }

  const handleInstallCursor = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!install || !e.target.files?.[0]) return
    const file = e.target.files[0] as File & { path: string }
    try {
      await window.api.installCursor(install.path, file.path)
      showNotification('Cursor installed successfully', 'success')
    } catch (err) {
      console.error(err)
      showNotification('Failed to install cursor: ' + err, 'error')
    }
    e.target.value = ''
  }

  const addFlag = () => {
    if (!newFlagKey) return
    let val: any = newFlagValue
    if (val === 'true') val = true
    if (val === 'false') val = false
    if (!isNaN(Number(val)) && val.trim() !== '') val = Number(val)

    setFFlags((prev) => ({ ...prev, [newFlagKey]: val }))
    setNewFlagKey('')
    setNewFlagValue('')
  }

  const removeFlag = (key: string) => {
    const newFlags = { ...fflags }
    delete newFlags[key]
    setFFlags(newFlags)
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-lg h-[min(560px,85vh)] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {install ? install.name : 'Customize Installation'}
          </DialogTitle>
          <DialogClose />
        </DialogHeader>

        {/* Tabs */}
        <Tabs
          layoutId="customize-modal-tabs"
          activeTab={customizeTab}
          onTabChange={(id) => setCustomizeTab(id as any)}
          tabs={[
            { id: 'fflags', label: 'FFlags', icon: Settings2 },
            { id: 'font', label: 'Font', icon: Type },
            { id: 'cursor', label: 'Cursor', icon: MousePointer2 }
          ]}
        />

        <DialogBody className="flex-1 min-h-0 p-0">
          {customizeTab === 'fflags' && (
            <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
              {/* Existing Flags */}
              <div className="flex min-h-0 flex-1 flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Configured Flags</h3>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {Object.keys(fflags).length} flags
                  </span>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto scrollbar-thin pr-2 bg-[var(--color-surface-muted)] p-2 rounded-xl border border-[var(--color-border)]">
                  {Object.keys(fflags).length === 0 && (
                    <div className="text-[var(--color-text-muted)] text-sm text-center py-6">
                      No flags configured
                    </div>
                  )}
                  {Object.entries(fflags).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center gap-2 bg-[var(--color-surface)] p-3 rounded-xl border border-[var(--color-border)] group"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex-1 font-mono text-xs text-[var(--color-text-secondary)] truncate cursor-help">
                            {key}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{key}</TooltipContent>
                      </Tooltip>
                      <input
                        className="w-24 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg px-2 py-0.5 text-xs text-emerald-400 font-mono focus:border-emerald-500/50 focus:outline-none"
                        value={String(val)}
                        onChange={(e) => {
                          const v = e.target.value
                          setFFlags((prev) => ({ ...prev, [key]: v }))
                        }}
                      />
                      <button
                        onClick={() => removeFlag(key)}
                        className="pressable opacity-0 group-hover:opacity-100 text-[var(--color-text-muted)] hover:text-red-400 transition-all p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Flag */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Add Custom Flag</h3>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20 font-mono placeholder:font-sans placeholder:text-[var(--color-text-muted)]"
                    placeholder="Flag Name"
                    value={newFlagKey}
                    onChange={(e) => setNewFlagKey(e.target.value)}
                  />
                  <input
                    className="w-28 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20 font-mono placeholder:font-sans placeholder:text-[var(--color-text-muted)]"
                    placeholder="Value"
                    value={newFlagValue}
                    onChange={(e) => setNewFlagValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFlag()}
                  />
                  <button
                    onClick={addFlag}
                    disabled={!newFlagKey}
                    className="pressable px-3 bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-strong)] rounded-xl text-[var(--color-text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleSaveFFlags}
                className="pressable w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-semibold rounded-xl transition-all border border-[var(--accent-color-border)] mt-4"
              >
                Save FFlags
              </button>
            </div>
          )}

          {customizeTab === 'font' && (
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center space-y-4 py-8">
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-hover)] flex items-center justify-center mx-auto text-[var(--color-text-muted)]">
                  <Type size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)]">Custom Font</h3>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-xs mx-auto">
                    Upload a .ttf or .otf file to replace the default Roblox fonts.
                  </p>
                </div>
                <div className="flex justify-center">
                  <label className="pressable inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-strong)] text-[var(--color-text-primary)] rounded-xl cursor-pointer transition-colors font-medium text-sm border border-[var(--color-border)]">
                    <Download size={16} />
                    Select Font File
                    <input
                      type="file"
                      className="hidden"
                      accept=".ttf,.otf"
                      onChange={handleInstallFont}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {customizeTab === 'cursor' && (
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center space-y-4 py-8">
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-hover)] flex items-center justify-center mx-auto text-[var(--color-text-muted)]">
                  <MousePointer2 size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[var(--color-text-primary)]">Custom Cursor</h3>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1 max-w-xs mx-auto">
                    Upload a .png image to replace the default Roblox cursor.
                  </p>
                </div>
                <div className="flex justify-center">
                  <label className="pressable inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface-hover)] hover:bg-[var(--color-surface-strong)] text-[var(--color-text-primary)] rounded-xl cursor-pointer transition-colors font-medium text-sm border border-[var(--color-border)]">
                    <Download size={16} />
                    Select Cursor Image
                    <input
                      type="file"
                      className="hidden"
                      accept=".png"
                      onChange={handleInstallCursor}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

