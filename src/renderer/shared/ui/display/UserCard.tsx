import React from 'react'
import { User, Loader2 } from 'lucide-react'
import { cn } from '@renderer/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/shared/ui/display/Tooltip'
import { Button } from '@renderer/shared/ui/buttons/Button'
import { RobuxIcon } from '@renderer/shared/ui/icons/RobuxIcon'
import VerifiedIcon from '@renderer/shared/ui/icons/VerifiedIcon'
import { formatDate, formatDateTime } from '@renderer/shared/utils/dateUtils'

interface BaseUserCardProps {
  name: string
  avatarUrl?: string
  userId?: number | string
  onClick?: () => void
  className?: string
}

interface OwnerCardProps extends BaseUserCardProps {
  variant: 'owner'
  serialNumber?: number | null
  ownedSince?: string
}

interface ResellerCardProps extends BaseUserCardProps {
  variant: 'reseller'
  serialNumber?: number | null
  price: number
  hasVerifiedBadge?: boolean
  isPurchasing?: boolean
  onBuy?: () => void
}

export type UserCardProps = OwnerCardProps | ResellerCardProps

export const UserCard: React.FC<UserCardProps> = (props) => {
  const { name, avatarUrl, userId, onClick, className, variant } = props

  return (
    <div
      className={cn(
        'flex-shrink-0 w-[140px] bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col gap-2 hover:border-neutral-700 transition-all group',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User size={14} className="text-neutral-600" />
            </div>
          )}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div
            className="font-medium text-xs text-white truncate flex items-center gap-1"
            title={name}
          >
            {name}
            {variant === 'reseller' && props.hasVerifiedBadge && (
              <VerifiedIcon width={10} height={10} className="flex-shrink-0" />
            )}
          </div>
          {props.serialNumber !== null && props.serialNumber !== undefined && (
            <div
              className={cn(
                'text-[10px] font-medium',
                variant === 'owner' ? 'text-amber-500' : 'text-neutral-500'
              )}
            >
              #{props.serialNumber.toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {variant === 'owner' && props.ownedSince && (
        <div className="flex items-center justify-between mt-1 pt-2 border-t border-neutral-800">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-[10px] text-neutral-500 truncate cursor-help">
                {formatDate(props.ownedSince)}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <div>Owned since: {formatDateTime(props.ownedSince)}</div>
                {userId && <div className="text-neutral-400">ID: {userId}</div>}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {variant === 'reseller' && (
        <div className="flex flex-col gap-2 mt-1 pt-2 border-t border-neutral-800">
          <div className="text-xs font-semibold text-emerald-400 flex items-center justify-between gap-1">
            <span className="flex items-center gap-1">
              {props.price.toLocaleString()}
              <RobuxIcon className="w-3 h-3" />
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] w-full hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              props.onBuy?.()
            }}
            disabled={props.isPurchasing}
          >
            {props.isPurchasing ? <Loader2 size={10} className="animate-spin" /> : 'Buy'}
          </Button>
        </div>
      )}
    </div>
  )
}

