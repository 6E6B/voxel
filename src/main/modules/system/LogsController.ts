import { ipcMain, IpcMainInvokeEvent, shell } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import { spawn } from 'child_process'
import { z } from 'zod'

const LOGS_DIR = path.join(process.env.LOCALAPPDATA || '', 'Roblox', 'logs')

interface LogMetadata {
  filename: string
  path: string
  lastModified: number
  size: number
  timestamp?: string
  channel?: string
  version?: string
  jobId?: string
  universeId?: string
  placeId?: string
  serverIp?: string
}

const parseLogContent = (content: string): Partial<LogMetadata> => {
  const metadata: Partial<LogMetadata> = {}

  const timestampMatch = content.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/m)
  if (timestampMatch) {
    metadata.timestamp = timestampMatch[1]
  }

  const channelMatch = content.match(/\[FLog::ClientRunInfo\] The channel is (\w+)/)
  if (channelMatch) {
    metadata.channel = channelMatch[1]
  }

  const versionMatchA = content.match(/"version":"([\d\.]+)"/)
  const versionMatchB = content.match(/Server Prefix: ([\d\.]+)_/)
  const versionMatchC = content.match(/userAgent: Roblox\/[^/]+\/([\d\.]+)/)

  if (versionMatchA) metadata.version = versionMatchA[1]
  else if (versionMatchB) metadata.version = versionMatchB[1]
  else if (versionMatchC) metadata.version = versionMatchC[1]

  const jobIdMatchA = content.match(/! Joining game '([0-9a-f-]{36})'/)
  const jobIdMatchB = content.match(/game_\d+_\d+_([0-9a-f-]{36})_/)

  if (jobIdMatchA) metadata.jobId = jobIdMatchA[1]
  else if (jobIdMatchB) metadata.jobId = jobIdMatchB[1]

  const universeIdMatch = content.match(/universeid:(\d+)/)
  if (universeIdMatch) {
    metadata.universeId = universeIdMatch[1]
  }

  const ipMatchA = content.match(/UDMUX Address = ([\d\.]+)/)
  const ipMatchB = content.match(/Connection accepted from ([\d\.]+)/)
  const ipMatchC = content.match(/Connecting to UDMUX server ([\d\.]+)/)

  if (ipMatchA) metadata.serverIp = ipMatchA[1]
  else if (ipMatchB) metadata.serverIp = ipMatchB[1]
  else if (ipMatchC) metadata.serverIp = ipMatchC[1]

  const placeIdMatchA = content.match(/placeid:(\d+)/)
  const placeIdMatchB = content.match(/place (\d+) at/)

  if (placeIdMatchA) metadata.placeId = placeIdMatchA[1]
  else if (placeIdMatchB) metadata.placeId = placeIdMatchB[1]

  return metadata
}

const handle = <T extends any[]>(
  channel: string,
  schema: z.ZodType<T>,
  handler: (event: IpcMainInvokeEvent, ...args: T) => Promise<any>
) => {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const validated = schema.parse(args)
      return await handler(event, ...validated)
    } catch (err) {
      console.error(`IPC Validation Error on ${channel}:`, err)
      throw err
    }
  })
}

const logFilenameSchema = z.string().regex(/^[a-zA-Z0-9._-]+\.log$/, 'Invalid log filename format')

export const registerLogsHandlers = () => {
  handle('get-logs', z.tuple([]), async () => {
    try {
      if (!process.env.LOCALAPPDATA) {
        console.error('LOCALAPPDATA environment variable not set')
        return []
      }

      if (!existsSync(LOGS_DIR)) {
        console.warn('Roblox logs directory not found:', LOGS_DIR)
        return []
      }

      const files = await fs.readdir(LOGS_DIR)
      const logFiles = files.filter((f) => f.endsWith('.log'))

      const logs: LogMetadata[] = await Promise.all(
        logFiles.map(async (file) => {
          const filePath = path.join(LOGS_DIR, file)
          try {
            const stats = await fs.stat(filePath)

            const content = await fs.readFile(filePath, 'utf8')
            const parsed = parseLogContent(content)

            return {
              filename: file,
              path: filePath,
              lastModified: stats.mtimeMs,
              size: stats.size,
              ...parsed
            }
          } catch (err) {
            console.error(`Error reading log file ${file}:`, err)
            return {
              filename: file,
              path: filePath,
              lastModified: 0,
              size: 0
            }
          }
        })
      )

      return logs.sort((a, b) => b.lastModified - a.lastModified)
    } catch (error) {
      console.error('Error fetching logs:', error)
      return []
    }
  })

  handle('get-log-content', z.tuple([logFilenameSchema]), async (_, filename) => {
    try {
      const filePath = path.join(LOGS_DIR, filename)
      if (path.dirname(filePath) !== LOGS_DIR) {
        throw new Error('Invalid file path')
      }
      return await fs.readFile(filePath, 'utf8')
    } catch (error) {
      console.error('Error reading log content:', error)
      throw error
    }
  })

  handle('delete-log', z.tuple([logFilenameSchema]), async (_, filename) => {
    try {
      const filePath = path.join(LOGS_DIR, filename)
      if (path.dirname(filePath) !== LOGS_DIR) {
        throw new Error('Invalid file path')
      }
      if (existsSync(filePath)) {
        await fs.unlink(filePath)
        return true
      }
      return false
    } catch (error) {
      console.error('Error deleting log:', error)
      return false
    }
  })

  handle('delete-all-logs', z.tuple([]), async () => {
    try {
      if (!existsSync(LOGS_DIR)) return true
      const files = await fs.readdir(LOGS_DIR)
      const logFiles = files.filter((f) => f.endsWith('.log'))
      await Promise.all(
        logFiles.map((f) =>
          fs.unlink(path.join(LOGS_DIR, f)).catch((e) => console.error(`Failed to delete ${f}:`, e))
        )
      )
      return true
    } catch (error) {
      console.error('Error deleting all logs:', error)
      return false
    }
  })

  handle('open-log-file', z.tuple([logFilenameSchema]), async (_, filename) => {
    try {
      const filePath = path.join(LOGS_DIR, filename)
      if (path.dirname(filePath) !== LOGS_DIR) {
        throw new Error('Invalid file path')
      }

      if (process.platform === 'win32') {
        try {
          const child = spawn('notepad.exe', [filePath], {
            detached: true,
            stdio: 'ignore'
          })
          child.unref()
          return true
        } catch (err) {
          console.error('Failed to launch Notepad, falling back to default handler:', err)
        }
      }

      const result = await shell.openPath(filePath)
      if (result) {
        console.error('shell.openPath returned an error:', result)
        return false
      }

      return true
    } catch (error) {
      console.error('Error opening log file:', error)
      return false
    }
  })
}
