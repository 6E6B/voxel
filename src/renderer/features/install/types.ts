import { RobloxInstallation, BinaryType } from '@renderer/shared/types'
import { DetectedInstallation } from '@shared/contracts/system'

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
