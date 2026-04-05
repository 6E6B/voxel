import { shell } from 'electron'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { randomUUID } from 'crypto'
import { RobloxAuthService } from '../auth/RobloxAuthService'
import { RobloxInstallService } from './InstallService'

const execAsync = promisify(exec)

export class RobloxLauncherService {
  private static normalizeLaunchInstallPath(installPath: string): string {
    return process.platform === 'win32' && installPath.toLowerCase().endsWith('.exe')
      ? path.dirname(installPath)
      : installPath
  }

  private static hasLaunchableExecutable(installPath: string): boolean {
    const normalizedInstallPath = this.normalizeLaunchInstallPath(installPath)

    if (process.platform === 'darwin') {
      return fs.existsSync(normalizedInstallPath)
    }

    return fs.existsSync(path.join(normalizedInstallPath, 'RobloxPlayerBeta.exe'))
  }

  private static async resolveLaunchInstallPath(
    preferredInstallPath?: string
  ): Promise<string | null> {
    if (preferredInstallPath && this.hasLaunchableExecutable(preferredInstallPath)) {
      return this.normalizeLaunchInstallPath(preferredInstallPath)
    }

    const activeInstallPath = await RobloxInstallService.getActiveInstallPath()
    if (activeInstallPath && this.hasLaunchableExecutable(activeInstallPath)) {
      return this.normalizeLaunchInstallPath(activeInstallPath)
    }

    const detectedInstalls = await RobloxInstallService.detectDefaultInstallations()
    const playerInstall = detectedInstalls.find(
      (install) =>
        (install.binaryType === 'WindowsPlayer' || install.binaryType === 'MacPlayer') &&
        this.hasLaunchableExecutable(install.path)
    )

    if (playerInstall) {
      return playerInstall.path
    }

    const managedInstalls = await RobloxInstallService.detectManagedInstallations()
    const managedPlayerInstall = managedInstalls.find(
      (install) =>
        (install.binaryType === 'WindowsPlayer' || install.binaryType === 'MacPlayer') &&
        this.hasLaunchableExecutable(install.path)
    )

    return managedPlayerInstall?.path ?? null
  }

  private static async getRobloxProcessCount(): Promise<number> {
    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync('pgrep -x RobloxPlayer 2>/dev/null || true')
        const lines = stdout
          .trim()
          .split('\n')
          .filter((line) => line.length > 0 && /^\d+$/.test(line))
        return lines.length
      } else {
        const { stdout } = await execAsync(
          'tasklist /FI "IMAGENAME eq RobloxPlayerBeta.exe" /FO CSV /NH'
        )
        if (stdout.includes('No tasks')) {
          return 0
        }
        return stdout
          .trim()
          .split('\n')
          .filter((line) => line.includes('RobloxPlayerBeta.exe')).length
      }
    } catch {
      return 0
    }
  }

  static async launchGame(
    cookie: string,
    placeId: number | string,
    jobId?: string,
    friendId?: string | number,
    installPath?: string,
    accessCode?: string
  ) {
    try {
      const ticket = await RobloxAuthService.getAuthenticationTicket(cookie)

      const nowMs = Date.now()
      const browserTrackerId = Date.now().toString() + Math.floor(Math.random() * 10000)
      const joinAttemptId = randomUUID()

      let placeLauncherUrl: string

      if (accessCode) {
        placeLauncherUrl =
          `https://www.roblox.com/Game/PlaceLauncher.ashx?` +
          `request=RequestPrivateGame` +
          `&browserTrackerId=${browserTrackerId}` +
          `&placeId=${placeId}` +
          `&accessCode=${accessCode}` +
          `&linkCode=${accessCode}` +
          `&isPlayTogetherGame=false` +
          `&joinAttemptId=${joinAttemptId}` +
          `&joinAttemptOrigin=PrivateServerListJoin`
      } else if (friendId) {
        placeLauncherUrl =
          `https://www.roblox.com/Game/PlaceLauncher.ashx?` +
          `request=RequestFollowUser` +
          `&browserTrackerId=${browserTrackerId}` +
          `&userId=${friendId}` +
          `&isPlayTogetherGame=false` +
          `&joinAttemptId=${joinAttemptId}` +
          `&joinAttemptOrigin=followUser`
      } else if (jobId) {
        placeLauncherUrl =
          `https://www.roblox.com/Game/PlaceLauncher.ashx?` +
          `request=RequestGameJob` +
          `&browserTrackerId=${browserTrackerId}` +
          `&placeId=${placeId}` +
          `&gameId=${jobId}` +
          `&isPlayTogetherGame=false` +
          `&joinAttemptId=${joinAttemptId}` +
          `&joinAttemptOrigin=publicServerListJoin`
      } else {
        placeLauncherUrl =
          `https://www.roblox.com/Game/PlaceLauncher.ashx?` +
          `request=RequestGame` +
          `&browserTrackerId=${browserTrackerId}` +
          `&placeId=${placeId}` +
          `&isPlayTogetherGame=false` +
          `&joinAttemptId=${joinAttemptId}` +
          `&joinAttemptOrigin=PlayButton`
      }

      const protocolLaunchCommand =
        `roblox-player:1+launchmode:play` +
        `+gameinfo:${ticket}` +
        `+launchtime:${nowMs}` +
        `+placelauncherurl:${encodeURIComponent(placeLauncherUrl)}` +
        `+browsertrackerid:${browserTrackerId}` +
        `+robloxLocale:en_us` +
        `+gameLocale:en_us` +
        `+channel:` +
        `+LaunchExp:InApp`

      const initialCount = await this.getRobloxProcessCount()

      const resolvedInstallPath = await this.resolveLaunchInstallPath(installPath)

      if (resolvedInstallPath) {
        await RobloxInstallService.launchWithProtocol(resolvedInstallPath, protocolLaunchCommand)
      } else {
        await shell.openExternal(protocolLaunchCommand)
      }

      const startTime = Date.now()
      const timeout = process.platform === 'darwin' ? 20000 : 10000

      while (Date.now() - startTime < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        const currentCount = await this.getRobloxProcessCount()

        if (currentCount > initialCount) {
          return { success: true }
        }
      }

      if (process.platform === 'darwin') {
        return { success: true }
      }

      throw new Error('Timeout: Roblox process did not start within expected time')
    } catch (error: any) {
      console.error('Failed to launch Roblox:', error)
      throw new Error(`Failed to launch Roblox: ${error.message}`)
    }
  }
}
