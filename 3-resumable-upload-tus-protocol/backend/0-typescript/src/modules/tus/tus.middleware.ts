import {
    Injectable,
    NestMiddleware,
    OnModuleInit,
    Logger,
} from "@nestjs/common"
import {
    ConfigService,
} from "@nestjs/config"
import {
    Request,
    Response,
    NextFunction,
} from "express"
import {
    Server,
} from "@tus/server"
import {
    FileStore,
} from "@tus/file-store"
import * as fs from "node:fs/promises"
import {
    TUS_CONFIG_TOKEN,
    type TusConfigShape,
} from "../../config"

/**
 * Middleware forwarding requests to @tus/server — the Server handles HEAD/PATCH/POST/OPTIONS itself.
 */
@Injectable()
export class TusMiddleware implements NestMiddleware, OnModuleInit {
    private readonly logger = new Logger(TusMiddleware.name)
    private server!: Server

    constructor(private readonly config: ConfigService) {}

    async onModuleInit(): Promise<void> {
        const cfg = this.config.get<TusConfigShape>(TUS_CONFIG_TOKEN)!
        // Ensure the upload directory exists before tus Server starts.
        await fs.mkdir(cfg.directory, { recursive: true })
        // Boot tus Server with FileStore — datastore tracks per-upload offset
        // in a .json sidecar file alongside the upload bytes.
        this.server = new Server({
            path: cfg.path,
            datastore: new FileStore({ directory: cfg.directory }),
        })
        this.logger.log(`tus server mounted at ${cfg.path} (storage: ${cfg.directory})`)
    }

    use(req: Request, res: Response, _next: NextFunction): void {
        // Forward request to tus Server — it owns HEAD/PATCH/POST/OPTIONS.
        // Passing raw req/res bypasses NestJS body parsing so tus can read
        // the binary PATCH stream directly from the Node.js socket.
        this.server.handle(req, res)
    }
}
