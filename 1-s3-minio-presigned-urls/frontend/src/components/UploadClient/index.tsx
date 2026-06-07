import { useCallback, useState } from "react"
import useSWRMutation from "swr/mutation"
import { Button, Chip, Spinner } from "@heroui/react"
import { UploadIcon, DownloadIcon } from "../ui"
import { FileDropzone } from "./FileDropzone"
import {
    requestPresignPut,
    requestPresignGet,
    putFileToMinIO,
    type PresignPutResponse,
    type PresignGetResponse,
} from "../../lib/api"

/**
 * UploadClient — the shared single-client upload UI.
 *
 * Implements the full presigned URL flow:
 *   1. POST /presign/put → receive signed PUT URL + key
 *   2. PUT file directly to MinIO using the signed URL
 *   3. GET /presign/get/:key → receive signed GET URL → render download link
 *
 * data-testid contract (must match .playwright/scripts/*.spec.ts exactly):
 *   file-input      — hidden input inside FileDropzone
 *   upload-btn      — button that starts the upload flow
 *   upload-status   — status chip: "idle" | "uploading" | "success" | "error"
 *   presign-key     — span showing the object key after successful upload
 *   download-link   — <a> href pointing to the presigned GET URL
 *   error-msg       — span showing the error message on failure
 */
export function UploadClient(): JSX.Element {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    // Status of the full upload flow.
    const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
    const [errorMsg, setErrorMsg] = useState<string>("")
    const [presignKey, setPresignKey] = useState<string>("")
    const [downloadUrl, setDownloadUrl] = useState<string>("")
    // Intermediate results shown during the upload for transparency.
    const [putInfo, setPutInfo] = useState<PresignPutResponse | null>(null)
    const [etag, setEtag] = useState<string>("")
    const [getInfo, setGetInfo] = useState<PresignGetResponse | null>(null)

    const onFileSelect = useCallback((file: File | null): void => {
        setSelectedFile(file)
        setStatus("idle")
        setErrorMsg("")
        setPresignKey("")
        setDownloadUrl("")
        setPutInfo(null)
        setEtag("")
        setGetInfo(null)
    }, [])

    /**
     * useSWRMutation for the upload flow — keeps `isMutating` in sync so
     * the button can show a spinner while the flow is in progress.
     */
    const { trigger, isMutating } = useSWRMutation(
        "upload-flow",
        async () => {
            if (!selectedFile) throw new Error("No file selected.")

            setStatus("uploading")
            setErrorMsg("")
            setPresignKey("")
            setDownloadUrl("")
            setPutInfo(null)
            setEtag("")
            setGetInfo(null)

            // Step 1: request presigned PUT URL from backend.
            const put = await requestPresignPut(
                selectedFile.name,
                selectedFile.type || "application/octet-stream",
            )
            setPutInfo(put)
            setPresignKey(put.key)

            // Step 2: PUT file directly to MinIO — NestJS not involved.
            const tag = await putFileToMinIO(put.url, selectedFile)
            setEtag(tag)

            // Step 3: request presigned GET URL for the uploaded object.
            const get = await requestPresignGet(put.key)
            setGetInfo(get)
            setDownloadUrl(get.url)

            setStatus("success")
        },
        {
            onError: (err: unknown) => {
                const msg = err instanceof Error ? err.message : String(err)
                setErrorMsg(msg)
                setStatus("error")
            },
        },
    )

    /** Map upload flow status to HeroUI Chip color + background (matches L0 layout). */
    const chipColor = (
        s: typeof status,
    ): {
        textColor: "default" | "success" | "danger" | "warning"
        bgClass: string
    } => {
        if (s === "success") return { textColor: "success", bgClass: "bg-success/20" }
        if (s === "error") return { textColor: "danger", bgClass: "bg-danger/20" }
        if (s === "uploading") return { textColor: "warning", bgClass: "bg-warning/20" }
        return { textColor: "default", bgClass: "bg-muted/20" }
    }

    const canUpload = selectedFile !== null && !isMutating

    return (
        <div className="flex flex-col">
            {/* Status chip — top of form, same as L0 multer demo */}
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Upload Status</span>
                <Chip
                    data-testid="upload-status"
                    color={chipColor(status).textColor}
                    size="sm"
                    className={`w-fit capitalize ${chipColor(status).bgClass}`}
                >
                    {status}
                </Chip>
            </div>

            <div className="h-6" />

            <FileDropzone
                file={selectedFile}
                onFileSelect={onFileSelect}
            />
            {selectedFile && (
                <p className="mt-1.5 text-xs text-muted">
                    {selectedFile.name} — {selectedFile.type || "unknown MIME"}
                </p>
            )}

            <div className="h-6" />

            {/* Upload button */}
            <Button
                data-testid="upload-btn"
                variant="primary"
                isDisabled={!canUpload}
                onPress={() => void trigger()}
            >
                <span className="flex items-center gap-2">
                    {isMutating ? (
                        <Spinner size="sm" color="current" />
                    ) : (
                        <UploadIcon />
                    )}
                    {isMutating ? "Uploading…" : "Upload via presigned URL"}
                </span>
            </Button>

            {/* Error message */}
            {status === "error" && errorMsg && (
                <>
                    <div className="h-3" />
                    <span data-testid="error-msg" className="text-sm text-danger">
                        {errorMsg}
                    </span>
                </>
            )}

            {/* Results after successful upload */}
            {status === "success" && (
                <>
                    <div className="h-6" />

                    {/* Step 1 result — presigned PUT info */}
                    {putInfo && (
                        <div className="text-sm">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Step 1 — Presigned PUT URL received
                            </div>
                            <div className="h-2" />
                            <div className="text-foreground">
                                <span className="text-muted">Key: </span>
                                <span data-testid="presign-key" className="font-mono break-all">
                                    {presignKey}
                                </span>
                            </div>
                            <div className="h-1.5" />
                            <div className="text-foreground">
                                <span className="text-muted">Expires: </span>
                                {putInfo.expiresInSeconds}s
                            </div>
                        </div>
                    )}

                    <div className="h-4" />

                    {/* Step 2 result — MinIO PUT */}
                    {etag && (
                        <div className="text-sm">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Step 2 — MinIO PUT complete (NestJS not involved)
                            </div>
                            <div className="h-2" />
                            <div className="text-foreground">
                                <span className="text-muted">ETag: </span>
                                <span className="font-mono">{etag}</span>
                            </div>
                        </div>
                    )}

                    <div className="h-3" />

                    {/* Step 3 result — presigned GET URL */}
                    {getInfo && downloadUrl && (
                        <div className="text-sm">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Step 3 — Presigned GET URL (download)
                            </div>
                            <div className="h-2" />
                            <div className="text-foreground">
                                <span className="text-muted">Expires: </span>
                                {getInfo.expiresInSeconds}s
                            </div>
                            <div className="h-2" />
                            <a
                                data-testid="download-link"
                                href={downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-accent underline underline-offset-2"
                            >
                                <DownloadIcon className="h-3.5 w-3.5" />
                                Download object from MinIO
                            </a>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
