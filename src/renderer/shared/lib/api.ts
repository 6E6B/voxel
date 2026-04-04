import { createTRPCProxyClient, TRPCClientError } from '@trpc/client'
import type { TRPCLink, Operation } from '@trpc/client'
import type { AnyRouter, TRPCResponseMessage, TRPCResultMessage } from '@trpc/server'
import { observable } from '@trpc/server/observable'
import type { AppRouter } from '@main/trpc/router'
import type { IpcApi } from '../../../preload/api'

// ---------------------------------------------------------------------------
// tRPC v11-compatible IPC link (electron-trpc 0.7.1 only supports v10)
// ---------------------------------------------------------------------------

interface RendererGlobalElectronTRPC {
    sendMessage: (args: unknown) => void
    onMessage: (callback: (args: TRPCResponseMessage) => void) => void
}

function getElectronTRPC(): RendererGlobalElectronTRPC {
    const electronTRPC: RendererGlobalElectronTRPC = (globalThis as any).electronTRPC
    if (!electronTRPC) {
        throw new Error('Could not find `electronTRPC` global. Check that `exposeElectronTRPC` has been called in your preload file.')
    }
    return electronTRPC
}

type IPCCallbacks = {
    next: (value: TRPCResponseMessage) => void
    error: (err: unknown) => void
    complete: () => void
}

type IPCRequest = {
    type: string
    callbacks: IPCCallbacks
    op: Operation
}

class IPCClient {
    #pendingRequests = new Map<string | number, IPCRequest>()
    #electronTRPC = getElectronTRPC()

    constructor() {
        this.#electronTRPC.onMessage((response: TRPCResponseMessage) => {
            this.#handleResponse(response)
        })
    }

    #handleResponse(response: TRPCResponseMessage) {
        const request = response.id && this.#pendingRequests.get(response.id)
        if (!request) return

        request.callbacks.next(response)

        if ('result' in response && response.result.type === 'stopped') {
            request.callbacks.complete()
        }
    }

    request(op: Operation, callbacks: IPCCallbacks) {
        const { type, id } = op
        this.#pendingRequests.set(id, { type, callbacks, op })
        this.#electronTRPC.sendMessage({ method: 'request', operation: op })

        return () => {
            const req = this.#pendingRequests.get(id)
            this.#pendingRequests.delete(id)
            req?.callbacks.complete()

            if (type === 'subscription') {
                this.#electronTRPC.sendMessage({ id, method: 'subscription.stop' })
            }
        }
    }
}

/** v11-compatible transformResult — no runtime.transformer needed */
function transformResult(response: TRPCResponseMessage) {
    if ('error' in response) {
        return { ok: false as const, error: { ...response, error: response.error } }
    }
    const result = {
        ...response.result,
        ...((!response.result.type || response.result.type === 'data') && {
            type: 'data' as const,
            data: response.result.data
        })
    } as TRPCResultMessage<unknown>['result']
    return { ok: true as const, result }
}

function ipcLink<TRouter extends AnyRouter>(): TRPCLink<TRouter> {
    return () => {
        const client = new IPCClient()

        return ({ op }) => {
            return observable((observer) => {
                // In tRPC v11, input is already serialized — no transformer needed
                const unsubscribe = client.request(op, {
                    error(err) {
                        observer.error(err as TRPCClientError<any>)
                        unsubscribe()
                    },
                    complete() {
                        observer.complete()
                    },
                    next(response) {
                        const transformed = transformResult(response)
                        if (!transformed.ok) {
                            observer.error(TRPCClientError.from(transformed.error))
                            return
                        }
                        observer.next({ result: transformed.result })
                        if (op.type !== 'subscription') {
                            unsubscribe()
                            observer.complete()
                        }
                    }
                })

                return unsubscribe
            })
        }
    }
}

// ---------------------------------------------------------------------------
// Build window.api — Proxy lives here, not in preload, so contextBridge is
// never involved.
// ---------------------------------------------------------------------------

type AsyncMethod = (...args: unknown[]) => Promise<unknown>

export type Api = {
    onUpdaterStatus: IpcApi['onUpdaterStatus']
} & Record<string, AsyncMethod>

const client = createTRPCProxyClient<AppRouter>({
    links: [ipcLink<AppRouter>()]
})

const ipcApi: IpcApi = (window as any).ipcApi

window.api = new Proxy(
    {
        onUpdaterStatus: ipcApi.onUpdaterStatus
    },
    {
        get(target, prop, receiver) {
            if (typeof prop !== 'string') {
                return Reflect.get(target, prop, receiver)
            }

            if (Reflect.has(target, prop)) {
                return Reflect.get(target, prop, receiver)
            }

            return (...args: unknown[]) => (client as any)[prop].mutate(args)
        }
    }
) as Api
