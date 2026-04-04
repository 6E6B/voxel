import React from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@renderer/shared/lib/utils'
import { Button } from '../buttons/Button'

type ErrorMessageVariant = 'default' | 'inline' | 'banner'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  retryText?: string
  variant?: ErrorMessageVariant
  className?: string
  icon?: React.ComponentType<{ size?: number; className?: string }>
}

const variantStyles: Record<ErrorMessageVariant, string> = {
  default: 'flex flex-col items-center justify-center h-64 text-red-500',
  inline: 'text-center text-red-500 py-4 text-sm',
  banner: 'p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center text-sm'
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  retryText = 'Try Again',
  variant = 'default',
  className,
  icon: Icon = AlertCircle
}) => {
  if (variant === 'inline') {
    return (
      <div className={cn(variantStyles.inline, className)}>
        {message}
        {onRetry && (
          <button onClick={onRetry} className="ml-2 underline hover:no-underline">
            {retryText}
          </button>
        )}
      </div>
    )
  }

  if (variant === 'banner') {
    return (
      <div className={cn(variantStyles.banner, className)}>
        {message}
        {onRetry && (
          <button onClick={onRetry} className="ml-2 underline hover:no-underline">
            {retryText}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={cn(variantStyles.default, className)}>
      <Icon size={48} className="mb-4 opacity-20" />
      <p>{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-4">
          {retryText}
        </Button>
      )}
    </div>
  )
}

export default ErrorMessage
