import {
    Module,
} from "@nestjs/common"
import {
    ConfigModule,
} from "@nestjs/config"
import {
    s3Config,
} from "./config"
import {
    S3Module,
} from "./modules/s3"

/**
 * Root module — wires the global ConfigModule plus feature modules.
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [s3Config],
        }),
        S3Module,
    ],
})
export class AppModule {}
