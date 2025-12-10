import React, { useState, useEffect } from 'react'
import { Settings2, Type, MousePointer2, Trash2, Plus, Download } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '@renderer/components/UI/dialogs/Dialog'
import { Tabs } from '@renderer/components/UI/navigation/Tabs'
import CustomDropdown from '@renderer/components/UI/menus/CustomDropdown'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'
import { useNotification } from '@renderer/features/system/stores/useSnackbarStore'
import { UnifiedInstallation } from '../types'

const FFLAG_PRESETS = {
  Geometry: [
    'DFIntCSGLevelOfDetailSwitchingDistance',
    'DFIntCSGLevelOfDetailSwitchingDistanceL12',
    'DFIntCSGLevelOfDetailSwitchingDistanceL23',
    'DFIntCSGLevelOfDetailSwitchingDistanceL34'
  ],
  Rendering: [
    'FFlagHandleAltEnterFullscreenManually',
    'DFFlagTextureQualityOverrideEnabled',
    'DFIntTextureQualityOverride',
    'FIntDebugForceMSAASamples',
    'DFFlagDisableDPIScale',
    'FFlagDebugGraphicsPreferD3D11',
    'FFlagDebugSkyGray',
    'DFFlagDebugPauseVoxelizer',
    'DFIntDebugFRMQualityLevelOverride',
    'FIntFRMMaxGrassDistance',
    'FIntFRMMinGrassDistance',
    'FFlagDebugGraphicsPreferVulkan',
    'FFlagDebugGraphicsPreferOpenGL'
  ],
  'User Interface': ['FIntGrassMovementReducedMotionFactor']
}

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
      // @ts-ignore
      const flags = await window.api.getFFlags(targetInstall.path)
      setFFlags(flags || {})
    } catch (e) {
      console.error('Failed to load FFlags', e)
    }
  }

  const handleSaveFFlags = async () => {
    if (!install) return
    try {
      // @ts-ignore
      await window.api.setFFlags(install.path, fflags)
      showNotification('FFlags saved successfully', 'success')
    } catch (e) {
      showNotification('Failed to save FFlags', 'error')
    }
  }

  const handleInstallFont = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!install || !e.target.files?.[0]) return
    const file = e.target.files[0]
    try {
      // @ts-ignore
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
    const file = e.target.files[0]
    try {
      // @ts-ignore
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
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex flex-col items-start text-left">
            <DialogTitle className="pl-0">Customize Installation</DialogTitle>
            {install && <p className="text-xs text-neutral-500 mt-0.5">{install.name}</p>}
          </div>
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
          className="px-6"
        />

        <DialogBody className="overflow-y-auto flex-1 p-0">
          {customizeTab === 'fflags' && (
            <div className="p-6 space-y-6">
              {/* Presets */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white">Presets</h3>
                <div className="grid gap-2">
                  {Object.entries(FFLAG_PRESETS).map(([category, flags]) => (
                    <CustomDropdown
                      key={category}
                      value=""
                      placeholder={`Add ${category} Flags...`}
                      options={flags.map((f) => ({ value: f, label: f }))}
                      onChange={(value) => {
                        if (!fflags[value]) {
                          const isInt = value.includes('Int')
                          setFFlags((prev) => ({ ...prev, [value]: isInt ? 0 : true }))
                          showNotification(`Added ${value}`, 'success')
                        }
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="h-px bg-neutral-800" />

              {/* Existing Flags */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">Configured Flags</h3>
                  <span className="text-xs text-neutral-500">
                    {Object.keys(fflags).length} flags
                  </span>
                </div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto scrollbar-thin pr-2 bg-neutral-900/50 p-2 rounded-lg border border-neutral-800/50">
                  {Object.keys(fflags).length === 0 && (
                    <div className="text-neutral-500 text-sm text-center py-6">
                      No flags configured
                    </div>
                  )}
                  {Object.entries(fflags).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center gap-2 bg-neutral-950 p-3 rounded-lg border border-neutral-800 group"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex-1 font-mono text-xs text-neutral-300 truncate cursor-help">
                            {key}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{key}</TooltipContent>
                      </Tooltip>
                      <input
                        className="w-24 bg-neutral-900 border border-neutral-800 rounded px-2 py-0.5 text-xs text-emerald-400 font-mono focus:border-emerald-500/50 focus:outline-none"
                        value={String(val)}
                        onChange={(e) => {
                          const v = e.target.value
                          setFFlags((prev) => ({ ...prev, [key]: v }))
                        }}
                      />
                      <button
                        onClick={() => removeFlag(key)}
                        className="pressable opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-all p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Flag */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white">Add Custom Flag</h3>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] font-mono placeholder:font-sans"
                    placeholder="Flag Name"
                    value={newFlagKey}
                    onChange={(e) => setNewFlagKey(e.target.value)}
                  />
                  <input
                    className="w-28 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] font-mono placeholder:font-sans"
                    placeholder="Value"
                    value={newFlagValue}
                    onChange={(e) => setNewFlagValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addFlag()}
                  />
                  <button
                    onClick={addFlag}
                    disabled={!newFlagKey}
                    className="pressable px-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleSaveFFlags}
                className="pressable w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold rounded-lg transition-colors border border-[var(--accent-color-border)] mt-4"
              >
                Save FFlags
              </button>
            </div>
          )}

          {customizeTab === 'font' && (
            <div className="p-6 space-y-6">
              <div className="text-center space-y-4 py-8">
                <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                  <Type size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Custom Font</h3>
                  <p className="text-sm text-neutral-500 mt-1 max-w-xs mx-auto">
                    Upload a .ttf or .otf file to replace the default Roblox fonts.
                  </p>
                </div>
                <div className="flex justify-center">
                  <label className="pressable inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg cursor-pointer transition-colors font-medium text-sm border border-neutral-700">
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
            <div className="p-6 space-y-6">
              <div className="text-center space-y-4 py-8">
                <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                  <MousePointer2 size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">Custom Cursor</h3>
                  <p className="text-sm text-neutral-500 mt-1 max-w-xs mx-auto">
                    Upload a .png image to replace the default Roblox cursor.
                  </p>
                </div>
                <div className="flex justify-center">
                  <label className="pressable inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg cursor-pointer transition-colors font-medium text-sm border border-neutral-700">
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
