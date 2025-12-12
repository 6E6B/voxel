import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen, Settings2, Trash2, RefreshCw } from 'lucide-react'
import { RobloxInstallation, BinaryType } from '@renderer/types'
import GenericContextMenu from '@renderer/components/UI/menus/GenericContextMenu'
import ConfirmModal from '@renderer/components/UI/dialogs/ConfirmModal'
import { useNotification } from '@renderer/features/system/stores/useSnackbarStore'
import {
  useInstallationsStore,
  useInstallations,
  useDeployHistory,
  getApiType
} from './stores/useInstallationsStore'
import type { DetectedInstallation } from '@shared/ipc-schemas/system'

import { InstallationsHeader } from './components/InstallationsHeader'
import { InstallationList } from './components/InstallationList'
import { CreateInstallationModal } from './components/CreateInstallationModal'
import { CustomizeInstallationModal } from './components/CustomizeInstallationModal'
import { UnifiedInstallation } from './types'

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

  const [isInstalling, setIsInstalling] = useState(false)
  const [isVerifying, setIsVerifying] = useState<string | null>(null)
  const [installProgress, setInstallProgress] = useState({ status: '', percent: 0, detail: '' })

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
    window.api.getDeployHistory().then(setDeployHistory).catch(console.error)
  }, [setDeployHistory])

  useEffect(() => {
    const detectInstallations = async () => {
      try {
        const detected = await window.api.detectDefaultInstallations()
        setDetectedInstallations(detected || [])
      } catch (e) {
        console.error('Failed to update detections', e)
      }
    }
    detectInstallations()
  }, [])

  const handleRefresh = async () => {
    try {
      await window.api.getDeployHistory().then(setDeployHistory)
      const detected = await window.api.detectDefaultInstallations()
      setDetectedInstallations(detected || [])
      showNotification('Refreshed successfully', 'success')
    } catch (_e) {
      showNotification('Failed to refresh', 'error')
    }
  }

  // Filter out detected installations that are already added by the user
  const filteredDetectedInstallations = useMemo(() => {
    const userPaths = new Set(installations.map((i) => i.path.toLowerCase()))
    return detectedInstallations.filter((d) => !userPaths.has(d.path.toLowerCase()))
  }, [detectedInstallations, installations])

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

  const handleCreate = async (name: string, type: BinaryType, version: string, channel: string) => {
    if (isMac) {
      showNotification('Creating new installations is disabled on macOS for now.', 'warning')
      return
    }

    if (!version) {
      showNotification('No version selected or available', 'error')
      return
    }

    setIsInstalling(true)
    setInstallProgress({ status: 'Starting...', percent: 0, detail: '' })

    const apiType = getApiType(type)

    const onProgress = (_: any, { status, progress, detail }: any) => {
      setInstallProgress({ status, percent: progress, detail: detail || '' })
    }

    window.electron.ipcRenderer.on('install-progress', onProgress)

    try {
      const path = await window.api.installRobloxVersion(apiType, version)

      if (path) {
        const newInstall: RobloxInstallation = {
          id: Math.random().toString(36).slice(2, 11),
          name: name,
          binaryType: type,
          version: version,
          channel: channel,
          path: path,
          lastUpdated: new Date().toISOString().split('T')[0],
          status: 'Ready'
        }
        addInstallation(newInstall)
        setShowNewModal(false)
        showNotification('Installation created successfully', 'success')
      } else {
        showNotification('Installation failed. Check console for details.', 'error')
      }
    } catch (err) {
      console.error(err)
      showNotification('Installation error: ' + err, 'error')
    } finally {
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

  const performUpdate = async (install: UnifiedInstallation, newVersion: string) => {
    console.log('[InstallTab] performUpdate', { install, newVersion })
    const binaryType = install.original?.binaryType ?? install.binaryType
    const apiType = getApiType(binaryType)

    setIsVerifying(install.id)
    setInstallProgress({ status: 'Updating...', percent: 0, detail: '' })

    const onProgress = (_: any, { status, progress, detail }: any) => {
      setInstallProgress({ status, percent: progress, detail: detail || '' })
    }

    // Determine target path
    let targetPath = install.path
    // Check if this is a versioned folder (Windows style default install)
    const versionString = `version-${install.version}`
    const isVersionedFolder = install.isSystem && install.path.includes(versionString)

    if (isVersionedFolder) {
      // Replace the LAST occurrence of the version string to be safe
      const lastIndex = install.path.lastIndexOf(versionString)
      if (lastIndex !== -1) {
        targetPath =
          install.path.substring(0, lastIndex) +
          `version-${newVersion}` +
          install.path.substring(lastIndex + versionString.length)
      }
    }

    console.log('[InstallTab] Target path:', targetPath)

    window.electron.ipcRenderer.on('install-progress', onProgress)

    try {
      const successPath = await window.api.installRobloxVersion(apiType, newVersion, targetPath)
      console.log('[InstallTab] Install success:', successPath)

      if (successPath) {
        if (install.isSystem) {
          // Cleanup old if we moved it
          if (isVersionedFolder && targetPath !== install.path) {
            console.log('[InstallTab] Cleaning up old version:', install.path)
            try {
              await window.api.uninstallRobloxVersion(install.path)
            } catch (e) {
              console.warn('Failed to cleanup old version', e)
            }
          }

          // Delay to ensure FS operations are settled
          await new Promise((r) => setTimeout(r, 1000))

          // Refresh detected installations
          console.log('[InstallTab] Refreshing detections')
          try {
            const detected = await window.api.detectDefaultInstallations()
            console.log('[InstallTab] Detected:', detected)
            setDetectedInstallations(detected || [])
          } catch (e) {
            console.error('Failed to refresh detected installations', e)
          }
        } else {
          updateInstallation(install.id, {
            version: newVersion,
            lastUpdated: new Date().toISOString().split('T')[0],
            status: 'Ready'
          })
        }
        showNotification('Update complete!', 'success')
      } else {
        showNotification('Update failed check console', 'error')
      }
    } catch (e) {
      console.error(e)
      showNotification('Update failed: ' + e, 'error')
    } finally {
      window.electron.ipcRenderer.removeListener('install-progress', onProgress)
      setIsVerifying(null)
    }
  }

  const handleCheckForUpdates = async (install: UnifiedInstallation) => {
    if (isCheckingUpdate) return

    const binaryType = install.original?.binaryType ?? install.binaryType
    setIsCheckingUpdate(install.id)

    try {
      // Use the install IPC directly to avoid clashing with the app updater API
      const result = await window.electron.ipcRenderer.invoke(
        'check-for-updates',
        getApiType(binaryType),
        install.version
      )

      if (result?.hasUpdate) {
        setConfirmModal({
          isOpen: true,
          title: 'Update Available',
          message: `A new version (${result.latestVersion}) is available. Do you want to update now?`,
          confirmText: 'Update',
          onConfirm: () => performUpdate(install, result.latestVersion)
        })
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
      await window.api.launchRobloxInstall(install.path)
      showNotification('Roblox launched successfully', 'success')
    } catch (e) {
      showNotification('Failed to launch: ' + e, 'error')
    }
  }

  const handleOpenLocation = async (install: UnifiedInstallation) => {
    try {
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

        window.electron.ipcRenderer.on('install-progress', onProgress)

        try {
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
        className="flex flex-col h-full bg-neutral-950 overflow-hidden text-[var(--color-text-secondary)]"
      >
        <InstallationsHeader
          count={allInstallations.length}
          onRefresh={handleRefresh}
          onNew={() => !isMac && setShowNewModal(true)}
          isMac={isMac}
        />

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <InstallationList
            installations={allInstallations}
            isVerifying={isVerifying}
            installProgress={installProgress}
            onLaunch={handleLaunch}
            onContextMenu={(e, install) => {
              // Calculate position based on event
              const rect = e.currentTarget.getBoundingClientRect()
              setContextMenu({
                position: { x: rect.right, y: rect.bottom + 4 },
                install: install
              })
            }}
          />
        </div>
      </motion.div>

      <CreateInstallationModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        isMac={isMac}
        history={history}
        isInstalling={isInstalling}
        installProgress={installProgress}
        onCreate={handleCreate}
      />

      <CustomizeInstallationModal
        isOpen={!!showConfigModal}
        onClose={() => setShowConfigModal(null)}
        install={showConfigModal}
      />

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
                      label: 'Customize',
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
