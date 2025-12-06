import * as React from 'react'
import { cn } from '../../../lib/utils'

const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-800/80 border border-neutral-700/60',
        className
      )}
      {...props}
    />
  )
)
Avatar.displayName = 'Avatar'

const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, src, onLoad, ...props }, ref) => {
    const [isLoaded, setIsLoaded] = React.useState(false)

    React.useEffect(() => {
      setIsLoaded(false)
    }, [src])

    if (!src) return null

    return (
      <img
        ref={ref}
        src={src}
        onLoad={(event) => {
          setIsLoaded(true)
          onLoad?.(event)
        }}
        className={cn(
          'aspect-square h-full w-full object-cover opacity-0 transition-opacity duration-300 ease-in-out',
          isLoaded && 'opacity-100',
          className
        )}
        {...props}
      />
    )
  }
)
AvatarImage.displayName = 'AvatarImage'

const AvatarFallback = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-neutral-800',
        className
      )}
      {...props}
    />
  )
)
AvatarFallback.displayName = 'AvatarFallback'

export { Avatar, AvatarImage, AvatarFallback }
