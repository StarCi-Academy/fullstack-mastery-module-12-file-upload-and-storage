import { useRef, useState } from "react"
import { Button, Chip, Spinner } from "@heroui/react"
import useSWRMutation from "swr/mutation"
import { UPLOAD_PATH, type UploadedFileInfo, type UploadErrorBody } from "../../lib"

// ---- upload status type -------------------------------------------------------
type UploadStatus = "idle" | "uploading" | "success" | "error"

// ---- SWR mutation fetcher -------------------------------------------------------

/** POST FormData to the upload endpoint, returns the parsed JSON body + status. */
async function postFile(
    _key: string,
    { arg }: { arg: File }
): Promise<{ status: number; body: UploadedFileInfo | UploadErrorBody }> {
    const form = new FormData()
    // Field name MUST match FileInterceptor("file") in upload.controller.ts.
    form.append("file", arg)
    const res = await fetch(UPLOAD_PATH, { method: "POST", body: form })
    const body = await res.json()
    return { status: res.status, body }
}

// ---- format helper -------------------------------------------------------

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// ---- UploadClient component -------------------------------------------------------

/**
 * UploadClient — the shared upload UI used by BOTH Local (single client) and Sandbox.
 * Exposes the exact `data-testid`s the Playwright specs assert:
 *   - `file-input`      : the hidden file input element
 *   - `upload-btn`      : the Upload button
 *   - `upload-status`   : Chip showing idle / uploading / success / error
 *   - `result-meta`     : container with originalName, filename, size, mimetype, path
 *   - `error-msg`       : container with HTTP status code + error message
 */
export function UploadClient(): JSX.Element {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle")
    const [result, setResult] = useState<UploadedFileInfo | null>(null)
    const [errorCode, setErrorCode] = useState<number | null>(null)
    const [errorMsg, setErrorMsg] = useState<string>("")

    const { trigger, isMutating } = useSWRMutation(UPLOAD_PATH, postFile)

    // Map UploadStatus to HeroUI Chip color.
    const chipColor = (
        s: UploadStatus
    ): "default" | "success" | "danger" | "warning" => {
        if (s === "success") return "success"
        if (s === "error") return "danger"
        if (s === "uploading") return "warning"
        return "default"
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
        const file = e.target.files?.[0] ?? null
        setSelectedFile(file)
        // Reset previous results when a new file is chosen.
        setUploadStatus("idle")
        setResult(null)
        setErrorCode(null)
        setErrorMsg("")
    }

    async function handleUpload(): Promise<void> {
        if (!selectedFile || isMutating) return
        setUploadStatus("uploading")
        setResult(null)
        setErrorCode(null)
        setErrorMsg("")

        try {
            const { status, body } = await trigger(selectedFile)
            if (status === 201) {
                setResult(body as UploadedFileInfo)
                setUploadStatus("success")
            } else {
                const err = body as UploadErrorBody
                setErrorCode(status)
                setErrorMsg(err.message ?? `HTTP ${status}`)
                setUploadStatus("error")
            }
        } catch (err) {
            // Network-level failure (backend not running, etc.).
            setErrorCode(null)
            setErrorMsg(
                err instanceof Error
                    ? err.message
                    : "Network error — is the backend running?"
            )
            setUploadStatus("error")
        }
    }

    function handleReset(): void {
        setSelectedFile(null)
        setUploadStatus("idle")
        setResult(null)
        setErrorCode(null)
        setErrorMsg("")
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const canUpload = selectedFile !== null && !isMutating

    return (
        <div className="flex flex-col">
            {/* Status chip */}
            <Chip
                data-testid="upload-status"
                variant="soft"
                color={chipColor(uploadStatus)}
                className="capitalize"
            >
                {uploadStatus}
            </Chip>

            <div className="h-6" />

            {/* File picker */}
            <label className="text-sm font-medium text-foreground">File</label>
            <div className="h-1.5" />
            <input
                data-testid="file-input"
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="block w-full text-sm text-foreground file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-default-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-default-200"
            />
            {selectedFile && (
                <p className="mt-1.5 text-xs text-muted">
                    {selectedFile.name} — {formatBytes(selectedFile.size)} — {selectedFile.type || "unknown MIME"}
                </p>
            )}

            <div className="h-6" />

            {/* Action buttons */}
            <div className="flex gap-3">
                <Button
                    data-testid="upload-btn"
                    variant="primary"
                    isDisabled={!canUpload}
                    onPress={handleUpload}
                >
                    <span className="flex items-center gap-2">
                        {isMutating && <Spinner size="sm" color="current" />}
                        Upload
                    </span>
                </Button>
                <Button variant="secondary" onPress={handleReset}>
                    Reset
                </Button>
            </div>

            {/* Success result */}
            {uploadStatus === "success" && result && (
                <>
                    <div className="h-6" />
                    <div
                        data-testid="result-meta"
                        className="rounded-2xl border border-border bg-content1 p-4 text-sm"
                    >
                        <p className="mb-3 font-medium text-foreground">
                            201 Created — upload successful
                        </p>
                        <div className="flex flex-col gap-2">
                            <Row label="originalName" value={result.originalName} />
                            <Row label="filename" value={result.filename} />
                            <Row label="size" value={`${result.size} B (${formatBytes(result.size)})`} />
                            <Row label="mimetype" value={result.mimetype} />
                            <Row label="path" value={result.path} />
                        </div>
                    </div>
                </>
            )}

            {/* Error result */}
            {uploadStatus === "error" && (
                <>
                    <div className="h-6" />
                    <div
                        data-testid="error-msg"
                        className="rounded-2xl border border-border bg-content1 p-4 text-sm"
                    >
                        <p className="mb-1 font-medium text-danger">
                            {errorCode !== null ? `${errorCode} Error` : "Network Error"}
                        </p>
                        <p className="text-foreground">{errorMsg}</p>
                    </div>
                </>
            )}
        </div>
    )
}

/** Single metadata row — label + value. */
function Row({ label, value }: { label: string; value: string }): JSX.Element {
    return (
        <div className="flex gap-2">
            <span className="w-32 shrink-0 font-medium text-muted">{label}</span>
            <span className="break-all text-foreground">{value}</span>
        </div>
    )
}
