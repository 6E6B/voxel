import React from 'react'
import { Image as ImageIcon, Box, Eye, Undo2, Loader2 } from 'lucide-react'
import { cn } from '@renderer/shared/lib/utils'
import { RoAvatarViewer } from '@renderer/shared/lib/avatar3d/RoAvatarViewer'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/shared/ui/display/Tooltip'
import type { Outfit } from 'roavatar-renderer'

interface AssetPreviewProps {
  viewMode: '2d' | '3d'
  has3DView: boolean
  imageUrl: string
  assetName: string
  isTryingOn: boolean
  tryOnOutfit?: Outfit | null
  previewOutfit?: Outfit | null
  tryOnLoading: boolean
  previewOutfitLoading: boolean
  canTryOn: boolean
  cookie?: string
  onViewModeChange: (mode: '2d' | '3d') => void
  on3DError: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onTryOn: () => void
  onRevertTryOn: () => void
}

export const AssetPreview: React.FC<AssetPreviewProps> = ({
  viewMode,
  has3DView,
  imageUrl,
  assetName,
  isTryingOn,
  tryOnOutfit,
  previewOutfit,
  tryOnLoading,
  previewOutfitLoading,
  canTryOn,
  cookie,
  onViewModeChange,
  on3DError,
  onContextMenu,
  onTryOn,
  onRevertTryOn
}) => {
  return (
    <div className="w-full lg:w-1/2 relative flex flex-col border-b lg:border-b-0 lg:border-r border-neutral-800 bg-neutral-950 overflow-hidden group">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800 via-neutral-900 to-neutral-950" />
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)',
          backgroundSize: '50px 50px',
          transform: 'perspective(500px) rotateX(60deg) translateY(100px) scale(2)'
        }}
      />

      <div
        className="relative w-full h-full z-10 cursor-context-menu"
        onContextMenu={onContextMenu}
      >
        {isTryingOn ? (
          tryOnOutfit ? (
            <RoAvatarViewer
              outfit={tryOnOutfit}
              cookie={cookie}
              className="w-full h-full"
              renderPriority={10}
              onError={on3DError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-8">
              <div className="flex flex-col items-center gap-3 text-neutral-400">
                {tryOnLoading ? (
                  <Loader2 size={28} className="animate-spin" />
                ) : (
                  <Eye size={28} />
                )}
                <span className="text-sm">
                  {tryOnLoading ? 'Loading try-on preview...' : 'Try-on preview unavailable'}
                </span>
              </div>
            </div>
          )
        ) : viewMode === '2d' ? (
          <div className="w-full h-full flex items-center justify-center p-8">
            <img
              src={imageUrl}
              alt={assetName}
              className="w-full h-full object-contain drop-shadow-2xl transition-transform duration-300"
            />
          </div>
        ) : previewOutfitLoading ? (
          <div className="w-full h-full flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-3 text-neutral-400">
              <Loader2 size={28} className="animate-spin" />
              <span className="text-sm">Loading avatar preview...</span>
            </div>
          </div>
        ) : previewOutfit ? (
          <RoAvatarViewer
            outfit={previewOutfit}
            cookie={cookie}
            className="w-full h-full"
            renderPriority={10}
            onError={on3DError}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-8">
            <img
              src={imageUrl}
              alt={assetName}
              className="w-full h-full object-contain drop-shadow-2xl transition-transform duration-300"
            />
          </div>
        )}

        {/* Try-on indicator */}
        {isTryingOn && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-emerald-500/90 backdrop-blur text-white text-xs font-medium rounded-full flex items-center gap-2 shadow-lg z-20">
            <Eye size={14} />
            Trying On
          </div>
        )}

        {/* View Toggle & Try On Controls */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {!isTryingOn && has3DView && (
            <div className="flex items-center p-1 bg-neutral-950/80 backdrop-blur border border-neutral-800 rounded-lg shadow-xl">
              <button
                onClick={() => onViewModeChange('2d')}
                className={cn(
                  'p-2 rounded transition-colors',
                  viewMode === '2d'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300'
                )}
              >
                <ImageIcon size={18} />
              </button>
              <button
                onClick={() => onViewModeChange('3d')}
                className={cn(
                  'p-2 rounded transition-colors',
                  viewMode === '3d'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300'
                )}
              >
                <Box size={18} />
              </button>
            </div>
          )}

          {/* Try On Controls */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={isTryingOn ? onRevertTryOn : onTryOn}
                  disabled={tryOnLoading || !canTryOn}
                  className={cn(
                    'p-2.5 rounded-lg backdrop-blur border shadow-xl transition-all flex items-center gap-2',
                    isTryingOn
                      ? 'bg-amber-500/90 hover:bg-amber-400/90 border-amber-400/50 text-white'
                      : 'bg-neutral-950/80 hover:bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:text-white',
                    (tryOnLoading || !canTryOn) && 'opacity-70 cursor-wait'
                  )}
                >
                  {tryOnLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : isTryingOn ? (
                    <Undo2 size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {!canTryOn
                  ? 'Try-on unavailable'
                  : tryOnLoading
                    ? 'Loading...'
                    : isTryingOn
                      ? 'Revert to Original'
                      : 'Try On Avatar'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}

