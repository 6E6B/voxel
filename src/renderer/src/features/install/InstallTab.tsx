import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  HardDrive,
  Plus,
  Trash2,
  RefreshCw,
  Play,
  FolderOpen,
  Box,
  Laptop,
  Loader2,
  MoreHorizontal,
  Settings2,
  Download,
  Monitor
} from 'lucide-react'
import { RobloxInstallation, BinaryType } from '@renderer/types'
import { Button } from '@renderer/components/UI/buttons/Button'
import CustomDropdown from '@renderer/components/UI/menus/CustomDropdown'
import GenericContextMenu from '@renderer/components/UI/menus/GenericContextMenu'
import ConfirmModal from '@renderer/components/UI/dialogs/ConfirmModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '@renderer/components/UI/dialogs/Dialog'
import { useNotification } from '@renderer/features/system/stores/useSnackbarStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'
import { EmptyState } from '@renderer/components/UI/feedback/EmptyState'
import {
  useInstallationsStore,
  useInstallations,
  useDeployHistory,
  getApiType
} from './stores/useInstallationsStore'
import type { DetectedInstallation } from '@shared/ipc-schemas/system'

// Unified installation type for display
interface UnifiedInstallation {
  id: string
  name: string
  binaryType: BinaryType
  version: string
  channel: string
  path: string
  status: 'Ready' | 'Updating' | 'Error'
  isSystem: boolean
  original: RobloxInstallation | null
  detected: DetectedInstallation | null
}

const isMac = window.platform?.isMac ?? false

