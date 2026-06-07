/**
 * Base URL for the backend API.
 * In the embedded sandbox, VITE_API_BASE is string-replaced with the mock session URL.
 * Locally, falls back to http://127.0.0.1:3000 (the backend binds IPv4 127.0.0.1
 * only, so "localhost" would risk resolving to IPv6 ::1 and missing it).
 */
export const API_BASE = new URL(
    import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:3000",
).origin

/**
 * Response of POST /uploads/init — server computes totalChunks from size/chunkSize.
 */
export interface InitResp {
    sessionId: string
    totalChunks: number
    chunkSize: number
}

/**
 * Response of GET /uploads/:id/status — received/missing bitmaps for resume.
 */
export interface StatusResp {
    sessionId: string
    totalChunks: number
    chunkSize: number
    received: number[]
    missing: number[]
    finalized: boolean
}

/**
 * Response of POST /uploads/:id/finalize — assembled file metadata.
 */
export interface FinalizeResp {
    filename: string
    size: number
    sha256: string
    path: string
}

/** POST /uploads/init — create a new upload session. */
export async function initSession(filename: string, size: number): Promise<InitResp> {
    const res = await fetch(`${API_BASE}/uploads/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, size }),
    })
    if (!res.ok) throw new Error(`init failed — HTTP ${res.status}`)
    return res.json() as Promise<InitResp>
}

/** GET /uploads/:id/status — get received/missing bitmaps. */
export async function getStatus(sessionId: string): Promise<StatusResp> {
    const res = await fetch(`${API_BASE}/uploads/${sessionId}/status`)
    if (!res.ok) throw new Error(`status failed — HTTP ${res.status}`)
    return res.json() as Promise<StatusResp>
}

/** POST /uploads/:id/finalize — assemble chunks and compute SHA-256. */
export async function finalizeUpload(sessionId: string): Promise<FinalizeResp> {
    const res = await fetch(`${API_BASE}/uploads/${sessionId}/finalize`, { method: "POST" })
    if (!res.ok) throw new Error(`finalize failed — HTTP ${res.status}`)
    return res.json() as Promise<FinalizeResp>
}

/**
 * PATCH /uploads/:id/chunks?index=N — upload a single raw-binary chunk.
 * Uses XHR so upload.onprogress delivers per-chunk byte progress.
 */
export function patchChunk(
    sessionId: string,
    index: number,
    blob: Blob,
    onProgress?: (pct: number) => void,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("PATCH", `${API_BASE}/uploads/${sessionId}/chunks?index=${index}`)
        xhr.setRequestHeader("Content-Type", "application/octet-stream")

        if (onProgress) {
            xhr.upload.onprogress = (e): void => {
                if (e.lengthComputable) {
                    onProgress(Math.round((e.loaded / e.total) * 100))
                }
            }
        }

        xhr.onload = (): void => {
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress?.(100)
                resolve()
            } else {
                reject(new Error(`chunk ${index} — HTTP ${xhr.status}`))
            }
        }
        xhr.onerror = (): void => reject(new Error(`chunk ${index} — network error`))
        xhr.onabort = (): void => reject(new Error(`chunk ${index} — aborted`))
        xhr.send(blob)
    })
}
