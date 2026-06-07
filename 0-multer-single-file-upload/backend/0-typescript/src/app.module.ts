import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { uploadConfig } from "./config"
import { UploadModule } from "./modules/upload"

/**
 * Root module — wires ConfigModule (global) + UploadModule.
 * (EN: Root module — wires ConfigModule (global) + UploadModule.)
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [uploadConfig],
        }),
        UploadModule,
    ],
})
export class AppModule {}
