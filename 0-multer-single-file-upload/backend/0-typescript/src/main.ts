import { Logger } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { MulterExceptionFilter } from "./common"

/**
 * Bootstrap — runs NestJS HTTP server, port read from env (default 3000).
 * Bind to 127.0.0.1 to avoid Windows Firewall prompts on non-loopback addresses.
 */
async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule)
    app.enableCors()
    app.useGlobalFilters(new MulterExceptionFilter())
    const port = Number(process.env.PORT ?? 3000)
    await app.listen(port, "127.0.0.1")
    Logger.log(`App listening on http://127.0.0.1:${port}`, "Bootstrap")
}

void bootstrap()
