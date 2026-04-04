import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface LastSeenState {
    /** Map of userId -> ISO timestamp of when we last viewed their profile */
    lastSeen: Record<number, string>
}

interface LastSeenActions {
    recordSeen: (userId: number) => void
    getLastSeen: (userId: number) => string | null
}

type LastSeenStore = LastSeenState & LastSeenActions

export const useLastSeenStore = create<LastSeenStore>()(
    devtools(
        persist(
            (set, get) => ({
                lastSeen: {},

                recordSeen: (userId) =>
                    set(
                        (state) => ({
                            lastSeen: { ...state.lastSeen, [userId]: new Date().toISOString() }
                        }),
                        false,
                        'recordSeen'
                    ),

                getLastSeen: (userId) => get().lastSeen[userId] ?? null
            }),
            {
                name: 'last-seen-storage'
            }
        ),
        { name: 'LastSeenStore' }
    )
)
