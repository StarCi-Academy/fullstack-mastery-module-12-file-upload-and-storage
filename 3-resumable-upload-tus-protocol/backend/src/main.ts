import "reflect-metadata"
import {
    NestFactory,
} from "@nestjs/core"
import {
    ConfigService,
} from "@nestjs/config"
import {
    AppModule,
} from "./app.module"

/**
 * Khởi động NestJS app — port đọc từ ConfigService, CORS enabled cho HTML client gọi tus.
 * (EN: Bootstrap the NestJS app — port read from ConfigService, CORS enabled for HTML client to call tus.)
 */
async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule)
    app.enableCors({
        origin: true,
        // preflightContinue: forward OPTIONS xuống tus middleware để nó tự trả Tus-Version/Tus-Extension.
        // (EN: preflightContinue: forward OPTIONS down to the tus middleware so it can return Tus-Version/Tus-Extension itself.)
        preflightContinue: true,
        exposedHeaders: [
            "Upload-Offset",
            "Upload-Length",
            "Tus-Resumable",
            "Tus-Version",
            "Tus-Extension",
            "Tus-Max-Size",
            "Location",
            "Upload-Metadata",
        ],
    })
    const configService = app.get(ConfigService)
    const port = configService.get<number>("PORT") ?? 3370
    await app.listen(port)
    // eslint-disable-next-line no-console
    console.log(`[bootstrap] tus backend listening on http://localhost:${port}`)
}

void bootstrap()
