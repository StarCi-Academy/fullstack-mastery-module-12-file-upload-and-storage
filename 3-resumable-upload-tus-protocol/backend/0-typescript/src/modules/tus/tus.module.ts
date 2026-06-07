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
 * Tus module — mounts the @tus/server middleware at the configured path (`/files`).
 */
@Module({
    providers: [TusMiddleware],
})
export class TusModule implements NestModule {
    constructor(private readonly config: ConfigService) {}

    configure(consumer: MiddlewareConsumer): void {
        const cfg = this.config.get<TusConfigShape>(TUS_CONFIG_TOKEN)!
        // Mount TusMiddleware for ALL HTTP methods on /files and /files/*.
        // RequestMethod.ALL ensures OPTIONS, POST, HEAD, PATCH all reach
        // the tus Server without NestJS routing interfering.
        consumer
            .apply(TusMiddleware)
            .forRoutes(
                { path: cfg.path, method: RequestMethod.ALL },
                { path: `${cfg.path}/*`, method: RequestMethod.ALL },
            )
    }
}
