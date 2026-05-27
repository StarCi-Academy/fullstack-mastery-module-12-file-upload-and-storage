import {
    registerAs,
} from "@nestjs/config"

/**
 * Token đăng ký namespace `upload` trong ConfigService — single source of truth cho chunked upload.
 * (EN: Registers the `upload` namespace in ConfigService — single source of truth for chunked upload.)
 */
export const UPLOAD_CONFIG_TOKEN = "upload"

export interface UploadConfigShape {
    tmpDir: string
    finalDir: string
    chunkSizeBytes: number
    maxFileBytes: number
}

export const uploadConfig = registerAs<UploadConfigShape>(UPLOAD_CONFIG_TOKEN, () => ({
    tmpDir: process.env.UPLOAD_TMP_DIR ?? "tmp",
    finalDir: process.env.UPLOAD_FINAL_DIR ?? "uploads",
    chunkSizeBytes: Number(process.env.UPLOAD_CHUNK_SIZE_BYTES ?? 5 * 1024 * 1024),
    maxFileBytes: Number(process.env.UPLOAD_MAX_FILE_BYTES ?? 1024 * 1024 * 1024),
}))
