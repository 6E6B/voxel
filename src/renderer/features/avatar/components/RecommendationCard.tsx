import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Package, Sparkles } from 'lucide-react'
import { RecommendationItem } from '@shared/contracts/avatar'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from '@renderer/shared/ui/display/Tooltip'
import { RobuxIcon } from '@renderer/shared/ui/icons/RobuxIcon'
import { formatNumber } from '@renderer/shared/utils/numberUtils'

interface RecommendationCardProps {
    item: RecommendationItem
    imageUrl?: string
    index?: number
    onClick?: () => void
}

const RecommendationCardTag = ({ label }: { label: string }) => (
    <Tooltip>
        <TooltipTrigger asChild>
            <div
                className={`flex items-center justify-center w-7 h-7 rounded-full border backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default ${label === 'Limited Unique'
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}
            >
                <Sparkles size={13} strokeWidth={2.5} className="shrink-0" />
            </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-bold text-xs">
            {label}
        </TooltipContent>
    </Tooltip>
)

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
    item,
    imageUrl,
    index = 0,
    onClick
}) => {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [isNameTruncated, setIsNameTruncated] = useState(false)
    const nameRef = useRef<HTMLHeadingElement>(null)

    const isLimitedItem = item.isLimited || item.isLimitedUnique
    const isLimitedUnique = item.isLimitedUnique
    let displayPrice: string | number = 'Off Sale'

    if (isLimitedItem && item.lowestResalePrice && item.lowestResalePrice > 0) {
        displayPrice = item.lowestResalePrice
    } else if (isLimitedItem && item.lowestPrice && item.lowestPrice > 0) {
        displayPrice = item.lowestPrice
    } else if (item.price !== null && item.price !== undefined) {
        if (item.price === 0 && !isLimitedItem) {
            displayPrice = 'Free'
        } else if (item.price > 0) {
            displayPrice = item.price
        }
    }

    const isOffSale = displayPrice === 'Off Sale'
    const formattedPrice = typeof displayPrice === 'number' ? formatNumber(displayPrice) : displayPrice

    useEffect(() => {
        const check = () => {
            if (nameRef.current) {
                setIsNameTruncated(nameRef.current.scrollWidth > nameRef.current.clientWidth)
            }
        }

        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [item.name])

    const nameEl = (
        <h3
            ref={nameRef}
            className="font-semibold text-[13px] text-[var(--color-text-primary)] truncate leading-tight"
        >
            {item.name}
        </h3>
    )

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: Math.min(index * 0.015, 0.2) }}
            onClick={onClick}
            className="group relative flex-shrink-0 w-[160px] flex flex-col rounded-xl overflow-hidden cursor-pointer border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-all duration-200"
        >
            <div className="relative aspect-square bg-[var(--color-surface-hover)] overflow-hidden">
                <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
                    {isLimitedUnique && <RecommendationCardTag label="Limited Unique" />}
                    {isLimitedItem && !isLimitedUnique && <RecommendationCardTag label="Limited" />}
                </div>

                {imageUrl ? (
                    <>
                        {!imageLoaded && (
                            <div className="absolute inset-0 bg-[var(--color-surface-hover)] animate-pulse" />
                        )}
                        <img
                            src={imageUrl}
                            alt={item.name}
                            onLoad={() => setImageLoaded(true)}
                            className={`w-full h-full object-contain transition-transform duration-200 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                                }`}
                            loading="lazy"
                        />
                    </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-muted)]">
                        <Package size={32} />
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-1 bg-[var(--color-surface-strong)] px-3 py-2.5">
                {isNameTruncated ? (
                    <Tooltip>
                        <TooltipTrigger asChild>{nameEl}</TooltipTrigger>
                        <TooltipContent>{item.name}</TooltipContent>
                    </Tooltip>
                ) : (
                    nameEl
                )}

                <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                    {item.creatorName}
                </div>

                <div
                    className={`flex items-center gap-1 font-bold text-sm ${isOffSale ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'
                        }`}
                >
                    {!isOffSale && displayPrice !== 'Free' && (
                        <RobuxIcon className="w-4 h-4 text-[var(--color-text-primary)]" />
                    )}
                    <span className={displayPrice === 'Free' ? 'text-emerald-400' : ''}>
                        {formattedPrice}
                    </span>
                </div>
            </div>
        </motion.div>
    )
}

export default RecommendationCard