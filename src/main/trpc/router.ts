import { mergeRouters } from './core'
import { accountRouter } from './routers/account'
import { avatarRouter } from './routers/avatar'
import { socialRouter } from './routers/social'
import { gamesRouter } from './routers/games'
import { installSystemRouter } from './routers/installSystem'
import { appSupportRouter } from './routers/app'

export const appRouter = mergeRouters(
    accountRouter,
    avatarRouter,
    socialRouter,
    gamesRouter,
    installSystemRouter,
    appSupportRouter
)

export type AppRouter = typeof appRouter