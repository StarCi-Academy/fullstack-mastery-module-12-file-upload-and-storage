import {
    Module,
} from "@nestjs/common"
import {
    ConfigModule,
} from "@nestjs/config"
import {
    uploadConfig,
} from "./config"
import {
    UploadModule,
} from "./modules/upload"

/**
 * Root module — wire ConfigModule global + UploadModule.
 * (EN: Root module — wires the global ConfigModule plus UploadModule.)
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
