import { initTRPC } from '@trpc/server'
import type { IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'
import { extractCookie } from '@main/modules/core/auth'

export type AppContext = {
    event: IpcMainInvokeEvent
}

export type ProcedureDefinition<ArgsSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
    args: ArgsSchema
}

export type ProcedureArgs<C extends ProcedureDefinition> =
    z.infer<C['args']> extends unknown[] ? z.infer<C['args']> : never

export type DropFirst<T extends unknown[]> = T extends [any, ...infer Rest] ? Rest : never

export const trpc = initTRPC.context<AppContext>().create()
export const procedure = trpc.procedure
export const router = trpc.router
export const mergeRouters = trpc.mergeRouters

export function defineProcedure<ArgsSchema extends z.ZodTypeAny>(args: ArgsSchema) {
    return { args } as const
}

export function contractMutation<C extends ProcedureDefinition>(
    contract: C,
    resolver: (ctx: AppContext, ...args: ProcedureArgs<C>) => Promise<unknown> | unknown
) {
    return procedure
        .input(contract.args)
        .mutation(({ ctx, input }) => resolver(ctx, ...(input as ProcedureArgs<C>)))
}

export function authContractMutation<C extends ProcedureDefinition>(
    contract: C,
    resolver: (
        ctx: AppContext,
        cookie: string,
        ...args: DropFirst<ProcedureArgs<C>>
    ) => Promise<unknown> | unknown
) {
    return contractMutation(contract, (ctx, ...args) => {
        const [cookieRaw, ...rest] = args as [string, ...unknown[]]
        return resolver(ctx, extractCookie(cookieRaw), ...(rest as DropFirst<ProcedureArgs<C>>))
    })
}