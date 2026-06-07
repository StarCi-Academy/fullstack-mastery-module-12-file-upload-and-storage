import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { MulterModule } from "@nestjs/platform-express"
import { diskStorage } from "multer"
import type { UploadConfig } from "../../config"
import { UploadController } from "./upload.controller"
import { UploadService } from "./upload.service"

/**
 * Module registers MulterModule async with diskStorage + size limit + MIME allow-list.
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
                        // Generate a unique filename via timestamp + original name.
                        // WARNING: file.originalname is attacker-controlled — sanitize
                        // it (path.basename) or use UUID-only in production.
                        filename: (_req, file, cb): void =>
                            cb(null, `${Date.now()}-${file.originalname}`),
                    }),
                    limits: { fileSize: cfg.maxBytes },
                    // Reject MIME outside allow-list — controller throws 415 when file is undefined.
                    fileFilter: (_req, file, cb): void => {
                        if (cfg.allowedMimes.includes(file.mimetype)) {
                            cb(null, true)
                            return
                        }
                        // Silently reject — controller throws 415 when file is undefined.
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
