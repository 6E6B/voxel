import React from 'react'
import { AccountStatus } from '../../../types'
import { Badge } from './Badge'

interface StatusBadgeProps {
  status: AccountStatus
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getDotColor = (status: AccountStatus) => {
    switch (status) {
      case AccountStatus.Online:
        return 'bg-[var(--accent-color)]'
      case AccountStatus.InGame:
        return 'bg-emerald-400'
      case AccountStatus.InStudio:
        return 'bg-amber-400'
      case AccountStatus.Offline:
        return 'bg-neutral-400'
      case AccountStatus.Banned:
        return 'bg-red-400'
      default:
        return 'bg-neutral-400'
    }
  }

  // We cast status to any here because TypeScript might complain that the enum
  // values don't perfectly overlap with the variant keys, even though they do.
  return (
    <Badge variant={status as any}>
      <span className={`w-1.5 h-1.5 rounded-full ${getDotColor(status)} animate-pulse`} />
      {status}
    </Badge>
  )
}

export default StatusBadge
