import { shell } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import { randomUUID } from 'crypto'
import { RobloxAuthService } from '../auth/RobloxAuthService'
import { RobloxInstallService } from './InstallService'

const execAsync = promisify(exec)

export class RobloxLauncherService {
  private static async getRobloxProcessCount(): Promise<number> {
    try {
      const { stdout } = await execAsync(
        'tasklist /FI "IMAGENAME eq RobloxPlayerBeta.exe" /FO CSV /NH'
      )
      if (stdout.includes('No tasks')) {
        return 0
      }
      // Count lines that contain the executable name
      return stdout
        .trim()
        .split('\n')
        .filter((line) => line.includes('RobloxPlayerBeta.exe')).length
    } catch (error) {
      // If tasklist fails or returns error code (which it does if no process found on some versions), return 0
      return 0
    }
  }

  static async launchGame(
    cookie: string,
    placeId: number | string,
    jobId?: string,
    friendId?: string | number,
    installPath?: string
  ) {
    try {
      const csrfToken = await RobloxAuthService.getCsrfToken(cookie)
      const ticket = await RobloxAuthService.getAuthenticationTicket(cookie, csrfToken)

      const nowMs = Date.now()
      const browserTrackerId = Date.now().toString() + Math.floor(Math.random() * 10000)
      const joinAttemptId = randomUUID()

      let placeLauncherUrl: string

      if (friendId) {
        placeLauncherUrl =
          `https://www.roblox.com/Game/PlaceLauncher.ashx?` +
          `request=RequestFollowUser` +
          `&browserTrackerId=${browserTrackerId}` +
          `&userId=${friendId}` +
          `&isPlayTogetherGame=false` +
          `&joinAttemptId=${joinAttemptId}` +
          `&joinAttemptOrigin=followUser`
      } else if (jobId) {
        // Joining a specific server (job)
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
        // Joining any server
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

      // 1. Get initial process count
      const initialCount = await this.getRobloxProcessCount()

      // 2. Launch
      if (installPath) {
        await RobloxInstallService.launchWithProtocol(installPath, protocolLaunchCommand)
      } else {
        await shell.openExternal(protocolLaunchCommand)
      }

      // 3. Poll for process increase
      const startTime = Date.now()
      const timeout = 10000 // 10 seconds

      while (Date.now() - startTime < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 1000)) // Wait 1s
        const currentCount = await this.getRobloxProcessCount()

        if (currentCount > initialCount) {
          return { success: true }
        }
      }

      throw new Error('Timeout: Roblox process did not start within 10 seconds')
    } catch (error: any) {
      console.error('Failed to launch Roblox:', error)
      throw new Error(`Failed to launch Roblox: ${error.message}`)
    }
  }
}
