import {
    Injectable,
} from "@nestjs/common"
import {
    ConfigService,
} from "@nestjs/config"
import {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3"
import {
    getSignedUrl,
} from "@aws-sdk/s3-request-presigner"
import {
    randomUUID,
} from "node:crypto"
import {
    S3_CONFIG_TOKEN,
    type S3ConfigShape,
} from "../../config"

export interface PresignedUploadInfo {
    key: string
    url: string
    method: "PUT"
    expiresInSeconds: number
}

/**
 * S3Service — wraps AWS SDK v3 + s3-request-presigner to sign short-lived PUT/GET URLs.
 */
@Injectable()
export class S3Service {
    private readonly cfg: S3ConfigShape

    constructor(
        private readonly s3: S3Client,
        configService: ConfigService,
    ) {
        this.cfg = configService.getOrThrow<S3ConfigShape>(S3_CONFIG_TOKEN)
    }

    /**
     * Sign a PUT URL so the client uploads directly — bypassing the backend.
     */
    async createUploadUrl(contentType: string): Promise<PresignedUploadInfo> {
        // Key = timestamp + UUID — no extension, no userId, no month prefix in this demo.
        const key = `${Date.now()}-${randomUUID()}`
        // Command representing the PUT object operation on the bucket.
        const command = new PutObjectCommand({
            Bucket: this.cfg.bucket,
            Key: key,
            // When ContentType is signed (as here), the client must send the same
            // value in its PUT header, otherwise MinIO rejects with 403.
            ContentType: contentType,
        })
        // getSignedUrl embeds HMAC-SHA256 signature + expiry into URL query string.
        const url = await getSignedUrl(this.s3, command, {
            expiresIn: this.cfg.presignExpiresSeconds,
        })
        return { key, url, method: "PUT", expiresInSeconds: this.cfg.presignExpiresSeconds }
    }

    /**
     * Sign a short-lived GET URL — the bucket stays private but allows temporary downloads.
     */
    async createDownloadUrl(key: string): Promise<string> {
        // GET object command — presigner signs it with the same credentials.
        const command = new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key })
        return getSignedUrl(this.s3, command, {
            expiresIn: this.cfg.presignExpiresSeconds,
        })
    }
}
