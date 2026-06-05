import {
    Body,
    Controller,
    Get,
    HttpCode,
    Param,
    Patch,
    Post,
    Query,
    Req,
} from "@nestjs/common"
import type {
    Request,
} from "express"
import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
} from "class-validator"
import {
    UploadService,
} from "./upload.service"
import type {
    FinalizeResponse,
    InitSessionResponse,
    SessionStatusResponse,
} from "./upload.types"

/**
 * Body của POST /uploads/init — filename hiển thị + size để server tính `totalChunks`.
 * (EN: Body of POST /uploads/init — display filename + size so the server can compute `totalChunks`.)
 */
export class InitSessionDto {
    @IsString()
    @IsNotEmpty()
    filename!: string

    @IsInt()
    @Min(1)
    size!: number

    @IsOptional()
    @IsInt()
    @Min(1)
    chunkSize?: number
}

/**
 * Controller chunked upload — init / status / patch chunk / finalize.
 * (EN: Chunked upload controller — init / status / patch chunk / finalize.)
 */
@Controller("uploads")
export class UploadController {
    public constructor(private readonly uploadService: UploadService) {}

    /**
     * Tạo session mới — trả `sessionId` + `totalChunks` để client lên kế hoạch PATCH.
     * (EN: Create a new session — return `sessionId` + `totalChunks` so the client can plan PATCHes.)
     */
    @Post("init")
    @HttpCode(201)
    public async init(@Body() body: InitSessionDto): Promise<InitSessionResponse> {
        return this.uploadService.initSession(body.filename, body.size, body.chunkSize)
    }

    /**
     * Trả status + bitmap để client biết chunk nào skip khi resume.
     * (EN: Return status + bitmap so the client knows which chunks to skip on resume.)
     */
    @Get(":id/status")
    public status(@Param("id") id: string): SessionStatusResponse {
        return this.uploadService.getStatus(id)
    }

    /**
     * Đọc raw body chunk N rồi ghi xuống `<tmp>/<uploadId>/<N>.part`.
     * (EN: Drain raw chunk N body and write to `<tmp>/<uploadId>/<N>.part`.)
     */
    @Patch(":id/chunks")
    @HttpCode(204)
    public async patchChunk(
        @Param("id") id: string,
        @Query("index") index: string,
        @Req() req: Request,
    ): Promise<void> {
        const buffer = await this.readBody(req)
        await this.uploadService.writeChunk(id, parseInt(index, 10), buffer)
    }

    /**
     * Merge mọi chunk theo thứ tự + tính SHA-256 + xoá tmp folder.
     * (EN: Merge every chunk in order, compute SHA-256, then remove the tmp folder.)
     */
    @Post(":id/finalize")
    @HttpCode(200)
    public async finalize(@Param("id") id: string): Promise<FinalizeResponse> {
        return this.uploadService.finalize(id)
    }

    /**
     * Drain `req` stream thành Buffer — KHÔNG dùng bodyParser cho route này để giữ raw bytes.
     * (EN: Drain the `req` stream into a Buffer — body parser is disabled on this route to keep raw bytes.)
     */
    private async readBody(req: Request): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = []
            req.on("data", (chunk: Buffer | string) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
            })
            req.on("end", () => resolve(Buffer.concat(chunks)))
            req.on("error", reject)
        })
    }
}
