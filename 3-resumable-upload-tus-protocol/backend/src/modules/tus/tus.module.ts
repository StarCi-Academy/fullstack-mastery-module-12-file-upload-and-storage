import {
    Module,
    MiddlewareConsumer,
    NestModule,
    RequestMethod,
} from "@nestjs/common"
import {
    ConfigService,
} from "@nestjs/config"
import {
    TusMiddleware,
} from "./tus.middleware"
import {
    TUS_CONFIG_TOKEN,
    type TusConfigShape,
} from "../../config"

/**
 * Tus module — mount @tus/server middleware ở path cấu hình (`/files`).
 * (EN: Tus module — mounts the @tus/server middleware at the configured path (`/files`).)
 */
@Module({
    providers: [TusMiddleware],
})
export class TusModule implements NestModule {
    constructor(private readonly config: ConfigService) {}

    configure(consumer: MiddlewareConsumer): void {
        const cfg = this.config.get<TusConfigShape>(TUS_CONFIG_TOKEN)!
        consumer
            .apply(TusMiddleware)
            .forRoutes(
                { path: cfg.path, method: RequestMethod.ALL },
                { path: `${cfg.path}/*`, method: RequestMethod.ALL },
            )
    }
}
