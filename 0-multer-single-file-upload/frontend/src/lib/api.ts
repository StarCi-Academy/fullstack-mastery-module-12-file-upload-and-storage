/**
 * Backend API base — resolves origin from VITE_API_BASE env var.
 * In the sandbox the platform string-replaces it with the mock session URL.
 * In local dev / Playwright, omit VITE_API_BASE and POST to `/upload` so Vite proxies to the NestJS port.
 */
export const API_ORIGIN = import.meta.env.VITE_API_BASE
    ? new URL(import.meta.env.VITE_API_BASE).origin
    : ""

/** Upload endpoint — relative in dev (Vite proxy); absolute when VITE_API_BASE is set (sandbox). */
export const UPLOAD_PATH = API_ORIGIN ? `${API_ORIGIN}/upload` : "/upload"

/** Shape returned by the backend on a successful 201 response. */
export interface UploadedFileInfo {
    originalName: string
    filename: string
    size: number
    mimetype: string
    path: string
}

/** Error body shape returned by NestJS + MulterExceptionFilter. */
export interface UploadErrorBody {
    statusCode: number
    message: string
    error?: string
}
