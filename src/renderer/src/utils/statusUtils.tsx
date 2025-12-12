import { AccountStatus } from '../types'
import { Circle } from 'lucide-react'

export const getStatusColor = (status: AccountStatus): string => {
  switch (status) {
    case AccountStatus.Online:
      return 'bg-[var(--accent-color)]'
    case AccountStatus.InGame:
      return 'bg-emerald-500'
    case AccountStatus.InStudio:
      return 'bg-orange-500'
    case AccountStatus.Offline:
      return 'bg-neutral-500'
    case AccountStatus.Banned:
      return 'bg-red-500'
    default:
      return 'bg-neutral-500'
  }
}

export const getStatusBorderColor = (status: AccountStatus): string => {
  switch (status) {
    case AccountStatus.Online:
      return 'border-[color:color-mix(in_srgb,var(--accent-color)_50%,transparent)]'
    case AccountStatus.InGame:
      return 'border-emerald-500/50'
    case AccountStatus.InStudio:
      return 'border-orange-500/50'
    case AccountStatus.Offline:
      return 'border-neutral-500/50'
    case AccountStatus.Banned:
      return 'border-red-500/50'
    default:
      return 'border-neutral-500/50'
  }
}

export const getStatusIcon = (status: AccountStatus) => {
  const colorClass = {
    [AccountStatus.Online]: 'text-[var(--accent-color)]',
    [AccountStatus.InGame]: 'text-emerald-500',
    [AccountStatus.InStudio]: 'text-orange-500',
    [AccountStatus.Offline]: 'text-neutral-500',
    [AccountStatus.Banned]: 'text-red-500'
  }[status]

  return <Circle size={10} fill="currentColor" className={colorClass} />
}

export const mapPresenceToStatus = (presenceType: number): AccountStatus => {
  switch (presenceType) {
    case 1:
      return AccountStatus.Online
    case 2:
      return AccountStatus.InGame
    case 3:
      return AccountStatus.InStudio
    default:
      return AccountStatus.Offline
  }
}

export const isActiveStatus = (status: AccountStatus): boolean => {
  return (
    status === AccountStatus.Online ||
    status === AccountStatus.InGame ||
    status === AccountStatus.InStudio
  )
}
