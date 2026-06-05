import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common"
import type { Response } from "express"
import { MulterError } from "multer"

/**
 * Map MulterError → HTTP response code:
 * - LIMIT_FILE_SIZE  → 413 Payload Too Large.
 * - others           → 400 Bad Request.
 * (EN: Map MulterError → HTTP status; LIMIT_FILE_SIZE → 413, others → 400.)
 */
@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
    public catch(exception: MulterError, host: ArgumentsHost): void {
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>()
        if (exception.code === "LIMIT_FILE_SIZE") {
            response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
                statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
                message: "File too large",
            })
            return
        }
        response.status(HttpStatus.BAD_REQUEST).json({
            statusCode: HttpStatus.BAD_REQUEST,
            message: exception.message,
        })
    }
}
