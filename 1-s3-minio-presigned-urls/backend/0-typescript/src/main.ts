import "reflect-metadata"
import {
    NestFactory,
} from "@nestjs/core"
import {
    ValidationPipe,
} from "@nestjs/common"
import {
    ConfigService,
} from "@nestjs/config"
import {
    AppModule,
} from "./app.module"

/**
 * Bootstrap the NestJS app — port read from ConfigService, CORS enabled for FE callers.
 */
async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule)
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    )
    app.enableCors()
    const configService = app.get(ConfigService)
    const port = configService.get<number>("PORT") ?? 3000
    // Bind to 127.0.0.1 (loopback only) — prevents Windows Firewall "Allow access" popup.
    await app.listen(port, "127.0.0.1")
    // eslint-disable-next-line no-console
    console.log(`[bootstrap] backend listening on http://127.0.0.1:${port}`)
}

void bootstrap()
