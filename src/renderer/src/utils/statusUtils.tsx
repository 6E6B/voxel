import { AccountStatus } from '../types'
import { Circle } from 'lucide-react'

export const getStatusColor = (status: AccountStatus): string => {
  switch (status) {
    case AccountStatus.Online:
      return 'bg-blue-500'
    case AccountStatus.InGame:
      return 'bg-emerald-500'
    case AccountStatus.InStudio:
      return 'bg-orange-500'
    case AccountStatus.Offline:
      return 'bg-neutral-400'
    case AccountStatus.Banned:
      return 'bg-red-500'
    default:
      return 'bg-neutral-500'
  }
}

export const getStatusBorderColor = (status: AccountStatus): string => {
  switch (status) {
    case AccountStatus.Online:
      return 'border-blue-700'
    case AccountStatus.InGame:
      return 'border-emerald-700'
    case AccountStatus.InStudio:
      return 'border-orange-700'
    case AccountStatus.Offline:
      return 'border-neutral-700'
    case AccountStatus.Banned:
      return 'border-red-700'
    default:
      return 'border-neutral-700'
  }
}

export const getStatusRingColor = (status: AccountStatus): string => {
  switch (status) {
    case AccountStatus.Online:
      return 'bg-blue-700'
    case AccountStatus.InGame:
      return 'bg-emerald-700'
    case AccountStatus.InStudio:
      return 'bg-orange-700'
    case AccountStatus.Offline:
      return 'bg-neutral-600'
    case AccountStatus.Banned:
      return 'bg-red-700'
    default:
      return 'bg-neutral-700'
  }
}

export const getStatusRingUtilityClass = (status: AccountStatus): string => {
  switch (status) {
    case AccountStatus.Online:
      return 'ring-blue-500'
    case AccountStatus.InGame:
      return 'ring-emerald-500'
    case AccountStatus.InStudio:
      return 'ring-orange-500'
    case AccountStatus.Offline:
      return 'ring-neutral-400'
    case AccountStatus.Banned:
      return 'ring-red-500'
    default:
      return 'ring-neutral-500'
  }
}

export const getStatusIcon = (status: AccountStatus) => {
  const colorClass = {
    [AccountStatus.Online]: 'text-blue-500',
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
