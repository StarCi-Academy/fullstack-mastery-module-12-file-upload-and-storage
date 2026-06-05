import {
    Body,
    Controller,
    Get,
    Param,
    Post,
} from "@nestjs/common"
import {
    S3Service,
    type PresignedUploadInfo,
} from "./s3.service"
import {
    PresignPutDto,
} from "./dto"

/**
 * PresignController — HTTP endpoints to mint short-lived presigned PUT/GET URLs.
 * (EN: PresignController — HTTP endpoints to mint short-lived presigned PUT/GET URLs.)
 *
 * Endpoints khớp với `vi.md §2.1.4` luồng test PowerShell + cURL.
 * (EN: Endpoints match `vi.md §2.1.4` PowerShell + cURL test flows.)
 */
@Controller("presign")
export class PresignController {
    constructor(private readonly s3Service: S3Service) {}

    /**
     * Ký URL PUT ngắn hạn để client upload thẳng lên MinIO/S3.
     * (EN: Sign a short-lived PUT URL so the client uploads directly to MinIO/S3.)
     */
    @Post("put")
    async createPutUrl(
        @Body() dto: PresignPutDto,
    ): Promise<PresignedUploadInfo & { filename: string }> {
        const info = await this.s3Service.createUploadUrl(dto.contentType)
        return { ...info, filename: dto.filename }
    }

    /**
     * Ký URL GET ngắn hạn cho download — bucket giữ private.
     * (EN: Sign a short-lived GET URL for download — bucket stays private.)
     */
    @Get("get/:key")
    async createGetUrl(
        @Param("key") key: string,
    ): Promise<{ url: string; key: string; expiresInSeconds: number }> {
        const decoded = decodeURIComponent(key)
        const url = await this.s3Service.createDownloadUrl(decoded)
        return { url, key: decoded, expiresInSeconds: 300 }
    }
}
