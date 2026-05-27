import {
    registerAs,
} from "@nestjs/config"

/**
 * Token đăng ký namespace `s3` trong ConfigService — single source of truth cho MinIO/S3 config.
 * (EN: Registers the `s3` namespace in ConfigService — single source of truth for MinIO/S3 config.)
 */
export const S3_CONFIG_TOKEN = "s3"

export interface S3ConfigShape {
    endpoint: string
    region: string
    accessKey: string
    secretKey: string
    bucket: string
    forcePathStyle: boolean
    presignExpiresSeconds: number
}

export const s3Config = registerAs<S3ConfigShape>(S3_CONFIG_TOKEN, () => ({
    endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
    region: process.env.S3_REGION ?? "us-east-1",
    accessKey: process.env.S3_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.S3_SECRET_KEY ?? "minioadmin",
    bucket: process.env.S3_BUCKET ?? "uploads",
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true",
    presignExpiresSeconds: Number(process.env.S3_PRESIGN_EXPIRES_SECONDS ?? 300),
}))
