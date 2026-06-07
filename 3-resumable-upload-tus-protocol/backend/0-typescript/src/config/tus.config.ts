import {
    registerAs,
} from "@nestjs/config"

/**
 * Registers the `tus` namespace in ConfigService — single source of truth for tus server config.
 */
export const TUS_CONFIG_TOKEN = "tus"

export interface TusConfigShape {
    path: string
    directory: string
    maxSize: number
}

export const tusConfig = registerAs<TusConfigShape>(TUS_CONFIG_TOKEN, () => ({
    path: process.env.TUS_PATH ?? "/files",
    directory: process.env.TUS_DIRECTORY ?? "./uploads",
    maxSize: Number(process.env.TUS_MAX_SIZE ?? 104857600),
}))
