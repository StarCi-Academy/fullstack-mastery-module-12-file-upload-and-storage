/**
 * Backend API base — resolves origin from VITE_API_BASE env var.
 * In the sandbox the platform string-replaces it with the mock session URL;
 * in dev / Playwright it falls back to http://localhost:3000.
 */
export const API_ORIGIN = new URL(
    import.meta.env.VITE_API_BASE ?? "http://localhost:3000"
).origin

/** Upload endpoint path — kept separate so specs can reference it. */
export const UPLOAD_PATH = `${API_ORIGIN}/upload`

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
