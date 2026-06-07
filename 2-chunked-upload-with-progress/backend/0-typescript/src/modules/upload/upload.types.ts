/**
 * State of a single upload session — chunkSize + totalChunks fixed at init, receivedChunks grows per PATCH.
 */
export interface UploadSession {
    id: string
    filename: string
    size: number
    chunkSize: number
    totalChunks: number
    receivedChunks: number[]
    createdAt: number
    finalized: boolean
}

/**
 * Response of POST /uploads/init — client uses `sessionId` for every following request.
 */
export interface InitSessionResponse {
    sessionId: string
    totalChunks: number
    chunkSize: number
}

/**
 * Response of GET /uploads/:id/status — received-chunk bitmap so client knows which chunks to skip.
 */
export interface SessionStatusResponse {
    sessionId: string
    totalChunks: number
    chunkSize: number
    received: number[]
    missing: number[]
    finalized: boolean
}

/**
 * Response of POST /uploads/:id/finalize — full metadata of the merged file.
 */
export interface FinalizeResponse {
    filename: string
    size: number
    sha256: string
    path: string
}
