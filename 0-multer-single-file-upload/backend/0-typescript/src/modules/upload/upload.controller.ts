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
 * Controller handling POST /upload — Multer already enforces size + MIME at the interceptor layer.
 */
@Controller("upload")
export class UploadController {
    public constructor(
        private readonly uploadService: UploadService,
        private readonly configService: ConfigService,
    ) {}

    /**
     * Accept one file via multipart/form-data, return metadata after Multer wrote it to disk.
     */
    @Post()
    @HttpCode(201)
    @UseInterceptors(FileInterceptor("file"))
    public upload(@UploadedFile() file: Express.Multer.File): UploadedFileInfo {
        // Multer already enforced size + MIME at the interceptor layer.
        if (!file) {
            const cfg = this.configService.getOrThrow<UploadConfig>("upload")
            throw new UnsupportedMediaTypeException(
                `Validation failed (expected MIME types: ${cfg.allowedMimes.join(", ")})`,
            )
        }
        return this.uploadService.describe(file)
    }
}
