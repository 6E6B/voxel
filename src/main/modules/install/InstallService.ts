import { net, shell } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { pipeline } from 'stream'
import { promisify } from 'util'
import { spawn } from 'child_process'
import * as yauzl from 'yauzl'
import { safeFetchText } from '@main/lib/request'
import { fflagsSchema } from '@shared/ipc-schemas/system'
import { deployHistorySchema } from '@shared/ipc-schemas/user'

const streamPipeline = promisify(pipeline)

// Types for detected installations
export interface DetectedInstallation {
  path: string
  version: string
  binaryType: 'WindowsPlayer' | 'WindowsStudio'
  exePath: string
}

// Constants
const AWS_MIRROR = 'https://setup-aws.rbxcdn.com'
const DEPLOY_HISTORY_URL = 'https://setup.rbxcdn.com/DeployHistory.txt'

const EXTRACT_ROOTS: Record<string, Record<string, string>> = {
  player: {
    'RobloxApp.zip': '',
    'redist.zip': '',
    'shaders.zip': 'shaders/',
    'ssl.zip': 'ssl/',
    'WebView2.zip': '',
    'WebView2RuntimeInstaller.zip': 'WebView2RuntimeInstaller/',
    'content-avatar.zip': 'content/avatar/',
    'content-configs.zip': 'content/configs/',
    'content-fonts.zip': 'content/fonts/',
    'content-sky.zip': 'content/sky/',
    'content-sounds.zip': 'content/sounds/',
    'content-textures2.zip': 'content/textures/',
    'content-models.zip': 'content/models/',
    'content-platform-fonts.zip': 'PlatformContent/pc/fonts/',
    'content-platform-dictionaries.zip': 'PlatformContent/pc/shared_compression_dictionaries/',
    'content-terrain.zip': 'PlatformContent/pc/terrain/',
    'content-textures3.zip': 'PlatformContent/pc/textures/',
    'extracontent-luapackages.zip': 'ExtraContent/LuaPackages/',
    'extracontent-translations.zip': 'ExtraContent/translations/',
    'extracontent-models.zip': 'ExtraContent/models/',
    'extracontent-textures.zip': 'ExtraContent/textures/',
    'extracontent-places.zip': 'ExtraContent/places/'
  },
  studio: {
    'RobloxStudio.zip': '',
    'RibbonConfig.zip': 'RibbonConfig/',
    'redist.zip': '',
    'Libraries.zip': '',
    'LibrariesQt5.zip': '',
    'WebView2.zip': '',
    'WebView2RuntimeInstaller.zip': '',
    'shaders.zip': 'shaders/',
    'ssl.zip': 'ssl/',
    'Qml.zip': 'Qml/',
    'Plugins.zip': 'Plugins/',
    'StudioFonts.zip': 'StudioFonts/',
    'BuiltInPlugins.zip': 'BuiltInPlugins/',
    'ApplicationConfig.zip': 'ApplicationConfig/',
    'BuiltInStandalonePlugins.zip': 'BuiltInStandalonePlugins/',
    'content-qt_translations.zip': 'content/qt_translations/',
    'content-sky.zip': 'content/sky/',
    'content-fonts.zip': 'content/fonts/',
    'content-avatar.zip': 'content/avatar/',
    'content-models.zip': 'content/models/',
    'content-sounds.zip': 'content/sounds/',
    'content-configs.zip': 'content/configs/',
    'content-api-docs.zip': 'content/api_docs/',
    'content-textures2.zip': 'content/textures/',
    'content-studio_svg_textures.zip': 'content/studio_svg_textures/',
    'content-platform-fonts.zip': 'PlatformContent/pc/fonts/',
    'content-platform-dictionaries.zip': 'PlatformContent/pc/shared_compression_dictionaries/',
    'content-terrain.zip': 'PlatformContent/pc/terrain/',
    'content-textures3.zip': 'PlatformContent/pc/textures/',
    'extracontent-translations.zip': 'ExtraContent/translations/',
    'extracontent-luapackages.zip': 'ExtraContent/LuaPackages/',
    'extracontent-textures.zip': 'ExtraContent/textures/',
    'extracontent-scripts.zip': 'ExtraContent/scripts/',
    'extracontent-models.zip': 'ExtraContent/models/'
  }
}

