import { accountContracts, authContracts } from './contracts/account'
import { appContracts } from './contracts/app'
import {
    avatarContracts,
    avatarScalesSchema,
    catalogSearchParamsSchema,
    catalogThumbnailItemSchema
} from './contracts/avatar'
import { gamesContracts } from './contracts/games'
import {
    installContracts,
    systemContracts,
    titlebarOverlaySchema,
    customFontSchema
} from './contracts/installSystem'
import { socialContracts } from './contracts/social'

export const rpcSchemas = {
    account: accountContracts,
    auth: authContracts,
    avatar: avatarContracts,
    social: socialContracts,
    games: gamesContracts,
    install: installContracts,
    system: systemContracts,
    app: appContracts
} as const

export { titlebarOverlaySchema, customFontSchema, avatarScalesSchema, catalogSearchParamsSchema, catalogThumbnailItemSchema }