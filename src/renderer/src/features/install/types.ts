import { RobloxInstallation, BinaryType } from '@renderer/types'
import { DetectedInstallation } from '@shared/ipc-schemas/system'

export interface UnifiedInstallation {
  id: string
  name: string
  binaryType: BinaryType
  version: string
  channel: string
  path: string
  status: 'Ready' | 'Updating' | 'Error'
  isSystem: boolean
  original: RobloxInstallation | null
  detected: DetectedInstallation | null
}
