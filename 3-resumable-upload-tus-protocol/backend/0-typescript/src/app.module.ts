import {
    Module,
} from "@nestjs/common"
import {
    ConfigModule,
} from "@nestjs/config"
import {
    tusConfig,
} from "./config"
import {
    TusModule,
} from "./modules/tus"

/**
 * Root module — wires the global ConfigModule plus the TusModule feature module.
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [tusConfig],
        }),
        TusModule,
    ],
})
export class AppModule {}
