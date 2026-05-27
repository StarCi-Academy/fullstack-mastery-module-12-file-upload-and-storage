import { registerAs } from "@nestjs/config"

/**
 * Cấu hình upload đọc từ environment, dùng cho MulterModule và validator pipe.
 * (EN: Upload configuration read from environment, used by MulterModule and validator pipe.)
 */
export interface UploadConfig {
    dest: string
    maxBytes: number
    allowedMimes: readonly string[]
}

/**
 * registerAs factory cho config namespace "upload" — inject qua ConfigService.
 * (EN: registerAs factory for the "upload" config namespace — injected via ConfigService.)
 */
export const uploadConfig = registerAs<UploadConfig>("upload", () => ({
    dest: process.env.UPLOAD_DEST ?? "uploads",
    maxBytes: Number(process.env.UPLOAD_MAX_BYTES ?? 5 * 1024 * 1024),
    allowedMimes: (process.env.UPLOAD_ALLOWED_MIMES ?? "image/jpeg,image/png,image/webp")
        .split(",")
        .map((mime: string): string => mime.trim()),
}))
