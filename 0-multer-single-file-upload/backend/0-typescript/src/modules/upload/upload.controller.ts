import {
    Controller,
    HttpCode,
    Post,
    UnsupportedMediaTypeException,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { FileInterceptor } from "@nestjs/platform-express"
import type { UploadConfig } from "../../config"
import { UploadService } from "./upload.service"
import type { UploadedFileInfo } from "./upload.types"

/**
 * Controller xử lý endpoint POST /upload — Multer đã enforce size + MIME ở interceptor.
 * (EN: Controller handling POST /upload — Multer already enforces size + MIME at the interceptor layer.)
 */
@Controller("upload")
export class UploadController {
    public constructor(
        private readonly uploadService: UploadService,
        private readonly configService: ConfigService,
    ) {}

    /**
     * Nhận một file qua multipart/form-data, trả metadata sau khi Multer đã lưu xuống disk.
     * (EN: Accept one file via multipart/form-data, return metadata after Multer wrote it to disk.)
     */
    @Post()
    @HttpCode(201)
    @UseInterceptors(FileInterceptor("file"))
    public upload(@UploadedFile() file: Express.Multer.File): UploadedFileInfo {
        // Multer đã enforce size + MIME tại tầng interceptor.
        // (EN: Multer already enforced size + MIME at the interceptor layer.)
        if (!file) {
            const cfg = this.configService.getOrThrow<UploadConfig>("upload")
            throw new UnsupportedMediaTypeException(
                `Validation failed (expected MIME types: ${cfg.allowedMimes.join(", ")})`,
            )
        }
        return this.uploadService.describe(file)
    }
}
