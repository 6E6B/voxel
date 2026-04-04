import React from 'react'
import { Trophy, Calendar, TrendingUp, Percent, Gamepad2, Loader2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
    DialogBody
} from '@renderer/shared/ui/dialogs/Dialog'
import { useBadgeDetails } from '@renderer/features/profile/api/useBadgeDetails'

interface BadgeDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    badgeId: number | null
    badgeImageUrl?: string
    cookie: string
}

const StatItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
    icon,
    label,
    value
}) => (
    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[var(--color-surface-muted)]">
        <div className="text-[var(--color-text-muted)]">{icon}</div>
        <div className="flex-1 min-w-0">
            <div className="text-[11px] text-[var(--color-text-muted)]">{label}</div>
            <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{value}</div>
        </div>
    </div>
)

export const BadgeDetailsModal: React.FC<BadgeDetailsModalProps> = ({
    isOpen,
    onClose,
    badgeId,
    badgeImageUrl,
    cookie
}) => {
    const { data: badge, isLoading } = useBadgeDetails(badgeId, cookie)

    return (
        <Dialog isOpen={isOpen} onClose={onClose}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Badge Details</DialogTitle>
                    <DialogClose />
                </DialogHeader>

                <DialogBody className="space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
                        </div>
                    ) : badge ? (
                        <>
                            {/* Badge hero */}
                            <div className="flex flex-col items-center gap-2.5 text-center">
                                {badgeImageUrl && (
                                    <img
                                        src={badgeImageUrl}
                                        alt={badge.displayName}
                                        className="w-16 h-16 object-contain"
                                    />
                                )}
                                <div>
                                    <h4 className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight">
                                        {badge.displayName}
                                    </h4>
                                    {badge.displayDescription && (
                                        <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed max-w-[260px]">
                                            {badge.displayDescription}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="space-y-1.5">
                                <StatItem
                                    icon={<Trophy size={14} />}
                                    label="Total Awarded"
                                    value={badge.statistics.awardedCount.toLocaleString()}
                                />
                                <StatItem
                                    icon={<TrendingUp size={14} />}
                                    label="Awarded Today"
                                    value={badge.statistics.pastDayAwardedCount.toLocaleString()}
                                />
                                <StatItem
                                    icon={<Percent size={14} />}
                                    label="Win Rate"
                                    value={`${badge.statistics.winRatePercentage.toFixed(1)}%`}
                                />
                                <StatItem
                                    icon={<Calendar size={14} />}
                                    label="Created"
                                    value={new Date(badge.created).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                />
                            </div>

                            {/* Awarding experience */}
                            {badge.awardingUniverse && (
                                <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-[var(--color-surface-muted)]">
                                    <Gamepad2 size={14} className="text-[var(--color-text-muted)] shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[11px] text-[var(--color-text-muted)]">Experience</div>
                                        <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                                            {badge.awardingUniverse.name}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-sm text-[var(--color-text-muted)] text-center py-6">
                            Failed to load badge details.
                        </div>
                    )}
                </DialogBody>
            </DialogContent>
        </Dialog>
    )
}
