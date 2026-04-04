import { useState, useEffect, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Package } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from './Tooltip'

// ─── Tag Badge ───────────────────────────────────────────────────────────────

type TagColor = 'yellow' | 'emerald' | 'red' | 'orange' | 'pink' | 'cyan' | 'blue'

const TAG_STYLES: Record<TagColor, string> = {
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20',
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
}

interface ItemCardTagProps {
    icon: ReactNode
    label: string
    color: TagColor
}

export const ItemCardTag = ({ icon, label, color }: ItemCardTagProps) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <div
                className={`flex items-center justify-center w-7 h-7 rounded-full border backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default ${TAG_STYLES[color]}`}
            >
                {icon}
            </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-bold text-xs">
            {label}
        </TooltipContent>
    </Tooltip>
)

// ─── Item Card ───────────────────────────────────────────────────────────────

export interface ItemCardProps {
    /** Item display name */
    name: string
    /** Thumbnail image URL */
    thumbnailUrl?: string
    /** Click handler */
    onClick?: () => void
    /** Context menu handler */
    onContextMenu?: (e: React.MouseEvent) => void
    /** Stagger animation index (controls fade-in delay) */
    index?: number
    /** Compact mode — smaller padding, hides topLabel */
    isCompact?: boolean
    /** Small label in top-left of thumbnail (e.g. "Hat", "Shirt") */
    topLabel?: string
    /** Tag badges rendered in a column inside the thumbnail area */
    tags?: ReactNode
    /** Badge overlay at the bottom of the thumbnail (e.g. serial number) */
    bottomBadge?: ReactNode
    /** Content rendered below the name in the info section */
    children?: ReactNode
    /** Additional className on the outer container */
    className?: string
}

export const ItemCard = ({
    name,
    thumbnailUrl,
    onClick,
    onContextMenu,
    index = 0,
    isCompact = false,
    topLabel,
    tags,
    bottomBadge,
    children,
    className = ''
}: ItemCardProps) => {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [isNameTruncated, setIsNameTruncated] = useState(false)
    const nameRef = useRef<HTMLHeadingElement>(null)

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu?.(e)
    }

    useEffect(() => {
        const check = () => {
            if (nameRef.current) {
                setIsNameTruncated(nameRef.current.scrollWidth > nameRef.current.clientWidth)
            }
        }
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [name, isCompact])

    const nameEl = (
        <h3
            ref={nameRef}
            className="font-semibold text-[13px] text-[var(--color-text-primary)] truncate leading-tight"
        >
            {name}
        </h3>
    )

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: Math.min(index * 0.015, 0.2) }}
            onClick={onClick}
            onContextMenu={onContextMenu ? handleContextMenu : undefined}
            className={`group relative flex flex-col rounded-xl overflow-hidden cursor-pointer border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-all duration-200 ${className}`}
        >
            {/* Thumbnail — lighter tone */}
            <div className="relative aspect-square bg-[var(--color-surface-hover)] overflow-hidden">
                {/* Top label */}
                {!isCompact && topLabel && (
                    <div className="absolute top-1.5 left-1.5 z-10">
                        <div className="px-1.5 py-0.5 rounded-md bg-black/40 backdrop-blur-sm text-[10px] font-medium text-white/80 leading-none">
                            {topLabel}
                        </div>
                    </div>
                )}

                {/* Tag badges */}
                {tags && (
                    <div
                        className={`absolute flex flex-col gap-1.5 z-10 ${isCompact ? 'top-1 left-1' : topLabel ? 'top-9 left-2' : 'top-2 left-2'}`}
                    >
                        {tags}
                    </div>
                )}

                {/* Image */}
                {thumbnailUrl ? (
                    <>
                        {!imageLoaded && (
                            <div className="absolute inset-0 bg-[var(--color-surface-hover)] animate-pulse" />
                        )}
                        <img
                            src={thumbnailUrl}
                            alt={name}
                            onLoad={() => setImageLoaded(true)}
                            className={`w-full h-full object-contain transition-transform duration-200 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                            loading="lazy"
                        />
                    </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)]">
                        <Package size={32} />
                    </div>
                )}

                {/* Bottom badge */}
                {bottomBadge}
            </div>

            {/* Info section — stronger/darker tone */}
            <div
                className={`flex flex-col gap-1 bg-[var(--color-surface-strong)] ${isCompact ? 'p-2' : 'px-3 py-2.5'}`}
            >
                {isNameTruncated ? (
                    <Tooltip>
                        <TooltipTrigger asChild>{nameEl}</TooltipTrigger>
                        <TooltipContent>{name}</TooltipContent>
                    </Tooltip>
                ) : (
                    nameEl
                )}
                {children}
            </div>
        </motion.div>
    )
}

export default ItemCard
