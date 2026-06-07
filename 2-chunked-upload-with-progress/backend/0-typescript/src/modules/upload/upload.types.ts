/**
 * Trạng thái 1 upload session — chunkSize + totalChunks fix khi init, receivedChunks growing theo PATCH.
 * (EN: State of a single upload session — chunkSize + totalChunks fixed at init, receivedChunks grows per PATCH.)
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
 * Phản hồi của POST /uploads/init — client dùng `sessionId` cho mọi request tiếp theo.
 * (EN: Response of POST /uploads/init — client uses `sessionId` for every following request.)
 */
export interface InitSessionResponse {
    sessionId: string
    totalChunks: number
    chunkSize: number
}

/**
 * Phản hồi của GET /uploads/:id/status — bitmap chunk đã nhận để client biết chunk nào skip.
 * (EN: Response of GET /uploads/:id/status — received-chunk bitmap so client knows which chunks to skip.)
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
 * Phản hồi của POST /uploads/:id/finalize — đầy đủ metadata file đã merge.
 * (EN: Response of POST /uploads/:id/finalize — full metadata of the merged file.)
 */
export interface FinalizeResponse {
    filename: string
    size: number
    sha256: string
    path: string
}
