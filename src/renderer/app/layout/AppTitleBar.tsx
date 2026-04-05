import React, { Suspense, lazy, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Minus, Square, X } from 'lucide-react'
import { TabId, Friend, Game } from '@renderer/shared/types'

const NotificationTray = lazy(() => import('@renderer/shared/ui/feedback/NotificationTray'))
const TitleBarSearch = lazy(() => import('./TitleBarSearch'))

interface AppTitleBarProps {
    activeTab: TabId
    activeTabFallbackTitle?: string
    isMac: boolean
    friends: Friend[]
    onOpenUserProfile: (userId: string) => void
    onGameSelect?: (game: Game) => void
}

const SEARCH_MAX_WIDTH_PX = 360
const SEARCH_SIDE_GAP_PX = 20

interface SearchLayout {
    centerX: number
    width: number
}

const SearchFallback: React.FC = () => (
    <div className="h-9 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)]/60" />
)

const AppTitleBar: React.FC<AppTitleBarProps> = ({
    activeTab,
    activeTabFallbackTitle,
    isMac,
    friends,
    onOpenUserProfile,
    onGameSelect
}) => {
    const layoutRef = useRef<HTMLDivElement>(null)
    const titleRef = useRef<HTMLDivElement>(null)
    const notificationRef = useRef<HTMLDivElement>(null)
    const [searchLayout, setSearchLayout] = useState<SearchLayout>({
        centerX: SEARCH_MAX_WIDTH_PX / 2,
        width: SEARCH_MAX_WIDTH_PX
    })

    const updateSearchLayout = useCallback(() => {
        if (!layoutRef.current || !titleRef.current || !notificationRef.current) {
            return
        }

        const layoutRect = layoutRef.current.getBoundingClientRect()
        const titleRect = titleRef.current.getBoundingClientRect()
        const notificationRect = notificationRef.current.getBoundingClientRect()
        const leftEdge = Math.max(0, titleRect.right - layoutRect.left + SEARCH_SIDE_GAP_PX)
        const rightEdge = Math.min(layoutRect.width, notificationRect.left - layoutRect.left - SEARCH_SIDE_GAP_PX)
        const availableWidth = Math.max(0, rightEdge - leftEdge)
        const width = Math.min(SEARCH_MAX_WIDTH_PX, availableWidth)
        const centerX = leftEdge + availableWidth / 2

        setSearchLayout((prev) => {
            if (prev.centerX === centerX && prev.width === width) {
                return prev
            }

            return { centerX, width }
        })
    }, [])

    useLayoutEffect(() => {
        updateSearchLayout()

        const resizeObserver = new ResizeObserver(() => {
            updateSearchLayout()
        })

        if (layoutRef.current) resizeObserver.observe(layoutRef.current)
        if (titleRef.current) resizeObserver.observe(titleRef.current)
        if (notificationRef.current) resizeObserver.observe(notificationRef.current)

        window.addEventListener('resize', updateSearchLayout)

        return () => {
            resizeObserver.disconnect()
            window.removeEventListener('resize', updateSearchLayout)
        }
    }, [updateSearchLayout, activeTab, activeTabFallbackTitle, isMac])

    return (
        <div className="relative h-[52px] flex-shrink-0 w-full bg-[var(--color-titlebar)]">
            <div
                className="absolute inset-0 z-0"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
            />
            {searchLayout.width > 0 && (
                <div
                    className="absolute inset-y-0 z-20 flex items-center"
                    style={{
                        left: searchLayout.centerX,
                        transform: 'translateX(-50%)',
                        width: searchLayout.width
                    }}
                >
                    <div className="w-full">
                        <Suspense fallback={<SearchFallback />}>
                            <TitleBarSearch
                                friends={friends}
                                onOpenUserProfile={onOpenUserProfile}
                                onGameSelect={onGameSelect}
                            />
                        </Suspense>
                    </div>
                </div>
            )}
            <div
                ref={layoutRef}
                className="relative z-10 flex h-full w-full items-center justify-between gap-4 pointer-events-none"
            >
                <div
                    ref={titleRef}
                    className="min-w-0 max-w-[clamp(120px,22vw,240px)] truncate pl-4 pr-2 text-[15px] font-semibold text-[var(--color-text-primary)] pointer-events-none"
                >
                    {activeTabFallbackTitle ?? activeTab}
                </div>

                <div
                    className="flex h-full items-center gap-2 justify-self-end"
                    style={
                        {
                            pointerEvents: 'auto',
                            WebkitAppRegion: 'no-drag',
                            paddingRight: isMac ? '16px' : '0px'
                        } as React.CSSProperties
                    }
                >
                    <div ref={notificationRef} className="shrink-0">
                        <Suspense fallback={<div className="h-10 w-10" />}>
                            <NotificationTray onOpenUserProfile={onOpenUserProfile} />
                        </Suspense>
                    </div>
                    {!isMac && (
                        <>
                            <div className="w-px h-5 bg-[var(--color-border)] mx-1" />
                            <div className="flex h-[52px] items-stretch">
                                <button
                                    onClick={() => void window.api.minimizeWindow()}
                                    className="flex h-[52px] w-12 items-center justify-center text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                                    aria-label="Minimize window"
                                    title="Minimize"
                                >
                                    <Minus className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => void window.api.toggleMaximizeWindow()}
                                    className="flex h-[52px] w-12 items-center justify-center text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                                    aria-label="Maximize window"
                                    title="Maximize"
                                >
                                    <Square className="h-[13px] w-[13px]" />
                                </button>
                                <button
                                    onClick={() => void window.api.closeWindow()}
                                    className="flex h-[52px] w-12 items-center justify-center text-[var(--color-text-muted)] transition-colors hover:bg-[#c42b1c] hover:text-white"
                                    aria-label="Close window"
                                    title="Close"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[var(--color-border)]" />
        </div>
    )
}

export default AppTitleBar