const InstallTab: React.FC = () => {
  const { showNotification } = useNotification()

  const installations = useInstallations()
  const history = useDeployHistory()
  const { addInstallation, updateInstallation, removeInstallation, setDeployHistory } =
    useInstallationsStore()

  const [showNewModal, setShowNewModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState<UnifiedInstallation | null>(null)
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number } | null
    install: UnifiedInstallation | null
  }>({ position: null, install: null })

  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<BinaryType>(
    isMac ? BinaryType.MacPlayer : BinaryType.WindowsPlayer
  )
  const [newVersion, setNewVersion] = useState('')
  const [newChannel, setNewChannel] = useState('live')
  const [isInstalling, setIsInstalling] = useState(false)
  const [isVerifying, setIsVerifying] = useState<string | null>(null)
  const [installProgress, setInstallProgress] = useState({ status: '', percent: 0, detail: '' })

  const [fflags, setFFlags] = useState<Record<string, any>>({})
  const [newFlagKey, setNewFlagKey] = useState('')
  const [newFlagValue, setNewFlagValue] = useState('')

  const [detectedInstallations, setDetectedInstallations] = useState<DetectedInstallation[]>([])

  const [isCheckingUpdate, setIsCheckingUpdate] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    isDangerous?: boolean
    confirmText?: string
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDangerous: false
  })

  useEffect(() => {
    // @ts-ignore
    window.api.getDeployHistory().then(setDeployHistory).catch(console.error)
  }, [setDeployHistory])

  useEffect(() => {
    const detectInstallations = async () => {
      try {
        // @ts-ignore
        const detected = await window.api.detectDefaultInstallations()
        setDetectedInstallations(detected || [])
      } catch (e) {
        console.error('Failed to detect default installations', e)
      }
    }
    detectInstallations()
  }, [])

  // Filter out detected installations that are already added by the user
  const filteredDetectedInstallations = useMemo(() => {
    const userPaths = new Set(installations.map((i) => i.path.toLowerCase()))
    return detectedInstallations.filter((d) => !userPaths.has(d.path.toLowerCase()))
  }, [detectedInstallations, installations])

  // Total count for display
  const totalInstallationsCount = installations.length + filteredDetectedInstallations.length

  // Combine all installations into a unified list
  const allInstallations = useMemo((): UnifiedInstallation[] => {
    const userInstalls: UnifiedInstallation[] = installations.map((install) => ({
      id: install.id,
      name: install.name,
      binaryType: install.binaryType,
      version: install.version,
      channel: install.channel,
      path: install.path,
      status: install.status,
      isSystem: false,
      original: install,
      detected: null
    }))

    const detectedInstalls: UnifiedInstallation[] = filteredDetectedInstallations.map(
      (detected) => ({
        id: `detected-${detected.path}`,
        name:
          detected.binaryType === BinaryType.WindowsStudio ||
          detected.binaryType === BinaryType.MacStudio
            ? 'Studio'
            : 'Player',
        binaryType: detected.binaryType as BinaryType,
        version: detected.version,
        channel: 'Default',
        path: detected.path,
        status: 'Ready' as const,
        isSystem: true,
        original: null,
        detected: detected
      })
    )

    return [...userInstalls, ...detectedInstalls]
  }, [installations, filteredDetectedInstallations])

  useEffect(() => {
    if (showConfigModal) {
      loadFFlags(showConfigModal)
    } else {
      setFFlags({})
    }
  }, [showConfigModal])

  const loadFFlags = async (install: UnifiedInstallation) => {
    try {
      // @ts-ignore
      const flags = await window.api.getFFlags(install.path)
      setFFlags(flags || {})
    } catch (e) {
      console.error('Failed to load FFlags', e)
    }
  }

  const handleSaveFFlags = async () => {
    if (!showConfigModal) return
    try {
      // @ts-ignore
      await window.api.setFFlags(showConfigModal.path, fflags)
      showNotification('FFlags saved successfully', 'success')
    } catch (e) {
      showNotification('Failed to save FFlags', 'error')
    }
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

  const availableVersions = history[getApiType(newType)] || []

  const binaryTypeOptions = isMac
    ? [BinaryType.MacPlayer, BinaryType.MacStudio]
    : [BinaryType.WindowsPlayer, BinaryType.WindowsStudio]

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isMac) {
      showNotification('Creating new installations is disabled on macOS for now.', 'warning')
      return
    }

    const versionToInstall = newVersion || availableVersions[0]

    if (!versionToInstall) {
      showNotification('No version selected or available', 'error')
      return
    }

    setIsInstalling(true)
    setInstallProgress({ status: 'Starting...', percent: 0, detail: '' })

    const apiType = getApiType(newType)

    const onProgress = (_: any, { status, progress, detail }: any) => {
      setInstallProgress({ status, percent: progress, detail: detail || '' })
    }

    // @ts-ignore
    window.electron.ipcRenderer.on('install-progress', onProgress)

    try {
      // @ts-ignore
      const path = await window.api.installRobloxVersion(apiType, versionToInstall)

      if (path) {
        const newInstall: RobloxInstallation = {
          id: Math.random().toString(36).slice(2, 11),
          name: newName,
          binaryType: newType,
          version: versionToInstall,
          channel: newChannel,
          path: path,
          lastUpdated: new Date().toISOString().split('T')[0],
          status: 'Ready'
        }
        addInstallation(newInstall)
        setNewName('')
        setNewVersion('')
        setNewChannel('live')
        setShowNewModal(false)
        showNotification('Installation created successfully', 'success')
      } else {
        showNotification('Installation failed. Check console for details.', 'error')
      }
    } catch (err) {
      console.error(err)
      showNotification('Installation error: ' + err, 'error')
    } finally {
      // @ts-ignore
      window.electron.ipcRenderer.removeListener('install-progress', onProgress)
      setIsInstalling(false)
    }
  }

  const handleDelete = (install: UnifiedInstallation) => {
    const message = install.isSystem
      ? `This will remove the default Roblox installation detected at "${install.path}". This action cannot be undone.`
      : `Are you sure you want to delete "${install.name}"? This action cannot be undone.`

    setConfirmModal({
      isOpen: true,
      title: 'Delete Installation',
      message,
      isDangerous: true,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          // @ts-ignore
          await window.api.uninstallRobloxVersion(install.path)
          showNotification('Installation deleted', 'success')
        } catch (e) {
          console.error('Uninstall failed', e)
          showNotification('Failed to delete installation files', 'error')
        }
        if (install.isSystem) {
          setDetectedInstallations((prev) =>
            prev.filter((d) => d.path.toLowerCase() !== install.path.toLowerCase())
          )
        } else {
          removeInstallation(install.id)
        }
      }
    })
  }

  const handleCheckForUpdates = async (install: UnifiedInstallation) => {
    if (isCheckingUpdate) return

    const binaryType = install.original?.binaryType ?? install.binaryType
    setIsCheckingUpdate(install.id)

    try {
      // Use the install IPC directly to avoid clashing with the app updater API
      // @ts-ignore
      const result = await window.electron.ipcRenderer.invoke(
        'check-for-updates',
        getApiType(binaryType),
        install.version
      )

      if (result?.hasUpdate) {
        showNotification(`Update available: ${result.latestVersion}`, 'info')
      } else {
        showNotification('This installation is up to date', 'success')
      }
    } catch (e) {
      showNotification('Failed to check for updates: ' + e, 'error')
    } finally {
      setIsCheckingUpdate(null)
    }
  }

  const handleLaunch = async (install: UnifiedInstallation) => {
    showNotification('Launching Roblox...', 'info')
    try {
      // @ts-ignore
      await window.api.launchRobloxInstall(install.path)
      showNotification('Roblox launched successfully', 'success')
    } catch (e) {
      showNotification('Failed to launch: ' + e, 'error')
    }
  }

  const handleOpenLocation = async (install: UnifiedInstallation) => {
    try {
      // @ts-ignore
      await window.api.openRobloxFolder(install.path)
    } catch (e) {
      showNotification('Failed to open folder: ' + e, 'error')
    }
  }

  const handleVerify = (install: UnifiedInstallation) => {
    const binaryType = install.original?.binaryType ?? install.binaryType

    setConfirmModal({
      isOpen: true,
      title: 'Verify Files',
      message:
        'This will reinstall the current version to verify and fix any missing files. This process may take a few minutes. Continue?',
      isDangerous: false,
      confirmText: 'Verify',
      onConfirm: async () => {
        setIsVerifying(install.id)
        setInstallProgress({ status: 'Verifying...', percent: 0, detail: '' })

        const onProgress = (_: any, { status, progress, detail }: any) => {
          setInstallProgress({ status, percent: progress, detail: detail || '' })
        }

        // @ts-ignore
        window.electron.ipcRenderer.on('install-progress', onProgress)

        try {
          // @ts-ignore
          await window.api.verifyRobloxFiles(getApiType(binaryType), install.version, install.path)

          if (!install.isSystem) {
            updateInstallation(install.id, {
              lastUpdated: new Date().toISOString().split('T')[0],
              status: 'Ready'
            })
          }
          showNotification('Verification complete!', 'success')
        } catch (e) {
          showNotification('Verification failed: ' + e, 'error')
        } finally {
          // @ts-ignore
          window.electron.ipcRenderer.removeListener('install-progress', onProgress)
          setIsVerifying(null)
        }
      }
    })
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col h-full bg-[var(--color-app-bg)] overflow-hidden text-[var(--color-text-secondary)]"
      >
        {/* Header */}
        <div className="shrink-0 h-[72px] bg-[var(--color-surface-strong)] border-b border-[var(--color-border)] flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Installations</h1>
            <span className="flex items-center justify-center px-2.5 py-0.5 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs font-semibold tracking-tight text-[var(--color-text-muted)]">
              {totalInstallationsCount}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={async () => {
                    try {
                      // @ts-ignore
                      await window.api
                        .getDeployHistory()
                        .then(setDeployHistory)
                        .catch(console.error)
                      // Also refresh detected installations
                      // @ts-ignore
                      const detected = await window.api.detectDefaultInstallations()
                      setDetectedInstallations(detected || [])
                      showNotification('Refreshed successfully', 'success')
                    } catch (e) {
                      showNotification('Failed to refresh', 'error')
                    }
                  }}
                  className="pressable flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs font-medium border bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </TooltipTrigger>
              <TooltipContent>Refresh version history and installations</TooltipContent>
            </Tooltip>
            <Button
              variant="default"
              onClick={() => !isMac && setShowNewModal(true)}
              className="gap-2.5"
              disabled={isMac}
            >
              <Plus size={18} />
              <span>New Installation</span>
            </Button>
          </div>
        </div>

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {totalInstallationsCount === 0 ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                icon={Download}
                title="No installations yet"
                description="Create your first Roblox installation to get started"
                variant="minimal"
              />
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {allInstallations.map((install, index) => {
                const isStudio =
                  install.binaryType === BinaryType.WindowsStudio ||
                  install.binaryType === BinaryType.MacStudio
                const isThisVerifying = isVerifying === install.id

                return (
                  <motion.div
                    key={install.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm transition-all duration-200 hover:bg-[var(--color-surface-strong)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-lg)]"
                  >
                    {/* Card Header */}
                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              isStudio
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            {isStudio ? <Box size={20} /> : <Laptop size={20} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white truncate">{install.name}</h3>
                              {install.isSystem && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                      <Monitor size={13} />
                                      System
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Default Roblox installation</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 mt-0.5">
                              {isStudio ? 'Studio' : 'Player'} • {install.channel}
                            </p>
                          </div>
                        </div>

                        {/* Action Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const rect = e.currentTarget.getBoundingClientRect()
                            setContextMenu({
                              position: { x: rect.right, y: rect.bottom + 4 },
                              install: install
                            })
                          }}
                          className="pressable p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Version Info */}
                    <div className="px-4 pb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                            install.status === 'Ready'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : install.status === 'Updating'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {install.status === 'Updating' && (
                            <RefreshCw size={8} className="animate-spin" />
                          )}
                          {install.status}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs font-mono text-neutral-600 truncate max-w-[140px]">
                              {install.version}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{install.version}</TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Verify Progress */}
                      {isThisVerifying && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
                            <span>{installProgress.status}</span>
                            <span>{installProgress.percent}%</span>
                          </div>
                          <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${installProgress.percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Launch Button */}
                    <div className="px-4 pb-4">
                      <button
                        onClick={() => handleLaunch(install)}
                        disabled={isThisVerifying}
                        className="pressable w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-medium transition-all hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play size={14} fill="currentColor" />
                        Launch
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* New Installation Modal */}
      <Dialog isOpen={showNewModal} onClose={() => !isInstalling && setShowNewModal(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Installation</DialogTitle>
            {!isInstalling && <DialogClose />}
          </DialogHeader>
          <DialogBody>
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300 pb-1 block">Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. My Custom Version"
                  className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text-primary)] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)] transition-all placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300 pb-1 block">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {binaryTypeOptions.map((type) => {
                    const isStudio =
                      type === BinaryType.WindowsStudio || type === BinaryType.MacStudio
                    const isSelected = newType === type
                    const selectedClasses = isStudio
                      ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                      : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewType(type)}
                        className={`pressable flex items-center gap-3 p-3 rounded-lg border transition-all ${
                          isSelected
                            ? selectedClasses
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                        }`}
                      >
                        {isStudio ? <Box size={20} /> : <Laptop size={20} />}
                        <span className="text-sm font-medium">
                          {isStudio ? 'Studio' : 'Player'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300 pb-1 block">Version</label>
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
                    buttonClassName="bg-[var(--color-surface-muted)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] rounded-lg px-4 py-2.5 text-[var(--color-text-primary)] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-300 pb-1 block">Channel</label>
                  <input
                    type="text"
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value)}
                    placeholder="live"
                    className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text-primary)] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)] transition-all placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isInstalling || !newName}
                className={`pressable w-full flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold rounded-lg transition-all border border-[var(--accent-color-border)] shadow-[0_10px_30px_var(--accent-color-shadow)] disabled:opacity-50 disabled:cursor-not-allowed ${
                  isInstalling ? 'py-4' : 'py-3'
                }`}
              >
                {isInstalling ? (
                  <div className="w-full flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 size={16} className="animate-spin" />
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
                  <>
                    <HardDrive size={18} />
                    <span>Install</span>
                  </>
                )}
              </button>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* FFlags Configuration Modal */}
      <Dialog isOpen={!!showConfigModal} onClose={() => setShowConfigModal(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div>
              <DialogTitle>Client Settings</DialogTitle>
              {showConfigModal && (
                <p className="text-xs text-neutral-500 mt-0.5">{showConfigModal.name}</p>
              )}
            </div>
            <DialogClose />
          </DialogHeader>
          <DialogBody className="overflow-y-auto flex-1 space-y-4">
            {/* Existing Flags */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto scrollbar-thin pr-2">
              {Object.keys(fflags).length === 0 && (
                <div className="text-neutral-500 text-sm text-center py-6 bg-neutral-950 rounded-lg border border-neutral-800">
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
                      <span className="flex-1 font-mono text-xs text-neutral-300 truncate">
                        {key}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{key}</TooltipContent>
                  </Tooltip>
                  <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    {String(val)}
                  </span>
                  <button
                    onClick={() => removeFlag(key)}
                    className="pressable opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 transition-all p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Flag */}
            <div className="border-t border-neutral-800 pt-4">
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
              <p className="text-[10px] text-neutral-500 mt-2">
                Values 'true'/'false' become booleans. Numeric strings become numbers.
              </p>
            </div>
          </DialogBody>
          <div className="px-6 py-4 border-t border-neutral-800 shrink-0">
            <button
              onClick={handleSaveFFlags}
              className="pressable w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold rounded-lg transition-colors border border-[var(--accent-color-border)]"
            >
              Save Changes
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card Context Menu */}
      <GenericContextMenu
        position={contextMenu.position}
        onClose={() => setContextMenu({ position: null, install: null })}
        sections={
          contextMenu.install
            ? [
                {
                  items: [
                    {
                      label: 'Open Location',
                      icon: <FolderOpen size={14} />,
                      onClick: () => contextMenu.install && handleOpenLocation(contextMenu.install)
                    },
                    {
                      label: 'Configure FFlags',
                      icon: <Settings2 size={14} />,
                      onClick: () => contextMenu.install && setShowConfigModal(contextMenu.install)
                    },
                    {
                      label:
                        isCheckingUpdate === contextMenu.install?.id
                          ? 'Checking...'
                          : 'Check for Updates',
                      icon: (
                        <RefreshCw
                          size={14}
                          className={
                            isCheckingUpdate === contextMenu.install?.id ? 'animate-spin' : ''
                          }
                        />
                      ),
                      onClick: () =>
                        contextMenu.install && handleCheckForUpdates(contextMenu.install)
                    },
                    {
                      label: 'Verify Files',
                      icon: <RefreshCw size={14} />,
                      onClick: () => contextMenu.install && handleVerify(contextMenu.install)
                    }
                  ]
                },
                {
                  items: [
                    {
                      label: 'Delete',
                      icon: <Trash2 size={14} />,
                      onClick: () => contextMenu.install && handleDelete(contextMenu.install),
                      variant: 'danger' as const
                    }
                  ]
                }
              ]
            : []
        }
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDangerous={confirmModal.isDangerous}
        confirmText={confirmModal.confirmText}
      />
    </>
  )
}

export default InstallTab