interface BinaryTypeConfig {
  blobDir: string
  aliases: string[]
}

const BINARY_TYPES: Record<string, BinaryTypeConfig> = {
  WindowsPlayer: { blobDir: '/', aliases: ['WindowsPlayer'] },
  WindowsStudio64: { blobDir: '/', aliases: ['Studio64', 'WindowsStudio64'] },
  MacPlayer: { blobDir: '/mac/', aliases: ['MacPlayer'] },
  MacStudio: { blobDir: '/mac/', aliases: ['MacStudio'] }
}

const ALIAS_TO_TYPE: Record<string, string> = {}
for (const [typ, obj] of Object.entries(BINARY_TYPES)) {
  for (const alias of obj.aliases) {
    ALIAS_TO_TYPE[alias] = typ
  }
}

export class RobloxInstallService {
  private static historyCache: Record<string, string[]> | null = null
  private static lastHistoryFetch = 0
  private static readonly CACHE_DURATION = 1000 * 60 * 15 // 15 minutes

  static async getDeployHistory(force = false): Promise<Record<string, string[]>> {
    const now = Date.now()
    if (!force && this.historyCache && now - this.lastHistoryFetch < this.CACHE_DURATION) {
      return this.historyCache
    }

    try {
      const text = await safeFetchText(DEPLOY_HISTORY_URL)

      const history = this.parseHistory(text.split(/\r?\n/))

      const validatedHistory = deployHistorySchema.parse(history)

      this.historyCache = validatedHistory
      this.lastHistoryFetch = now

      return validatedHistory
    } catch (e) {
      console.error('[RobloxInstallService] Failed to fetch deploy history', e)
      return this.historyCache || {}
    }
  }

  private static parseHistory(lines: string[]): Record<string, string[]> {
    const pat = /New\s+(?<typ>\w+)\s+version-(?<hash>[a-f0-9]{16})/i
    const found: Record<string, string[]> = {}
    for (const k of Object.keys(BINARY_TYPES)) {
      found[k] = []
    }

    for (let i = lines.length - 1; i >= 0; i--) {
      const match = lines[i].match(pat)
      if (!match || !match.groups) continue

      const { typ: alias, hash: verHash } = match.groups
      const typ = ALIAS_TO_TYPE[alias]

      if (typ && !found[typ].includes(verHash)) {
        found[typ].push(verHash)
      }
    }

    // Limit to 30
    for (const k in found) {
      found[k] = found[k].slice(0, 30)
    }

    return found
  }

