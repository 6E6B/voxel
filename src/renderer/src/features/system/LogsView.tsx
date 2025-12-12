import React, { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react'
import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  FileText,
  Clock3,
  Server,
  Briefcase,
  Globe,
  Radio,
  Cpu,
  CheckCircle2,
  FileClock,
  AlertTriangle,
  Bug,
  MapPin,
  Trash2,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { SearchInput } from '@renderer/components/UI/inputs/SearchInput'
import { Virtuoso } from 'react-virtuoso'
import { useClickOutside } from '../../hooks/useClickOutside'
import ConfirmModal from '@renderer/components/UI/dialogs/ConfirmModal'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/UI/display/Tooltip'
import type { LogMetadata } from '@shared/ipc-schemas/system'
import { useLogs, useLogContent, useDeleteAllLogs, useDeleteLog } from './api/useLogs'
import { queryKeys } from '@shared/queryKeys'
import {
  useAutoRefreshEnabled,
  useLogSearchQuery,
  useSelectedLogId,
  useSetSelectedLogId,
  useSetLogSearchQuery,
  useToggleAutoRefresh
} from './stores/useLogsStore'

interface LogEntry {
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  source: string
  message: string
}

interface ProcessedLog extends LogMetadata {
  id: string
  createdAt: string
  formattedSize: string
  date: string
}

interface SelectedLog extends ProcessedLog {
  entries: LogEntry[]
  isLoadingContent: boolean
  isTruncated: boolean
  totalLines: number
}

const MAX_DISPLAY_LINES = 1000

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

const parseLogLines = (content: string): LogEntry[] => {
  const lines = content.split('\n')
  return lines
    .map((line) => {
      // Example: 2025-11-21T03:32:41.169Z,0.169887,2588,6,Warning [FLog::RobloxStarter] Starting module: Network
      const match = line.match(
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z),[^,]+,[^,]+,[^,]+,(\w+) \[(.*?)\] (.*)$/
      )
      if (match) {
        let level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' = 'INFO'
        const rawLevel = match[2].toUpperCase()
        if (rawLevel.includes('ERROR') || rawLevel.includes('CRITICAL')) level = 'ERROR'
        else if (rawLevel.includes('WARN')) level = 'WARN'
        else if (rawLevel.includes('DEBUG')) level = 'DEBUG'

        return {
          timestamp: match[1].split('T')[1].replace('Z', ''),
          level,
          source: match[3],
          message: match[4]
        }
      }

      if (line.trim() === '') return null

      return {
        timestamp: '',
        level: 'INFO',
        source: 'System',
        message: line
      }
    })
    .filter(Boolean) as LogEntry[]
}

const useTruncationCheck = <T extends HTMLElement>(deps: React.DependencyList = []) => {
  const ref = useRef<T | null>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useLayoutEffect(() => {
    const updateIsTruncated = () => {
      const el = ref.current
      if (!el) return
      setIsTruncated(el.scrollWidth - el.clientWidth > 1)
    }

    const element = ref.current
    if (!element) return

    updateIsTruncated()

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateIsTruncated)
      resizeObserver.observe(element)
    }

    window.addEventListener('resize', updateIsTruncated)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateIsTruncated)
    }
  }, [...deps])

  return { ref, isTruncated }
}

interface TruncationTooltipValueProps {
  value?: string | null
  className?: string
  fallback?: string
}

const TruncationTooltipValue: React.FC<TruncationTooltipValueProps> = ({
  value,
  className,
  fallback = 'N/A'
}) => {
  const displayValue = value || fallback
  const { ref, isTruncated } = useTruncationCheck<HTMLDivElement>([displayValue])

  const content = (
    <div ref={ref} className={className}>
      {displayValue}
    </div>
  )

  if (!isTruncated) {
    return content
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{displayValue}</TooltipContent>
    </Tooltip>
  )
}

