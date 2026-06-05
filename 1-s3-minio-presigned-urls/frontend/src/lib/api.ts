/**
 * Resolve the backend origin from the VITE_API_BASE env var.
 * In the embedded Sandpack preview the platform string-replaces this with
 * the mock session URL; in cloned-repo dev it falls back to localhost:3000.
 */
export const API_ORIGIN = new URL(
    import.meta.env.VITE_API_BASE ?? "http://localhost:3000",
).origin

/** Shape of the POST /presign/put response from the NestJS backend. */
export interface PresignPutResponse {
    key: string
    url: string
    method: "PUT"
    expiresInSeconds: number
    filename: string
}

/** Shape of the GET /presign/get/:key response. */
export interface PresignGetResponse {
    url: string
    key: string
    expiresInSeconds: number
}

/**
 * Request a short-lived presigned PUT URL from the backend.
 * The backend signs the URL using HMAC-SHA256; the client can then PUT
 * directly to MinIO without going through NestJS.
 */
export async function requestPresignPut(
    filename: string,
    contentType: string,
): Promise<PresignPutResponse> {
    const res = await fetch(`${API_ORIGIN}/presign/put`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, contentType }),
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`POST /presign/put HTTP ${res.status}: ${text}`)
    }
    return res.json() as Promise<PresignPutResponse>
}

/**
 * Request a short-lived presigned GET URL from the backend.
 * The bucket stays private; only the signed URL allows reading the object.
 */
export async function requestPresignGet(key: string): Promise<PresignGetResponse> {
    const encodedKey = encodeURIComponent(key)
    const res = await fetch(`${API_ORIGIN}/presign/get/${encodedKey}`)
    if (!res.ok) {
        const text = await res.text()
        throw new Error(`GET /presign/get/:key HTTP ${res.status}: ${text}`)
    }
    return res.json() as Promise<PresignGetResponse>
}

/**
 * PUT a file directly to MinIO using the presigned URL returned by the backend.
 * NestJS is NOT involved — MinIO validates the HMAC-SHA256 signature itself.
 * Returns the ETag from the MinIO response headers.
 */
export async function putFileToMinIO(
    presignedUrl: string,
    file: File,
): Promise<string> {
    const res = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
    })
    if (!res.ok) {
        const text = await res.text()
        throw new Error(
            `MinIO PUT HTTP ${res.status}: ${text}\n\n` +
                "(If this is a CORS / 'Failed to fetch' error, MinIO needs " +
                "AllowedMethods=[PUT] and AllowedOrigins=[*] on the uploads bucket.)",
        )
    }
    return res.headers.get("etag") ?? "(ETag not exposed — check MinIO CORS headers)"
}
