import {
    callTRPCProcedure,
    getErrorShape,
    getTRPCErrorFromUnknown,
    transformTRPCResponse,
    TRPCError
} from '@trpc/server'
import type { AnyRouter, inferRouterContext, ProcedureType } from '@trpc/server'
import { isObservable } from '@trpc/server/observable'
import type { Unsubscribable } from '@trpc/server/observable'
import type { TRPCResponseMessage } from '@trpc/server/unstable-core-do-not-import'
import { ipcMain } from 'electron'
import type { BrowserWindow, IpcMainEvent } from 'electron'

const ELECTRON_TRPC_CHANNEL = 'electron-trpc'

type ETRPCRequest =
    | { method: 'request'; operation: { type: ProcedureType; id: string | number; path: string; input: unknown } }
    | { method: 'subscription.stop'; id: number }

type Awaitable<T> = T | Promise<T>

const getInternalId = (event: IpcMainEvent, request: ETRPCRequest) => {
    const messageId = request.method === 'request' ? request.operation.id : request.id
    return `${event.sender.id}-${event.senderFrame?.routingId ?? 0}:${messageId}`
}

class IPCHandler<TRouter extends AnyRouter> {
    #windows: BrowserWindow[] = []
    #subscriptions = new Map<string, Unsubscribable>()

    constructor({
        createContext,
        router,
        windows = []
    }: {
        createContext?: (opts: { event: IpcMainEvent }) => Awaitable<inferRouterContext<TRouter>>
        router: TRouter
        windows?: BrowserWindow[]
    }) {
        windows.forEach((win) => this.attachWindow(win))

        ipcMain.on(ELECTRON_TRPC_CHANNEL, (event: IpcMainEvent, request: ETRPCRequest) => {
            this.#handleMessage({ router, createContext, event, request })
        })
    }

    async #handleMessage({
        router,
        createContext,
        event,
        request
    }: {
        router: TRouter
        createContext?: (opts: { event: IpcMainEvent }) => Awaitable<inferRouterContext<TRouter>>
        event: IpcMainEvent
        request: ETRPCRequest
    }) {
        const internalId = getInternalId(event, request)

        if (request.method === 'subscription.stop') {
            const sub = this.#subscriptions.get(internalId)
            if (sub) {
                sub.unsubscribe()
                this.#subscriptions.delete(internalId)
            }
            return
        }

        const { type, input, path, id } = request.operation
        const ctx = (await createContext?.({ event })) ?? {}

        const respond = (response: TRPCResponseMessage) => {
            if (event.sender.isDestroyed()) return
            event.reply(
                ELECTRON_TRPC_CHANNEL,
                transformTRPCResponse(router._def._config, response)
            )
        }

        const respondError = (cause: unknown) => {
            const error = getTRPCErrorFromUnknown(cause)
            respond({
                id,
                error: getErrorShape({
                    config: router._def._config,
                    error,
                    type,
                    path,
                    input,
                    ctx
                })
            })
        }

        try {
            const result = await callTRPCProcedure({
                ctx,
                path,
                getRawInput: async () => input,
                router,
                type,
                signal: undefined as unknown as AbortSignal,
                batchIndex: undefined as unknown as number
            })

            if (type !== 'subscription') {
                respond({
                    id,
                    result: { type: 'data', data: result }
                })
                return
            }

            if (!isObservable(result)) {
                throw new TRPCError({
                    message: `Subscription ${path} did not return an observable`,
                    code: 'INTERNAL_SERVER_ERROR'
                })
            }

            const subscription = result.subscribe({
                next(data) {
                    respond({ id, result: { type: 'data', data } })
                },
                error(err) {
                    respondError(err)
                },
                complete() {
                    respond({ id, result: { type: 'stopped' } })
                }
            })

            this.#subscriptions.set(internalId, subscription)
        } catch (cause) {
            respondError(cause)
        }
    }

    attachWindow(win: BrowserWindow) {
        if (this.#windows.includes(win)) return

        this.#windows.push(win)

        const cleanup = () => {
            this.#windows = this.#windows.filter((w) => w !== win)
            const webContentsId = win.isDestroyed() ? undefined : win.webContents?.id
            if (webContentsId !== undefined) {
                for (const [key, sub] of this.#subscriptions.entries()) {
                    if (key.startsWith(`${webContentsId}-`)) {
                        sub.unsubscribe()
                        this.#subscriptions.delete(key)
                    }
                }
            }
        }

        win.on('closed', cleanup)
    }
}

export function createIPCHandler<TRouter extends AnyRouter>(opts: {
    createContext?: (opts: { event: IpcMainEvent }) => Awaitable<inferRouterContext<TRouter>>
    router: TRouter
    windows?: BrowserWindow[]
}) {
    return new IPCHandler(opts)
}
