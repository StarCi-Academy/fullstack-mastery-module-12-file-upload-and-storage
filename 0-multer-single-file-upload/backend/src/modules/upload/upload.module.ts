import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { MulterModule } from "@nestjs/platform-express"
import { diskStorage } from "multer"
import type { UploadConfig } from "../../config"
import { UploadController } from "./upload.controller"
import { UploadService } from "./upload.service"

/**
 * Module đăng ký MulterModule async với diskStorage + size limit + MIME allow-list.
 * (EN: Module registers MulterModule async with diskStorage + size limit + MIME allow-list.)
 */
@Module({
    imports: [
        MulterModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const cfg = configService.getOrThrow<UploadConfig>("upload")
                return {
                    storage: diskStorage({
                        destination: cfg.dest,
                        // Sinh filename duy nhất bằng timestamp + tên gốc.
                        // (EN: Generate unique filename via timestamp + original name.)
                        filename: (_req, file, cb): void =>
                            cb(null, `${Date.now()}-${file.originalname}`),
                    }),
                    limits: { fileSize: cfg.maxBytes },
                    // Từ chối MIME ngoài allow-list → Multer trả 415.
                    // (EN: Reject MIME outside allow-list → Multer returns 415.)
                    fileFilter: (_req, file, cb): void => {
                        if (cfg.allowedMimes.includes(file.mimetype)) {
                            cb(null, true)
                            return
                        }
                        // Reject silently — controller throws 415 khi file undefined.
                        // (EN: Silently reject — controller throws 415 when file is undefined.)
                        cb(null, false)
                    },
                }
            },
        }),
    ],
    controllers: [UploadController],
    providers: [UploadService],
})
export class UploadModule {}