  static async downloadAndInstall(
    binaryType: string,
    version: string,
    installPath: string,
    onProgress: (status: string, progress: number, detail?: string) => void
  ): Promise<boolean> {
    if (!BINARY_TYPES[binaryType]) return false

    try {
      const blobDir = BINARY_TYPES[binaryType].blobDir
      const verTag = version.startsWith('version-') ? version : `version-${version}`
      const base = `${AWS_MIRROR}${blobDir}${verTag}-`

      // Get manifest
      onProgress('Fetching manifest...', 0)
      let manifest = ''
      try {
        manifest = await safeFetchText(base + 'rbxPkgManifest.txt')
      } catch (e) {
        console.error('Failed to fetch manifest', e)
        return false
      }

      // Deduplicate packages
      const pkgsRaw = manifest
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.endsWith('.zip'))
      const pkgs = [...new Set(pkgsRaw)]

      const roots = pkgs.includes('RobloxApp.zip')
        ? EXTRACT_ROOTS['player']
        : EXTRACT_ROOTS['studio']

      // Prepare output folder
      if (!fs.existsSync(installPath)) {
        fs.mkdirSync(installPath, { recursive: true })
      }

      // Write AppSettings.xml
      const appSettingsPath = path.join(installPath, 'AppSettings.xml')
      const appSettingsContent = `<?xml version="1.0" encoding="UTF-8"?>
<Settings>
\t<ContentFolder>content</ContentFolder>
\t<BaseUrl>http://www.roblox.com</BaseUrl>
</Settings>
`
      fs.writeFileSync(appSettingsPath, appSettingsContent)

      let completed = 0
      const total = pkgs.length
      const concurrency = 8 // Adjust concurrency limit as needed

      // Helper for processing a single package
      const processPackage = async (pkg: string) => {
        const url = base + pkg
        const zipPath = path.join(installPath, pkg)
        const rootDir = roots[pkg]

        // Download
        await this.downloadFile(url, zipPath)

        // Extract if needed
        if (rootDir !== undefined) {
          const targetExtractPath = rootDir === '' ? installPath : path.join(installPath, rootDir)
          if (!fs.existsSync(targetExtractPath)) {
            fs.mkdirSync(targetExtractPath, { recursive: true })
          }
          await this.extractZip(zipPath, targetExtractPath)

          // Retry unlink logic
          let attempts = 0
          while (attempts < 3) {
            try {
              await fs.promises.unlink(zipPath)
              break
            } catch (e: any) {
              attempts++
              if (attempts >= 3) {
                console.warn(`Failed to delete ${zipPath} after 3 attempts:`, e)
              } else {
                await new Promise((r) => setTimeout(r, 500)) // wait 500ms
              }
            }
          }
        }
      }

      // Reset for the actual run
      completed = 0
      const queue = [...pkgs]
      const activeWorkers: Promise<void>[] = []

      // If only one package, just process it
      if (queue.length === 1) {
        await processPackage(queue[0])
        onProgress('Complete', 100)
        return true
      }

      while (queue.length > 0 || activeWorkers.length > 0) {
        while (queue.length > 0 && activeWorkers.length < concurrency) {
          const pkg = queue.shift()!
          // Create a worker promise that processes the package
          const worker = (async () => {
            await processPackage(pkg)
            completed++
            onProgress('Installing...', Math.floor((completed / total) * 100), pkg)
          })()

          // Add to active workers
          activeWorkers.push(worker)

          // When this worker finishes, remove it from the active list
          // Note: We need to catch errors inside the main loop or here
          worker
            .catch((err) => {
              console.error(`Failed to process package ${pkg}`, err)
              // We should probably stop everything if one fails
              throw err
            })
            .finally(() => {
              const idx = activeWorkers.indexOf(worker)
              if (idx > -1) {
                activeWorkers.splice(idx, 1)
              }
            })
        }

        if (activeWorkers.length > 0) {
          // Wait for at least one worker to finish before checking queue again
          await Promise.race(activeWorkers)
        }
      }

      onProgress('Complete', 100)
      return true
    } catch (e) {
      console.error('Installation failed', e)
      return false
    }
  }

  static async launch(installPath: string): Promise<void> {
    const playerExe = path.join(installPath, 'RobloxPlayerBeta.exe')
    const studioExe = path.join(installPath, 'RobloxStudioBeta.exe')

    let exePath = ''
    if (fs.existsSync(playerExe)) {
      exePath = playerExe
    } else if (fs.existsSync(studioExe)) {
      exePath = studioExe
    } else {
      throw new Error('Could not find executable in ' + installPath)
    }

    const child = spawn(exePath, [], {
      detached: true,
      cwd: installPath,
      stdio: 'ignore'
    })
    child.unref()
  }

  static async uninstall(installPath: string): Promise<void> {
    if (fs.existsSync(installPath)) {
      await fs.promises.rm(installPath, { recursive: true, force: true })
    }
  }

  static async openFolder(installPath: string): Promise<void> {
    await shell.openPath(installPath)
  }

  static async checkForUpdates(
    binaryType: string,
    currentVersionHash: string
  ): Promise<{ hasUpdate: boolean; latestVersion: string }> {
    const history = await this.getDeployHistory(true)
    const versions = history[binaryType]

    if (!versions || versions.length === 0) {
      throw new Error(`No version history found for ${binaryType}`)
    }

    const latestVersion = versions[0]
    return {
      hasUpdate: latestVersion !== currentVersionHash,
      latestVersion
    }
  }

  static async getFFlags(installPath: string): Promise<Record<string, any>> {
    const clientSettingsPath = path.join(installPath, 'ClientSettings', 'ClientAppSettings.json')
    try {
      if (!fs.existsSync(clientSettingsPath)) {
        return {}
      }
      const content = await fs.promises.readFile(clientSettingsPath, 'utf8')
      const raw = JSON.parse(content)
      return fflagsSchema.parse(raw)
    } catch (e) {
      console.error('Failed to read FFlags', e)
      return {}
    }
  }

  static async setFFlags(installPath: string, flags: Record<string, any>): Promise<void> {
    // Validate before writing
    fflagsSchema.parse(flags)

    const clientSettingsDir = path.join(installPath, 'ClientSettings')
    const clientSettingsPath = path.join(clientSettingsDir, 'ClientAppSettings.json')
    try {
      if (!fs.existsSync(clientSettingsDir)) {
        await fs.promises.mkdir(clientSettingsDir, { recursive: true })
      }
      await fs.promises.writeFile(clientSettingsPath, JSON.stringify(flags, null, 4), 'utf8')
    } catch (e) {
      console.error('Failed to write FFlags', e)
      throw e
    }
  }

  static async setActive(installPath: string): Promise<void> {
    const playerExe = path.join(installPath, 'RobloxPlayerBeta.exe')
    if (!fs.existsSync(playerExe)) {
      throw new Error('RobloxPlayerBeta.exe not found in ' + installPath)
    }

    // We need to set registry keys for roblox-player protocol
    // HKCU\Software\Classes\roblox-player
    //   (Default) = "URL: Roblox Protocol"
    //   "URL Protocol" = ""
    //   DefaultIcon
    //     (Default) = "path\to\exe,0"
    //   shell\open\command
    //     (Default) = "path\to\exe" "%1"

    const cmds = [
      [
        'add',
        'HKCU\\Software\\Classes\\roblox-player',
        '/ve',
        '/t',
        'REG_SZ',
        '/d',
        'URL: Roblox Protocol',
        '/f'
      ],
      [
        'add',
        'HKCU\\Software\\Classes\\roblox-player',
        '/v',
        'URL Protocol',
        '/t',
        'REG_SZ',
        '/d',
        '',
        '/f'
      ],
      [
        'add',
        'HKCU\\Software\\Classes\\roblox-player\\DefaultIcon',
        '/ve',
        '/t',
        'REG_SZ',
        '/d',
        `${playerExe},0`,
        '/f'
      ],
      [
        'add',
        'HKCU\\Software\\Classes\\roblox-player\\shell\\open\\command',
        '/ve',
        '/t',
        'REG_SZ',
        '/d',
        `"${playerExe}" "%1"`,
        '/f'
      ]
    ]

    for (const args of cmds) {
      await new Promise<void>((resolve, reject) => {
        const child = spawn('reg', args, { stdio: 'ignore', windowsHide: true })
        child.on('close', (code) => {
          if (code === 0) resolve()
          else reject(new Error(`reg command failed with code ${code}`))
        })
        child.on('error', reject)
      })
    }
  }

  static async removeActive(): Promise<void> {
    // We delete the registry keys we created
    const keyPath = 'HKCU\\Software\\Classes\\roblox-player'

    // verify if key exists first to avoid error? reg delete throws if not found.
    // We'll just try to delete the whole key tree for roblox-player class we managed.
    // NOTE: This might remove a "real" roblox installation's association if we overwrote it.
    // But the user asked to "not have an active one".

    // Command: reg delete HKCU\Software\Classes\roblox-player /f

    return new Promise<void>((resolve) => {
      const child = spawn('reg', ['delete', keyPath, '/f'], { stdio: 'ignore', windowsHide: true })
      child.on('close', (code) => {
        if (code !== 0) {
          console.warn(`[RobloxInstallService] Registry delete exited with code ${code}`)
        }
        resolve()
      })
      child.on('error', (err) => {
        console.error('Failed to delete registry key', err)
        resolve() // Don't crash
      })
    })
  }

  static async getActiveInstallPath(): Promise<string | null> {
    return new Promise((resolve) => {
      const child = spawn(
        'reg',
        ['query', 'HKCU\\Software\\Classes\\roblox-player\\DefaultIcon', '/ve'],
        { windowsHide: true }
      )
      let stdout = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.on('close', (code) => {
        if (code !== 0) {
          resolve(null)
          return
        }

        // Output looks like:
        // HKEY_CURRENT_USER\Software\Classes\roblox-player\DefaultIcon
        //    (Default)    REG_SZ    C:\Path\To\RobloxPlayerBeta.exe,0

        const match = stdout.match(/REG_SZ\s+([^\r\n]+),0/)
        if (match && match[1]) {
          const exePath = match[1].trim()

          // Return directory containing the exe
          resolve(path.dirname(exePath))
        } else {
          resolve(null)
        }
      })

      child.on('error', (err) => {
        console.error('[RobloxInstallService] Registry query error:', err)
        resolve(null)
      })
    })
  }

  static async launchWithProtocol(installPath: string, protocolUrl: string): Promise<void> {
    const playerExe = path.join(installPath, 'RobloxPlayerBeta.exe')
    if (!fs.existsSync(playerExe)) {
      throw new Error('RobloxPlayerBeta.exe not found in ' + installPath)
    }

    // Spawn detached
    const child = spawn(playerExe, [protocolUrl], {
      detached: true,
      cwd: installPath,
      stdio: 'ignore'
    })
    child.unref()
  }

  private static downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Prepare directory
      const dir = path.dirname(dest)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

      // Try to remove file if it exists
      if (fs.existsSync(dest)) {
        try {
          fs.unlinkSync(dest)
        } catch (e) {
          console.warn(`Could not delete existing file ${dest}, trying to overwrite`, e)
        }
      }

      const request = net.request(url)
      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download ${url}: ${response.statusCode}`))
          return
        }

        try {
          const file = fs.createWriteStream(dest)

          file.on('error', (err) => {
            file.close()
            fs.unlink(dest, () => {})
            reject(err)
          })

          file.on('finish', () => {
            file.close(() => resolve())
          })

          response.on('error', (err) => {
            file.close()
            fs.unlink(dest, () => {})
            reject(err)
          })

          response.on('data', (chunk) => {
            file.write(chunk)
          })

          response.on('end', () => {
            file.end()
          })
        } catch (e) {
          reject(e)
        }
      })
      request.on('error', (err) => {
        reject(err)
      })
      request.end()
    })
  }

  private static extractZip(zipPath: string, extractPath: string): Promise<void> {
    const normalizedRoot = path.resolve(extractPath)
    const rootWithSep = normalizedRoot.endsWith(path.sep)
      ? normalizedRoot
      : normalizedRoot + path.sep

    return new Promise((resolve, reject) => {
      let finished = false
      const finish = (err?: Error) => {
        if (finished) return
        finished = true
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      }

      yauzl.open(
        zipPath,
        { lazyEntries: true, validateEntrySizes: false, decodeStrings: false },
        (err, zipFile) => {
          if (err || !zipFile) {
            finish(err ?? new Error(`Failed to open zip ${zipPath}`))
            return
          }

          const openReadStream = (entry: yauzl.Entry) =>
            new Promise<NodeJS.ReadableStream>((resolveStream, rejectStream) => {
              zipFile.openReadStream(entry, (streamErr, readStream) => {
                if (streamErr || !readStream) {
                  rejectStream(
                    streamErr ?? new Error(`Failed to open stream for ${entry.fileName}`)
                  )
                } else {
                  resolveStream(readStream)
                }
              })
            })

          const processEntry = async (entry: yauzl.Entry) => {
            let fileName = entry.fileName as unknown as string | Buffer
            if (Buffer.isBuffer(fileName)) {
              const isUtf8 = (entry.generalPurposeBitFlag & 0x800) !== 0
              fileName = fileName.toString(isUtf8 ? 'utf8' : 'latin1')
            }
            const fileNameStr = fileName as string

            const sanitizedName = fileNameStr.replace(/^([/\\])+/, '')
            if (!sanitizedName) {
              zipFile.readEntry()
              return
            }

            const normalizedEntryPath = path.resolve(normalizedRoot, sanitizedName)

            if (
              normalizedEntryPath !== normalizedRoot &&
              !normalizedEntryPath.startsWith(rootWithSep)
            ) {
              throw new Error(`Zip entry escapes target path: ${fileNameStr}`)
            }

            if (fileNameStr.endsWith('/') || fileNameStr.endsWith('\\')) {
              await fs.promises.mkdir(normalizedEntryPath, { recursive: true })
              zipFile.readEntry()
              return
            }

            await fs.promises.mkdir(path.dirname(normalizedEntryPath), { recursive: true })
            const readStream = await openReadStream(entry)
            const writeStream = fs.createWriteStream(normalizedEntryPath)
            await streamPipeline(readStream, writeStream)
            zipFile.readEntry()
          }

          zipFile.on('error', finish)
          zipFile.on('end', () => finish())
          zipFile.on('entry', (entry) => {
            processEntry(entry).catch(finish)
          })

          zipFile.readEntry()
        }
      )
    })
  }

  /**
   * Detects default Roblox installations from the standard Roblox Versions directory
   * (C:\Users\<user>\AppData\Local\Roblox\Versions\)
   */
  static async detectDefaultInstallations(): Promise<DetectedInstallation[]> {
    const detected: DetectedInstallation[] = []

    try {
      // Default Roblox install path
      const robloxVersionsPath = path.join(os.homedir(), 'AppData', 'Local', 'Roblox', 'Versions')

      if (!fs.existsSync(robloxVersionsPath)) {
        return detected
      }

      const entries = await fs.promises.readdir(robloxVersionsPath, { withFileTypes: true })

      for (const entry of entries) {
        // Look for directories named version-<hash>
        if (!entry.isDirectory() || !entry.name.startsWith('version-')) {
          continue
        }

        const versionDir = path.join(robloxVersionsPath, entry.name)
        const versionHash = entry.name.replace('version-', '')

        // Check for RobloxPlayerBeta.exe
        const playerExe = path.join(versionDir, 'RobloxPlayerBeta.exe')
        if (fs.existsSync(playerExe)) {
          detected.push({
            path: versionDir,
            version: versionHash,
            binaryType: 'WindowsPlayer',
            exePath: playerExe
          })
          continue
        }

        // Check for RobloxStudioBeta.exe
        const studioExe = path.join(versionDir, 'RobloxStudioBeta.exe')
        if (fs.existsSync(studioExe)) {
          detected.push({
            path: versionDir,
            version: versionHash,
            binaryType: 'WindowsStudio',
            exePath: studioExe
          })
        }
      }
    } catch (e) {
      console.error('[RobloxInstallService] Failed to detect default installations:', e)
    }

    return detected
  }
}
