import { EventEmitter } from 'events'
import { exec } from 'child_process'
import { promisify } from 'util'
import { RobloxGameService } from './GameService'
import { storageService } from '../system/StorageService'

const execAsync = promisify(exec)

const POLL_INTERVAL = 1000
const POLL_START_DELAY = 15000

export interface GameSession {
  placeId: string
  name: string
  thumbnailUrl?: string
  startedAt: number
}

export interface GameSessionEvents {
  'game-started': (session: GameSession) => void
  'game-ended': (session: GameSession) => void
}

class GameSessionService extends EventEmitter {
  private currentSession: GameSession | null = null
  private pollingInterval: NodeJS.Timeout | null = null
  private pollingTimeout: NodeJS.Timeout | null = null

  getCurrentSession(): GameSession | null {
    return this.currentSession
  }

  async startSession(placeId: string | number): Promise<void> {
    const placeIdStr = String(placeId)

    let name = `Game ${placeIdStr}`
    let thumbnailUrl: string | undefined

    try {
      const accounts = storageService.getAccounts()
      const accountWithCookie = accounts.find((acc) => acc.cookie && acc.cookie.length > 0)
      const cookie = accountWithCookie ? accountWithCookie.cookie : undefined

      const games = await RobloxGameService.getGamesByPlaceIds([placeIdStr], cookie)
      if (games && games.length > 0) {
        name = games[0].name
        const universeId = parseInt(games[0].universeId)
        try {
          thumbnailUrl = (await RobloxGameService.getGameIconThumbnail(universeId)) ?? undefined
        } catch {
          // Ignore thumbnail errors
        }
      }
    } catch (error) {
      console.error('[GameSession] Failed to fetch game details:', error)
    }

    this.currentSession = {
      placeId: placeIdStr,
      name,
      thumbnailUrl,
      startedAt: Date.now()
    }

    console.log('[GameSession] Started:', name)
    this.emit('game-started', this.currentSession)
    this.startPolling()
  }

  endSession(): void {
    if (this.currentSession) {
      console.log('[GameSession] Ended:', this.currentSession.name)
      this.emit('game-ended', this.currentSession)
      this.currentSession = null
    }
    this.stopPolling()
  }

  private async getRobloxProcessCount(): Promise<number> {
    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync('pgrep -x RobloxPlayer 2>/dev/null || true')
        return stdout
          .trim()
          .split('\n')
          .filter((line) => line.length > 0 && /^\d+$/.test(line)).length
      } else {
        const { stdout } = await execAsync(
          'tasklist /FI "IMAGENAME eq RobloxPlayerBeta.exe" /FO CSV /NH'
        )
        if (stdout.includes('No tasks')) return 0
        return stdout
          .trim()
          .split('\n')
          .filter((line) => line.includes('RobloxPlayerBeta.exe')).length
      }
    } catch {
      return 0
    }
  }

  private startPolling(): void {
    this.stopPolling()

    this.pollingTimeout = setTimeout(() => {
      if (!this.currentSession) return

      this.pollingInterval = setInterval(async () => {
        if (!this.currentSession) {
          this.stopPolling()
          return
        }

        const count = await this.getRobloxProcessCount()
        if (count === 0) {
          this.endSession()
        }
      }, POLL_INTERVAL)
    }, POLL_START_DELAY)
  }

  private stopPolling(): void {
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout)
      this.pollingTimeout = null
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }
}

export const gameSessionService = new GameSessionService()
