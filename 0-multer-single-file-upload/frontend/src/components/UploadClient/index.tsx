import { useCallback, useState } from "react"
import { Button, Chip, Label, Spinner, Typography } from "@heroui/react"
import useSWRMutation from "swr/mutation"
import { UPLOAD_PATH, type UploadedFileInfo, type UploadErrorBody } from "../../lib"
import { FileDropzone } from "./FileDropzone"

// ---- upload status type -------------------------------------------------------
type UploadStatus = "idle" | "uploading" | "success" | "error"

// ---- SWR mutation fetcher -------------------------------------------------------

/** POST FormData to the upload endpoint, returns the parsed JSON body + status. */
const postFile = async (_key: string, { arg }: { arg: File }): Promise<{ status: number; body: UploadedFileInfo | UploadErrorBody }> => {
    const form = new FormData()
    // Field name MUST match FileInterceptor("file") in upload.controller.ts.
    form.append("file", arg)
    const res = await fetch(UPLOAD_PATH, { method: "POST", body: form })
    const body = await res.json()
    return { status: res.status, body }
}

// ---- format helper -------------------------------------------------------

const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// ---- UploadClient component -------------------------------------------------------

/**
 * UploadClient — the shared upload UI used by BOTH Local (single client) and Sandbox.
 * Exposes the exact `data-testid`s the Playwright specs assert:
 *   - `file-input`      : the hidden file input element (inside FileDropzone)
 *   - `upload-btn`      : the Upload button
 *   - `upload-status`   : Chip showing idle / uploading / success / error
 *   - `result-meta`     : container with originalName, filename, size, mimetype, path
 *   - `error-msg`       : container with HTTP status code + error message
 */
export const UploadClient = (): JSX.Element => {
    const [dropzoneKey, setDropzoneKey] = useState(0)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle")
    const [result, setResult] = useState<UploadedFileInfo | null>(null)
    const [errorCode, setErrorCode] = useState<number | null>(null)
    const [errorMsg, setErrorMsg] = useState<string>("")

    const { trigger, isMutating } = useSWRMutation(UPLOAD_PATH, postFile)

    // Map UploadStatus to HeroUI Chip color.
    const chipColor = (
        s: UploadStatus
    ): {
        textColor: "default" | "success" | "danger" | "warning" 
        bgClass: string
    } => {
        if (s === "success") return { textColor: "success", bgClass: "bg-success/20" }
        if (s === "error") return { textColor: "danger", bgClass: "bg-danger/20" }
        if (s === "uploading") return { textColor: "warning", bgClass: "bg-warning/20" }
        return { textColor: "default", bgClass: "bg-muted/20" }
    }

    const onFileSelect = useCallback((file: File | null): void => {
        setSelectedFile(file)
        // Reset previous results when a new file is chosen.
        setUploadStatus("idle")
        setResult(null)
        setErrorCode(null)
        setErrorMsg("")
    }, [])

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
        setDropzoneKey((key) => key + 1)
    }

    const canUpload = selectedFile !== null && !isMutating

    return (
        <div className="flex flex-col gap-6">
            {/* Status chip */}
            <div className="flex items-center gap-2">
                <Label>Upload Status</Label>
                <Chip
                    data-testid="upload-status"
                    color={chipColor(uploadStatus).textColor}
                    size="sm"
                    className={`w-fit capitalize ${chipColor(uploadStatus).bgClass}`}
                >
                    {uploadStatus}
                </Chip>
            </div>

            <div className="flex flex-col gap-3">
                <FileDropzone
                    key={dropzoneKey}
                    file={selectedFile}
                    onFileSelect={onFileSelect}
                />
                {selectedFile && (
                    <Typography.Paragraph size="xs" color="muted">
                        {selectedFile.name} — {formatBytes(selectedFile.size)} — {selectedFile.type || "unknown MIME"}
                    </Typography.Paragraph>
                )}

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
                    <Button variant="outline" onPress={handleReset}>
                        Reset
                    </Button>
                </div>
            </div>

            {/* Success result */}
            {uploadStatus === "success" && result && (
                <div data-testid="result-meta" className="flex flex-col gap-3">
                    <Typography.Paragraph size="sm" weight="medium">
                        201 Created — upload successful
                    </Typography.Paragraph>
                    <div className="flex flex-col gap-2">
                        <Row label="originalName" value={result.originalName} />
                        <Row label="filename" value={result.filename} />
                        <Row label="size" value={`${result.size} B (${formatBytes(result.size)})`} />
                        <Row label="mimetype" value={result.mimetype} />
                        <Row label="path" value={result.path} />
                    </div>
                </div>
            )}

            {/* Error result */}
            {uploadStatus === "error" && (
                <div data-testid="error-msg" className="flex flex-col gap-1.5">
                    <Typography.Paragraph size="sm" weight="medium" className="text-danger">
                        {errorCode !== null ? `${errorCode} Error` : "Network Error"}
                    </Typography.Paragraph>
                    <Typography.Paragraph size="sm">{errorMsg}</Typography.Paragraph>
                </div>
            )}
        </div>
    )
}

interface RowProps { label: string; value: string }

const Row = ({ label, value }: RowProps): JSX.Element => {
    return (
        <div className="flex gap-2">
            <Typography.Paragraph size="sm" color="muted" className="w-32 shrink-0 font-medium">
                {label}
            </Typography.Paragraph>
            <Typography.Paragraph size="sm" className="break-all">
                {value}
            </Typography.Paragraph>
        </div>
    )
}
