import React from 'react'
import { RefreshCw, Download, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { useUpdater } from './useUpdater'
import { cn } from '@renderer/shared/lib/utils'

const UpdaterCard: React.FC = () => {
  const { state, isChecking, isDownloading, checkForUpdates, downloadUpdate, installUpdate } =
    useUpdater()

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatSpeed = (bytesPerSecond: number) => {
    return formatBytes(bytesPerSecond) + '/s'
  }

  const getStatusMessage = () => {
    switch (state?.status) {
      case 'idle':
        return 'Click to check for updates'
      case 'checking':
        return 'Checking for updates...'
      case 'available':
        return `Version ${state.info?.version} is available`
      case 'not-available':
        return 'You are running the latest version'
      case 'downloading':
        return 'Downloading update...'
      case 'downloaded':
        return 'Update ready to install'
      case 'error':
        return state.error || 'An error occurred'
      default:
        return 'Check for updates'
    }
  }

  const getStatusIcon = () => {
    switch (state?.status) {
      case 'checking':
      case 'downloading':
        return <Loader2 size={16} className="animate-spin text-[var(--accent-color)]" />
      case 'available':
        return <Download size={16} className="text-[var(--accent-color)]" />
      case 'not-available':
        return <CheckCircle size={16} className="text-green-400" />
      case 'downloaded':
        return <CheckCircle size={16} className="text-green-400" />
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />
      default:
        return <Info size={16} className="text-neutral-400" />
    }
  }

  return (
    <div className="flex flex-col space-y-3">
      {/* Status Card */}
      <div className="p-4 bg-neutral-900/30 rounded-lg border border-neutral-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className="text-sm text-white">{getStatusMessage()}</p>
              {state?.status === 'available' && state.info?.releaseNotes && (
                <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                  {typeof state.info.releaseNotes === 'string'
                    ? state.info.releaseNotes
                    : 'New features and improvements'}
                </p>
              )}
            </div>
          </div>

          {/* Action Button */}
          {state?.status === 'idle' || state?.status === 'not-available' || !state ? (
            <button
              onClick={checkForUpdates}
              disabled={isChecking}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
                'bg-neutral-800 text-white hover:bg-neutral-700',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <RefreshCw size={14} className={cn(isChecking && 'animate-spin')} />
              Check
            </button>
          ) : state?.status === 'available' ? (
            <button
              onClick={downloadUpdate}
              disabled={isDownloading}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
                'bg-[var(--accent-color)] text-[var(--accent-color-foreground)]',
                'hover:opacity-90',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <Download size={14} />
              Download
            </button>
          ) : state?.status === 'downloaded' ? (
            <button
              onClick={installUpdate}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
                'bg-green-600 text-white hover:bg-green-500'
              )}
            >
              <CheckCircle size={14} />
              Install & Restart
            </button>
          ) : state?.status === 'error' ? (
            <button
              onClick={checkForUpdates}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2',
                'bg-neutral-800 text-white hover:bg-neutral-700'
              )}
            >
              <RefreshCw size={14} />
              Retry
            </button>
          ) : null}
        </div>

        {/* Download Progress */}
        {state?.status === 'downloading' && state.progress && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>
                {formatBytes(state.progress.transferred)} / {formatBytes(state.progress.total)}
              </span>
              <span>{formatSpeed(state.progress.bytesPerSecond)}</span>
            </div>
            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[var(--accent-color)] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${state.progress.percent}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
            <p className="text-xs text-neutral-500 text-center">
              {Math.round(state.progress.percent)}% complete
            </p>
          </div>
        )}
      </div>

      {/* Current Version Info */}
      <p className="text-xs text-neutral-600 px-1">
        Current version: {__APP_VERSION__ || 'development'}
      </p>
    </div>
  )
}

// Declare the global app version variable
declare const __APP_VERSION__: string | undefined

export default UpdaterCard
