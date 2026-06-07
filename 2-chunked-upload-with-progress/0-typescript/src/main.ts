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
 * Khởi động NestJS app — bodyParser tắt để route PATCH nhận raw bytes; CORS enabled cho HTML client.
 * (EN: Bootstrap the NestJS app — bodyParser disabled so PATCH receives raw bytes; CORS enabled for HTML client.)
 */
async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule, { bodyParser: false })
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    )
    app.enableCors()
    // Enable JSON parser CHỈ cho route không phải PATCH chunk (init / finalize).
    // (EN: Enable JSON parser ONLY for non-PATCH-chunk routes (init / finalize).)
    const express = await import("express")
    app.use(express.json({ limit: "1mb" }))
    const configService = app.get(ConfigService)
    const port = configService.get<number>("PORT") ?? 3000
    // Bind to 127.0.0.1 only — avoids Windows Firewall popup triggered by 0.0.0.0 bind.
    await app.listen(port, "127.0.0.1")
    // eslint-disable-next-line no-console
    console.log(`[bootstrap] backend listening on http://localhost:${port}`)
}

void bootstrap()
