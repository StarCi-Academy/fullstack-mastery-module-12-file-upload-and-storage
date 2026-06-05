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
 * S3Service — bọc AWS SDK v3 + s3-request-presigner để ký PUT/GET URL ngắn hạn.
 * (EN: S3Service — wraps AWS SDK v3 + s3-request-presigner to sign short-lived PUT/GET URLs.)
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
     * Ký URL PUT cho client upload thẳng — không qua backend.
     * (EN: Sign a PUT URL so the client uploads directly — bypassing the backend.)
     */
    async createUploadUrl(contentType: string): Promise<PresignedUploadInfo> {
        const key = `${Date.now()}-${randomUUID()}`
        // Lệnh đại diện cho thao tác PUT object lên bucket.
        // (EN: Command representing the PUT object operation on the bucket.)
        const command = new PutObjectCommand({
            Bucket: this.cfg.bucket,
            Key: key,
            ContentType: contentType,
        })
        // getSignedUrl ký URL với TTL — client upload thẳng tới MinIO.
        // (EN: getSignedUrl signs the URL with TTL — client uploads straight to MinIO.)
        const url = await getSignedUrl(this.s3, command, {
            expiresIn: this.cfg.presignExpiresSeconds,
        })
        return { key, url, method: "PUT", expiresInSeconds: this.cfg.presignExpiresSeconds }
    }

    /**
     * Ký URL GET ngắn hạn — bucket giữ private nhưng cho phép download tạm thời.
     * (EN: Sign a short-lived GET URL — the bucket stays private but allows temporary downloads.)
     */
    async createDownloadUrl(key: string): Promise<string> {
        // Lệnh GET object — presigner sẽ ký với cùng credential.
        // (EN: GET object command — presigner signs it with the same credentials.)
        const command = new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key })
        return getSignedUrl(this.s3, command, {
            expiresIn: this.cfg.presignExpiresSeconds,
        })
    }
}
