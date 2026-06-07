/** MIME types allowed by the backend Multer fileFilter (display hint only — validation is server-side). */
export const UPLOAD_ALLOWED_MIMES = [
    "image/jpeg",
    "image/png",
    "image/webp",
] as const

/** Max upload size in bytes (5 MB) — enforced server-side by Multer limits. */
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024
