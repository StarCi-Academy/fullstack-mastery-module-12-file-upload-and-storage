import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
} from "@nestjs/common"
import {
    ConfigService,
} from "@nestjs/config"
import {
    createReadStream,
    createWriteStream,
    promises as fs,
} from "node:fs"
import {
    join,
} from "node:path"
import {
    createHash,
    randomUUID,
} from "node:crypto"
import {
    UPLOAD_CONFIG_TOKEN,
    type UploadConfigShape,
} from "../../config"
import type {
    UploadSession,
    InitSessionResponse,
    SessionStatusResponse,
    FinalizeResponse,
} from "./upload.types"

/**
 * UploadService — quản lý chunked upload session in-memory + ghi/đọc chunk file xuống disk.
 * (EN: UploadService — manages chunked upload sessions in-memory plus writes/reads chunk files to disk.)
 */
@Injectable()
export class UploadService {
    private readonly logger = new Logger(UploadService.name)
    private readonly cfg: UploadConfigShape
    private readonly sessions = new Map<string, UploadSession>()

    public constructor(configService: ConfigService) {
        this.cfg = configService.getOrThrow<UploadConfigShape>(UPLOAD_CONFIG_TOKEN)
    }

    /**
     * Tạo session mới — totalChunks = ceil(size / chunkSize), persist tmp folder ngay.
     * (EN: Create a new session — totalChunks = ceil(size / chunkSize), persist the tmp folder immediately.)
     */
    public async initSession(
        filename: string,
        size: number,
        chunkSize?: number,
    ): Promise<InitSessionResponse> {
        if (size <= 0 || size > this.cfg.maxFileBytes) {
            throw new BadRequestException(`Invalid size: must be 1..${this.cfg.maxFileBytes}`)
        }
        const effectiveChunkSize = chunkSize && chunkSize > 0 ? chunkSize : this.cfg.chunkSizeBytes
        const totalChunks = Math.ceil(size / effectiveChunkSize)
        const id = randomUUID()
        const session: UploadSession = {
            id,
            filename,
            size,
            chunkSize: effectiveChunkSize,
            totalChunks,
            receivedChunks: [],
            createdAt: Date.now(),
            finalized: false,
        }
        this.sessions.set(id, session)
        await fs.mkdir(join(this.cfg.tmpDir, id), { recursive: true })
        this.logger.log(`init session ${id} total=${totalChunks}`)
        return { sessionId: id, totalChunks, chunkSize: effectiveChunkSize }
    }

    /**
     * Ghi 1 chunk vào `<tmp>/<id>/<n>.part`. Idempotent — gọi lại cùng index ghi đè.
     * (EN: Write a single chunk to `<tmp>/<id>/<n>.part`. Idempotent — recalling the same index overwrites.)
     */
    public async writeChunk(id: string, index: number, buffer: Buffer): Promise<void> {
        const session = this.requireSession(id)
        if (!Number.isInteger(index) || index < 0 || index >= session.totalChunks) {
            throw new BadRequestException(`Chunk index ${index} out of range [0, ${session.totalChunks})`)
        }
        const path = join(this.cfg.tmpDir, id, `${index}.part`)
        await fs.writeFile(path, buffer)
        if (!session.receivedChunks.includes(index)) {
            session.receivedChunks.push(index)
            session.receivedChunks.sort((a, b) => a - b)
        }
        this.logger.log(`received chunk ${index}/${session.totalChunks} (${buffer.length}B)`)
    }

    /**
     * Trả về status + bitmap để client biết chunk nào còn thiếu khi resume.
     * (EN: Return status + bitmap so the client knows which chunks are still missing on resume.)
     */
    public getStatus(id: string): SessionStatusResponse {
        const session = this.requireSession(id)
        const received = [...session.receivedChunks]
        const missing: number[] = []
        for (let i = 0; i < session.totalChunks; i++) {
            if (!session.receivedChunks.includes(i)) missing.push(i)
        }
        return {
            sessionId: session.id,
            totalChunks: session.totalChunks,
            chunkSize: session.chunkSize,
            received,
            missing,
            finalized: session.finalized,
        }
    }

    /**
     * Merge mọi chunk theo thứ tự + tính SHA-256 cùng pass + cleanup tmp folder.
     * (EN: Merge every chunk in order, compute SHA-256 in the same pass, then clean up the tmp folder.)
     */
    public async finalize(id: string): Promise<FinalizeResponse> {
        const session = this.requireSession(id)
        // Đảm bảo đủ chunk trước khi merge.
        // (EN: Ensure all chunks present before merging.)
        if (session.receivedChunks.length !== session.totalChunks) {
            throw new BadRequestException(
                `Missing chunks: ${session.totalChunks - session.receivedChunks.length}`,
            )
        }
        await fs.mkdir(this.cfg.finalDir, { recursive: true })
        const finalPath = join(this.cfg.finalDir, `${id}-${session.filename}`)
        const out = createWriteStream(finalPath)
        const hash = createHash("sha256")
        let size = 0
        for (let i = 0; i < session.totalChunks; i++) {
            const rs = createReadStream(join(this.cfg.tmpDir, id, `${i}.part`))
            // Stream-concat theo đúng thứ tự + tính SHA-256 đồng thời.
            // (EN: Stream-concatenate in order and compute SHA-256 in the same pass.)
            await new Promise<void>((resolve, reject) => {
                rs.on("data", (chunk: Buffer | string) => {
                    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
                    hash.update(buf)
                    size += buf.length
                })
                rs.on("end", () => resolve())
                rs.on("error", reject)
                rs.pipe(out, { end: false })
            })
        }
        await new Promise<void>((resolve, reject) => {
            out.end(() => resolve())
            out.on("error", reject)
        })
        await fs.rm(join(this.cfg.tmpDir, id), { recursive: true, force: true })
        session.finalized = true
        const sha256 = hash.digest("hex")
        this.logger.log(`finalized -> ${finalPath}`)
        return { filename: session.filename, size, sha256, path: finalPath }
    }

    /**
     * Throw 404 nếu session không tồn tại — wrap cho mọi handler dùng id.
     * (EN: Throw 404 when the session does not exist — wrapper for every handler using id.)
     */
    private requireSession(id: string): UploadSession {
        const session = this.sessions.get(id)
        if (!session) throw new NotFoundException(`Upload session ${id} not found`)
        return session
    }
}
