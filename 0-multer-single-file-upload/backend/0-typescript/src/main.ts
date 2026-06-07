import { Logger } from "@nestjs/common"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { MulterExceptionFilter } from "./common"

/**
 * Bootstrap — chạy NestJS HTTP server, port lấy từ env (default 3000).
 * (EN: Bootstrap — runs NestJS HTTP server, port read from env (default 3000).)
 */
async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule)
    app.enableCors()
    app.useGlobalFilters(new MulterExceptionFilter())
    const port = Number(process.env.PORT ?? 3000)
    await app.listen(port)
    Logger.log(`App listening on http://localhost:${port}`, "Bootstrap")
}

void bootstrap()
