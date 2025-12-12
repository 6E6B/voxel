import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Download, Check, Loader2, Box, Laptop, HardDrive } from 'lucide-react'
import CustomDropdown from '@renderer/components/UI/menus/CustomDropdown'
import { BinaryType, RobloxInstallation } from '@renderer/types'
import {
  useInstallationsStore,
  useInstallations,
  useDeployHistory,
  getApiType
} from '@renderer/features/install/stores/useInstallationsStore'

interface InstallationStepProps {
  onComplete: () => void
  onSkip: () => void
}

const InstallationStep: React.FC<InstallationStepProps> = ({ onComplete, onSkip }) => {
  const [name, setName] = useState('My Roblox')
  const [type, setType] = useState<BinaryType>(BinaryType.WindowsPlayer)
  const [version, setVersion] = useState('')
  const [isInstalling, setIsInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState({ status: '', percent: 0 })
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const installations = useInstallations()
  const history = useDeployHistory()
  const { addInstallation, setDeployHistory } = useInstallationsStore()

  // Load deploy history on mount
  useEffect(() => {
    window.api.getDeployHistory().then(setDeployHistory).catch(console.error)
  }, [setDeployHistory])

  const availableVersions = useMemo(() => history[getApiType(type)] ?? [], [history, type])

  const versionOptions = useMemo(() => {
    if (availableVersions.length === 0) {
      return [{ value: '', label: 'Loading...' }]
    }
    return availableVersions.map((v, i) => ({
      value: v,
      label: v,
      subLabel: i === 0 ? '(Latest)' : undefined
    }))
  }, [availableVersions])

  const handleInstall = async () => {
    const versionToInstall = version || availableVersions[0]
    if (!versionToInstall) {
      setError('No version available')
      return
    }

    setIsInstalling(true)
    setInstallProgress({ status: 'Starting...', percent: 0 })
    setError(null)

    const apiType = getApiType(type)

    const onProgress = (_: any, { status, progress }: any) => {
      setInstallProgress({ status, percent: progress })
    }

    window.electron.ipcRenderer.on('install-progress', onProgress)

    try {
      const path = await window.api.installRobloxVersion(apiType, versionToInstall)

      if (path) {
        const newInstall: RobloxInstallation = {
          id: Math.random().toString(36).slice(2, 11),
          name: name || 'My Roblox',
          binaryType: type,
          version: versionToInstall,
          channel: 'live',
          path: path,
          lastUpdated: new Date().toISOString().split('T')[0],
          status: 'Ready'
        }
        addInstallation(newInstall)
        setSuccess(true)
        setTimeout(() => onComplete(), 1500)
      } else {
        setError('Installation failed. Please try again.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Installation failed')
    } finally {
      window.electron.ipcRenderer.removeListener('install-progress', onProgress)
      setIsInstalling(false)
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6"
        >
          <Check className="w-10 h-10 text-emerald-500" />
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-2">Installation Complete!</h3>
        <p className="text-neutral-400 text-sm">Your Roblox is ready to use</p>
      </motion.div>
    )
  }

  // Check if there are already installations (from system detection)
  const hasExistingInstallations = installations.length > 0

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-4">
          <Download className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">Create Installation</h3>
        <p className="text-sm text-neutral-500">
          Set up a custom Roblox installation for version control
        </p>
      </div>

      {hasExistingInstallations && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-200/80">
          <p>
            We detected {installations.length} existing installation
            {installations.length > 1 ? 's' : ''}. You can skip this step or create an additional
            one.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-400 block mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Custom Version"
            disabled={isInstalling}
            className="w-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-[var(--color-text-primary)] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)] transition-all disabled:opacity-50 placeholder:text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-400 block mb-1.5">Type</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType(BinaryType.WindowsPlayer)}
              disabled={isInstalling}
              className={`pressable flex items-center gap-3 p-3 rounded-lg border transition-all disabled:opacity-50 ${
                type === BinaryType.WindowsPlayer
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              <Laptop size={20} />
              <span className="text-sm font-medium">Player</span>
            </button>
            <button
              type="button"
              onClick={() => setType(BinaryType.WindowsStudio)}
              disabled={isInstalling}
              className={`pressable flex items-center gap-3 p-3 rounded-lg border transition-all disabled:opacity-50 ${
                type === BinaryType.WindowsStudio
                  ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              <Box size={20} />
              <span className="text-sm font-medium">Studio</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-400 block mb-1.5">Version</label>
          <CustomDropdown
            options={versionOptions}
            value={version}
            onChange={setVersion}
            placeholder={availableVersions.length > 0 ? 'Latest' : 'Loading...'}
            buttonClassName="bg-[var(--color-surface-muted)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] rounded-lg px-4 py-2.5 text-[var(--color-text-primary)] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)]"
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        onClick={handleInstall}
        disabled={isInstalling || !name.trim()}
        className={`pressable w-full flex items-center justify-center gap-2 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold rounded-lg transition-all border border-[var(--accent-color-border)] shadow-[0_10px_30px_var(--accent-color-shadow)] disabled:opacity-50 disabled:cursor-not-allowed ${
          isInstalling ? 'py-4' : 'py-3'
        }`}
      >
        {isInstalling ? (
          <div className="w-full flex flex-col items-center gap-2 px-4">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 size={16} className="animate-spin" />
              <span>
                {installProgress.status} ({installProgress.percent}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-[var(--accent-color-foreground)]/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent-color-foreground)] transition-all duration-300"
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

      <div className="pt-4 border-t border-neutral-800">
        <button
          onClick={onSkip}
          disabled={isInstalling}
          className="w-full text-center text-sm text-neutral-500 hover:text-neutral-300 transition-colors py-2 disabled:opacity-50"
        >
          {hasExistingInstallations ? 'Use existing installation' : 'Skip for now'}
        </button>
      </div>
    </div>
  )
}

export default InstallationStep
