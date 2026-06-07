/**
 * Metadata returned to the client after a successful upload.
 */
export interface UploadedFileInfo {
    originalName: string
    filename: string
    size: number
    mimetype: string
    path: string
}