const LogsTab: React.FC = () => {
  const logSearchQuery = useLogSearchQuery()
  const setLogSearchQuery = useSetLogSearchQuery()
  const selectedLogId = useSelectedLogId()
  const setSelectedLogId = useSetSelectedLogId()
  const autoRefreshEnabled = useAutoRefreshEnabled()
  const toggleAutoRefresh = useToggleAutoRefresh()
  const queryClient = useQueryClient()
  const { data: logsMetadata = [], isLoading } = useLogs({
    refetchInterval: autoRefreshEnabled ? 5000 : false
  })
  const { mutateAsync: deleteLogMutation } = useDeleteLog()
  const { mutateAsync: deleteAllLogsMutation } = useDeleteAllLogs()
  const [gameName, setGameName] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; logId: string } | null>(
    null
  )
  const [logPendingDeletion, setLogPendingDeletion] = useState<ProcessedLog | null>(null)
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useClickOutside(contextMenuRef, () => setContextMenu(null))

  const logs = useMemo<ProcessedLog[]>(() => {
    return logsMetadata.map((meta) => {
      const dateObj = new Date(meta.lastModified)
      return {
        ...meta,
        id: meta.filename,
        createdAt: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        formattedSize: formatBytes(meta.size),
        date: dateObj.toLocaleDateString()
      }
    })
  }, [logsMetadata])

  const handleContextMenu = (e: React.MouseEvent, logId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, logId })
  }

  const handleRefreshLog = (logId: string) => {
    setContextMenu(null)
    queryClient.invalidateQueries({ queryKey: queryKeys.logs.content(logId) })
  }

  const handleOpenInNotepad = async (logId: string) => {
    setContextMenu(null)
    try {
      await window.api.openLogFile(logId)
    } catch (error) {
      console.error('Failed to open log in Notepad:', error)
    }
  }

  const handleDeleteLog = (logId: string) => {
    setContextMenu(null)
    const target = logs.find((l) => l.id === logId) || null
    setLogPendingDeletion(target)
  }

  const confirmDeleteLog = async () => {
    if (!logPendingDeletion) return
    const logId = logPendingDeletion.id

    try {
      const success = await deleteLogMutation(logPendingDeletion.filename)
      if (success && selectedLogId === logId) {
        setSelectedLogId(null)
      } else if (!success) {
        console.warn('Failed to delete log file.')
      }
    } catch (error) {
      console.error('Error deleting log:', error)
    }
    setLogPendingDeletion(null)
  }

  const handleClearAllLogs = () => {
    setIsClearAllModalOpen(true)
  }

  const confirmClearAllLogs = async () => {
    try {
      const success = await deleteAllLogsMutation()
      if (success) {
        setSelectedLogId(null)
      } else {
        console.warn('Failed to delete all logs.')
      }
    } catch (error) {
      console.error('Error deleting all logs:', error)
    }
    setIsClearAllModalOpen(false)
  }

  const selectedLogMeta = useMemo(() => {
    return logs.find((log) => log.id === selectedLogId) ?? null
  }, [logs, selectedLogId])

  useEffect(() => {
    if (selectedLogId && !selectedLogMeta) {
      setSelectedLogId(null)
    }
  }, [selectedLogId, selectedLogMeta, setSelectedLogId])

  const { data: rawLogContent, isFetching: isLogContentFetching } = useLogContent(
    selectedLogMeta?.filename ?? null
  )

  const selectedLog: SelectedLog | null = useMemo(() => {
    if (!selectedLogMeta) {
      return null
    }

    if (!rawLogContent) {
      return {
        ...selectedLogMeta,
        entries: [],
        totalLines: 0,
        isTruncated: false,
        isLoadingContent: isLogContentFetching
      }
    }

    const allEntries = parseLogLines(rawLogContent)
    const totalLines = allEntries.length
    const isTruncated = totalLines > MAX_DISPLAY_LINES
    const entries = isTruncated ? allEntries.slice(-MAX_DISPLAY_LINES) : allEntries

    return {
      ...selectedLogMeta,
      entries,
      isTruncated,
      totalLines,
      isLoadingContent: isLogContentFetching
    }
  }, [selectedLogMeta, rawLogContent, isLogContentFetching])

  const groupedLogs = useMemo(() => {
    const filteredLogs = logSearchQuery
      ? logs.filter((log) => log.filename.toLowerCase().includes(logSearchQuery.toLowerCase()))
      : logs

    const today = new Date().toLocaleDateString()
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString()

    const grouped = filteredLogs.reduce(
      (acc, log) => {
        let label = log.date
        if (log.date === today) label = 'Today'
        else if (log.date === yesterday) label = 'Yesterday'

        if (!acc[label]) acc[label] = []
        acc[label].push(log)
        return acc
      },
      {} as Record<string, ProcessedLog[]>
    )

    // Sort groups: Today, Yesterday, then others
    const labels = Object.keys(grouped)
    labels.sort((a, b) => {
      if (a === 'Today') return -1
      if (b === 'Today') return 1
      if (a === 'Yesterday') return -1
      if (b === 'Yesterday') return 1
      return new Date(b).getTime() - new Date(a).getTime()
    })

    return labels.map((label) => ({
      label,
      logs: grouped[label]
    }))
  }, [logs, logSearchQuery])

  useEffect(() => {
    const fetchGameName = async () => {
      setGameName(null)
      if (!selectedLogMeta?.universeId) return

      try {
        const api = (window as any).api
        if (typeof api.getGamesByUniverseIds === 'function') {
          const universeId = parseInt(selectedLogMeta.universeId)
          if (!isNaN(universeId)) {
            const games = await api.getGamesByUniverseIds([universeId])
            if (games && games.length > 0) {
              setGameName(games[0].name)
            }
          }
        } else {
          console.warn('getGamesByUniverseIds API not available')
        }
      } catch (e) {
        console.error('Failed to fetch game name:', e)
      }
    }
    fetchGameName()
  }, [selectedLogMeta?.universeId])

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
      <div className="shrink-0 h-[72px] bg-[var(--color-surface-strong)] border-b border-[var(--color-border)] flex items-center justify-between px-6 z-20">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Logs</h1>
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleClearAllLogs}
                className="pressable flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-colors text-xs font-medium border border-red-500/20"
              >
                <Trash2 size={14} />
                Clear All
              </button>
            </TooltipTrigger>
            <TooltipContent>Delete all log files</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleAutoRefresh}
                className={`pressable flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs font-medium border ${
                  autoRefreshEnabled
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <RefreshCw size={14} className={autoRefreshEnabled ? 'animate-spin' : ''} />
                {autoRefreshEnabled ? 'Auto Refresh: On' : 'Auto Refresh: Off'}
              </button>
            </TooltipTrigger>
            <TooltipContent>Toggle 5s background refresh</TooltipContent>
          </Tooltip>
          <SearchInput
            value={logSearchQuery}
            onChange={setLogSearchQuery}
            placeholder="Search logs..."
            containerClassName="w-64"
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-[var(--color-surface-strong)] border-r border-[var(--color-border)] flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
            {isLoading ? (
              <div className="text-center py-10 text-neutral-500 text-sm">Loading logs...</div>
            ) : groupedLogs.length > 0 ? (
              groupedLogs.map((group) => (
                <div key={group.label}>
                  <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                    <Calendar size={12} />
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {group.logs.map((log, index) => {
                      const isSelected = selectedLogId === log.id
                      return (
                        <motion.button
                          key={log.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.4, delay: index * 0.03 }}
                          onClick={() => setSelectedLogId(log.id)}
                          onContextMenu={(e) => handleContextMenu(e, log.id)}
                          whileTap={{ scale: 0.97 }}
                          className={`pressable relative w-full flex items-start gap-3 p-3 rounded-lg transition-all text-left group overflow-hidden ${
                            isSelected
                              ? 'bg-[var(--color-surface-hover)] border border-[var(--color-border-strong)] shadow-[0_10px_30px_rgba(0,0,0,0.28)]'
                              : 'hover:bg-[var(--color-surface-hover)] border border-transparent'
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[var(--accent-color)]" />
                          )}
                          <div
                            className={`mt-0.5 ${
                              isSelected
                                ? 'text-[var(--color-text-primary)]'
                                : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]'
                            }`}
                          >
                            <FileText size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className={`text-sm font-medium truncate ${isSelected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}
                            >
                              {log.filename}
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                                <Clock3 size={10} /> {log.createdAt}
                              </span>
                              <span className="text-[10px] text-[var(--color-text-muted)] font-mono bg-[var(--color-surface-muted)] px-1.5 py-0.5 rounded border border-[var(--color-border-subtle)]">
                                {log.formattedSize}
                              </span>
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-neutral-500 text-sm">No logs found.</div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-[var(--color-app-bg)] min-w-0">
          {selectedLog ? (
            <>
              <div className="shrink-0 grid grid-cols-2 xl:grid-cols-3 gap-4 p-6 border-b border-neutral-800 bg-neutral-900/20">
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-start gap-3 group hover:border-neutral-700 transition-colors">
                  <div className="p-2 rounded-md bg-neutral-800 text-neutral-400 group-hover:text-white transition-colors">
                    <Server size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-0.5">
                      Server IP
                    </div>
                    <TruncationTooltipValue
                      value={selectedLog.serverIp}
                      className="text-sm font-mono text-white truncate"
                    />
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-start gap-3 group hover:border-neutral-700 transition-colors">
                  <div className="p-2 rounded-md bg-neutral-800 text-neutral-400 group-hover:text-white transition-colors">
                    <Briefcase size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-0.5">
                      Job ID
                    </div>
                    <TruncationTooltipValue
                      value={selectedLog.jobId}
                      className="text-sm font-mono text-white truncate"
                    />
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-start gap-3 group hover:border-neutral-700 transition-colors">
                  <div className="p-2 rounded-md bg-neutral-800 text-neutral-400 group-hover:text-white transition-colors">
                    <Globe size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-0.5">
                      Game
                    </div>
                    <TruncationTooltipValue
                      value={gameName || selectedLog.universeId}
                      className="text-sm font-mono text-white truncate"
                    />
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-start gap-3 group hover:border-neutral-700 transition-colors">
                  <div className="p-2 rounded-md bg-neutral-800 text-neutral-400 group-hover:text-white transition-colors">
                    <Radio size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-0.5">
                      Channel
                    </div>
                    <TruncationTooltipValue
                      value={selectedLog.channel}
                      className="text-sm font-mono text-white truncate"
                    />
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-start gap-3 group hover:border-neutral-700 transition-colors">
                  <div className="p-2 rounded-md bg-neutral-800 text-neutral-400 group-hover:text-white transition-colors">
                    <Cpu size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-0.5">
                      Version
                    </div>
                    <TruncationTooltipValue
                      value={selectedLog.version}
                      className="text-sm font-mono text-white truncate"
                    />
                  </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-start gap-3 group hover:border-neutral-700 transition-colors">
                  <div className="p-2 rounded-md bg-neutral-800 text-neutral-400 group-hover:text-white transition-colors">
                    <MapPin size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-0.5">
                      Place ID
                    </div>
                    <TruncationTooltipValue
                      value={selectedLog.placeId}
                      className="text-sm font-mono text-white truncate"
                    />
                  </div>
                </div>
              </div>

              {/* Log Toolbar */}
              <div className="shrink-0 h-10 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-900/50 text-xs">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="font-mono text-neutral-400">{selectedLog.filename}</span>
                  <span className="text-neutral-600">|</span>
                  <span className="text-neutral-400">{selectedLog.date}</span>
                  <span className="text-neutral-600">|</span>
                  <span className="text-neutral-400 flex items-center gap-1">
                    <FileText size={10} />
                    {selectedLog.totalLines ? selectedLog.totalLines.toLocaleString() : 0} lines
                  </span>
                  {selectedLog.isTruncated && (
                    <>
                      <span className="text-neutral-600">|</span>
                      <span className="text-yellow-500 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        Truncated
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2"></div>
              </div>

              <div className="flex-1 overflow-hidden font-mono text-sm bg-[#0d0d0d]">
                {selectedLog.isLoadingContent ? (
                  <div className="flex items-center justify-center h-full text-neutral-500">
                    Loading content...
                  </div>
                ) : (
                  <Virtuoso
                    style={{ height: '100%' }}
                    data={selectedLog.entries}
                    overscan={200}
                    computeItemKey={(index, entry) =>
                      `${selectedLog.id ?? 'log'}-${index}-${entry.timestamp}-${entry.source}`
                    }
                    itemContent={(idx, entry) => (
                      <div
                        key={idx}
                        className="flex items-start gap-1.5 py-1 hover:bg-neutral-900 rounded transition-colors group/line"
                      >
                        <span className="text-neutral-600 shrink-0 select-none w-[5px] text-right">
                          {entry.timestamp}
                        </span>
                        {entry.level !== 'INFO' && (
                          <span
                            className={`shrink-0 w-16 text-[10px] font-bold px-1.5 py-0.5 rounded text-center select-none flex items-center justify-center gap-1 ${
                              entry.level === 'WARN'
                                ? 'bg-yellow-500/10 text-yellow-400'
                                : entry.level === 'ERROR'
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'bg-neutral-500/10 text-neutral-400'
                            }`}
                          >
                            {entry.level === 'ERROR' && <Bug size={10} />}
                            {entry.level === 'WARN' && <AlertTriangle size={10} />}
                            {entry.level}
                          </span>
                        )}
                        <span className="text-purple-400/60 shrink-0 select-none w-auto max-w-[120px] truncate text-xs mt-0.5 ml-1">
                          [{entry.source}]
                        </span>
                        <span className="text-neutral-300 break-all whitespace-pre-wrap flex-1 ml-1">
                          {entry.message}
                        </span>
                      </div>
                    )}
                    components={{
                      Footer: () => (
                        <div className="mt-8 pt-4 border-t border-neutral-800/50 text-center text-xs text-neutral-700 italic select-none flex items-center justify-center gap-2 pb-4">
                          <CheckCircle2 size={12} /> End of log file
                        </div>
                      )
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-500">
              <div className="w-20 h-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6 shadow-2xl">
                <FileClock size={40} className="opacity-50" />
              </div>
              <p className="text-xl font-bold text-white">No Log Selected</p>
              <p className="text-sm mt-2 max-w-xs text-center text-neutral-400">
                Select a log file from the sidebar to view detailed session information.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu &&
        createPortal(
          <div
            ref={contextMenuRef}
            className="fixed z-50 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl py-1"
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 100),
              left: Math.min(contextMenu.x, window.innerWidth - 200)
            }}
          >
            <button
              onClick={() => handleOpenInNotepad(contextMenu.logId)}
              className="pressable w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white flex items-center gap-2"
            >
              <ExternalLink size={16} />
              <span>Open in Notepad</span>
            </button>
            <button
              onClick={() => handleRefreshLog(contextMenu.logId)}
              className="pressable w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white flex items-center gap-2"
            >
              <RefreshCw size={16} />
              <span>Refresh Log</span>
            </button>
            <div className="h-px bg-neutral-800 my-1"></div>
            <button
              onClick={() => handleDeleteLog(contextMenu.logId)}
              className="pressable w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
            >
              <Trash2 size={16} />
              <span>Delete Log</span>
            </button>
          </div>,
          document.body
        )}
      {logPendingDeletion && (
        <ConfirmModal
          isOpen={!!logPendingDeletion}
          onClose={() => setLogPendingDeletion(null)}
          onConfirm={confirmDeleteLog}
          title="Delete log file"
          message={`Are you sure you want to delete ${logPendingDeletion.filename}? This cannot be undone.`}
          confirmText="Delete"
          isDangerous
        />
      )}
      {isClearAllModalOpen && (
        <ConfirmModal
          isOpen={isClearAllModalOpen}
          onClose={() => setIsClearAllModalOpen(false)}
          onConfirm={confirmClearAllLogs}
          title="Delete all logs"
          message="Are you sure you want to delete all log files? This cannot be undone."
          confirmText="Delete All"
          isDangerous
        />
      )}
    </div>
  )
}

export default LogsTab
