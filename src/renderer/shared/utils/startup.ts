import { useEffect, useState } from 'react'

const STARTUP_IDLE_TIMEOUT_MS = 1000

export function scheduleAfterFirstPaint(task: () => void): () => void {
    let idleHandle: number | null = null

    const frameHandle = window.requestAnimationFrame(() => {
        idleHandle = window.requestIdleCallback(task, { timeout: STARTUP_IDLE_TIMEOUT_MS })
    })

    return () => {
        window.cancelAnimationFrame(frameHandle)

        if (idleHandle !== null) {
            window.cancelIdleCallback(idleHandle)
        }
    }
}

export function useStartupReady(): boolean {
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        return scheduleAfterFirstPaint(() => {
            setIsReady(true)
        })
    }, [])

    return isReady
}