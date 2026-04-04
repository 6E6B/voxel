import React from 'react'
import { AvatarTypeSwitch } from './AvatarTypeSwitch'
import { RoAvatarViewer } from '@renderer/shared/lib/avatar3d/RoAvatarViewer'
import { Account } from '@renderer/shared/types'

interface AvatarViewportProps {
  userId?: string
  cookie?: string
  account?: Account | null
  currentAvatarType?: 'R6' | 'R15' | null
  isRendering: boolean
  renderText: string
  resetSignal?: number
  refreshSignal?: number
  onRenderStart?: () => void
  onRenderComplete?: () => void
  onRenderError?: (error: string) => void
  onRenderStatusChange?: (status: string) => void
  isLargeScreen: boolean
  isResizing: boolean
  onResizeStart: (e: React.MouseEvent) => void
  avatarRenderWidth: number
  containerRef: React.RefObject<HTMLDivElement | null>
}

export const AvatarViewport: React.FC<AvatarViewportProps> = ({
  userId,
  cookie,
  account,
  currentAvatarType,
  isRendering,
  resetSignal = 0,
  refreshSignal = 0,
  onRenderStart,
  onRenderComplete,
  onRenderError,
  isLargeScreen,
  containerRef
}) => {
  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-neutral-900 border-b lg:border-b-0 lg:border-r border-neutral-800 relative flex flex-col shrink-0"
      style={{
        height: isLargeScreen ? '100%' : '40vh'
      }}
    >
      {/* R15/R6 Switch - Top Left */}
      <div className="absolute top-4 left-4 z-10">
        <AvatarTypeSwitch account={account ?? null} currentAvatarType={currentAvatarType || null} />
      </div>

      {/* 3D Viewport with React Three Fiber */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800 via-neutral-900 to-neutral-950">
        {/* Grid Floor */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)',
            backgroundSize: '50px 50px',
            transform: 'perspective(500px) rotateX(60deg) translateY(100px) scale(2)'
          }}
        />
        {/* RoAvatar 3D Renderer */}
        <RoAvatarViewer
          userId={userId}
          cookie={cookie}
          currentAvatarType={currentAvatarType ?? undefined}
          resetSignal={resetSignal}
          refreshSignal={refreshSignal}
          onLoadStart={onRenderStart}
          onLoad={onRenderComplete}
          onError={onRenderError}
        />
      </div>

      {/* Resize Handle - Disabled for fixed 50/50 split */}
    </div>
  )
}
