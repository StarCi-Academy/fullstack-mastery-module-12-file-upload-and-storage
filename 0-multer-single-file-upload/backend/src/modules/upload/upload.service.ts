import { Injectable, Logger } from "@nestjs/common"
import type { UploadedFileInfo } from "./upload.types"

/**
 * Service mô tả file đã upload — wrap metadata thành DTO phản hồi.
 * (EN: Service describes the uploaded file — wraps metadata into the response DTO.)
 */
@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name)

    /**
     * Trả về metadata của file đã được Multer ghi xuống đĩa.
     * (EN: Returns metadata of the file already written to disk by Multer.)
     */
    public describe(file: Express.Multer.File): UploadedFileInfo {
        const sizeKb = Math.round(file.size / 1024)
        this.logger.log(`saved ${sizeKb} KB to ${file.path}`)
        return {
            originalName: file.originalname,
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
            path: file.path,
        }
    }
}
