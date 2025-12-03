import { app } from 'electron'
import path from 'path'
import { z } from 'zod'
import { handle } from '../core/utils/handle'
import { RobloxInstallService } from './InstallService'

/**
 * Registers Roblox installation-related IPC handlers
 */
export const registerInstallHandlers = (): void => {
  handle('get-deploy-history', z.tuple([]), async () => {
    return RobloxInstallService.getDeployHistory()
  })

  handle(
    'install-roblox-version',
    z.tuple([z.string(), z.string(), z.string().optional()]),
    async (event, binaryType, version, installPath) => {
      const webContents = event.sender

      const targetPath =
        installPath || path.join(app.getPath('userData'), 'Versions', `${binaryType}-${version}`)

      // Since we can't pass a callback through IPC directly, we'll emit events
      const success = await RobloxInstallService.downloadAndInstall(
        binaryType,
        version,
        targetPath,
        (status, progress, detail) => {
          webContents.send('install-progress', { status, progress, detail })
        }
      )
      return success ? targetPath : null
    }
  )

  handle('launch-roblox-install', z.tuple([z.string()]), async (_, installPath) => {
    return RobloxInstallService.launch(installPath)
  })

  handle('uninstall-roblox-version', z.tuple([z.string()]), async (_, installPath) => {
    return RobloxInstallService.uninstall(installPath)
  })

  handle('open-roblox-folder', z.tuple([z.string()]), async (_, installPath) => {
    return RobloxInstallService.openFolder(installPath)
  })

  handle(
    'check-for-updates',
    z.tuple([z.string(), z.string()]),
    async (_, binaryType, currentVersionHash) => {
      return RobloxInstallService.checkForUpdates(binaryType, currentVersionHash)
    }
  )

  handle(
    'verify-roblox-files',
    z.tuple([z.string(), z.string(), z.string()]),
    async (event, binaryType, version, installPath) => {
      const webContents = event.sender
      // Reinstall over existing path to verify/fix files
      const success = await RobloxInstallService.downloadAndInstall(
        binaryType,
        version,
        installPath,
        (status, progress, detail) => {
          webContents.send('install-progress', { status, progress, detail })
        }
      )
      return success
    }
  )

  handle('get-fflags', z.tuple([z.string()]), async (_, installPath) => {
    return RobloxInstallService.getFFlags(installPath)
  })

  handle(
    'set-fflags',
    z.tuple([z.string(), z.record(z.string(), z.unknown())]),
    async (_, installPath, flags) => {
      return RobloxInstallService.setFFlags(installPath, flags)
    }
  )

  handle('set-active-install', z.tuple([z.string()]), async (_, installPath) => {
    return RobloxInstallService.setActive(installPath)
  })

  handle('remove-active-install', z.tuple([]), async () => {
    return RobloxInstallService.removeActive()
  })

  handle('get-active-install-path', z.tuple([]), async () => {
    return RobloxInstallService.getActiveInstallPath()
  })

  handle('detect-default-installations', z.tuple([]), async () => {
    return RobloxInstallService.detectDefaultInstallations()
  })
}
