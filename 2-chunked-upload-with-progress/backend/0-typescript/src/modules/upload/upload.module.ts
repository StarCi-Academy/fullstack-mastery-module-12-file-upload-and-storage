import {
    Module,
} from "@nestjs/common"
import {
    UploadController,
} from "./upload.controller"
import {
    UploadService,
} from "./upload.service"

/**
 * Upload module — wires controller + service for chunked uploads.
 */
@Module({
    controllers: [UploadController],
    providers: [UploadService],
    exports: [UploadService],
})
export class UploadModule {}
