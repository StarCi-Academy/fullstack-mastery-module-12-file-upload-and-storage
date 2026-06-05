import { useRef, useState } from "react"
import useSWRMutation from "swr/mutation"
import { Button, Chip, Spinner } from "@heroui/react"
import { UploadIcon, DownloadIcon } from "../ui"
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
 *   file-input      — <input type="file"> for selecting a file
 *   upload-btn      — button that starts the upload flow
 *   upload-status   — status chip: "idle" | "uploading" | "success" | "error"
 *   presign-key     — span showing the object key after successful upload
 *   download-link   — <a> href pointing to the presigned GET URL
 *   error-msg       — span showing the error message on failure
 */
export function UploadClient(): JSX.Element {
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Status of the full upload flow.
    const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
    const [errorMsg, setErrorMsg] = useState<string>("")
    const [presignKey, setPresignKey] = useState<string>("")
    const [downloadUrl, setDownloadUrl] = useState<string>("")
    // Intermediate results shown during the upload for transparency.
    const [putInfo, setPutInfo] = useState<PresignPutResponse | null>(null)
    const [etag, setEtag] = useState<string>("")
    const [getInfo, setGetInfo] = useState<PresignGetResponse | null>(null)

    /**
     * useSWRMutation for the upload flow — keeps `isMutating` in sync so
     * the button can show a spinner while the flow is in progress.
     */
    const { trigger, isMutating } = useSWRMutation(
        "upload-flow",
        async () => {
            const file = fileInputRef.current?.files?.[0]
            if (!file) throw new Error("No file selected.")

            setStatus("uploading")
            setErrorMsg("")
            setPresignKey("")
            setDownloadUrl("")
            setPutInfo(null)
            setEtag("")
            setGetInfo(null)

            // Step 1: request presigned PUT URL from backend.
            const put = await requestPresignPut(
                file.name,
                file.type || "application/octet-stream",
            )
            setPutInfo(put)
            setPresignKey(put.key)

            // Step 2: PUT file directly to MinIO — NestJS not involved.
            const tag = await putFileToMinIO(put.url, file)
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

    const statusColor =
        status === "success"
            ? "success"
            : status === "error"
              ? "danger"
              : "default"

    return (
        <div className="rounded-2xl border border-border bg-content1 p-6">
            {/* File picker */}
            <label className="text-sm font-medium text-foreground">
                Select a file
            </label>
            <div className="h-1.5" />
            <input
                data-testid="file-input"
                ref={fileInputRef}
                type="file"
                className="block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-default-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />

            <div className="h-6" />

            {/* Upload button */}
            <Button
                data-testid="upload-btn"
                variant="primary"
                isDisabled={isMutating}
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

            <div className="h-6" />

            {/* Status chip */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Status:</span>
                <Chip
                    data-testid="upload-status"
                    variant="soft"
                    color={statusColor}
                    className="capitalize"
                >
                    {status}
                </Chip>
            </div>

            {/* Error message */}
            {status === "error" && errorMsg && (
                <>
                    <div className="h-3" />
                    <div className="rounded-xl bg-default-100 p-3">
                        <span
                            data-testid="error-msg"
                            className="text-sm text-danger"
                        >
                            {errorMsg}
                        </span>
                    </div>
                </>
            )}

            {/* Results after successful upload */}
            {status === "success" && (
                <>
                    <div className="h-6" />

                    {/* Step 1 result — presigned PUT info */}
                    {putInfo && (
                        <div className="rounded-xl border border-border bg-default-100 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Step 1 — Presigned PUT URL received
                            </div>
                            <div className="h-2" />
                            <div className="text-sm text-foreground">
                                <span className="text-muted">Key: </span>
                                <span data-testid="presign-key" className="font-mono break-all">
                                    {presignKey}
                                </span>
                            </div>
                            <div className="h-1.5" />
                            <div className="text-sm text-foreground">
                                <span className="text-muted">Expires: </span>
                                {putInfo.expiresInSeconds}s
                            </div>
                        </div>
                    )}

                    <div className="h-3" />

                    {/* Step 2 result — MinIO PUT */}
                    {etag && (
                        <div className="rounded-xl border border-border bg-default-100 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Step 2 — MinIO PUT complete (NestJS not involved)
                            </div>
                            <div className="h-2" />
                            <div className="text-sm text-foreground">
                                <span className="text-muted">ETag: </span>
                                <span className="font-mono">{etag}</span>
                            </div>
                        </div>
                    )}

                    <div className="h-3" />

                    {/* Step 3 result — presigned GET URL */}
                    {getInfo && downloadUrl && (
                        <div className="rounded-xl border border-border bg-default-100 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Step 3 — Presigned GET URL (download)
                            </div>
                            <div className="h-2" />
                            <div className="text-sm text-foreground">
                                <span className="text-muted">Expires: </span>
                                {getInfo.expiresInSeconds}s
                            </div>
                            <div className="h-2" />
                            <a
                                data-testid="download-link"
                                href={downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-accent underline underline-offset-2"
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
