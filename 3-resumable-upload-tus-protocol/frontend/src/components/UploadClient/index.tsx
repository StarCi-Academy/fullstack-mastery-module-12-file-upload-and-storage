import { useRef, useState } from "react"
import { Button, Chip } from "@heroui/react"
import * as tus from "tus-js-client"
import { TUS_ENDPOINT } from "../../lib"

/** Upload lifecycle status. */
type UploadStatus = "idle" | "running" | "paused" | "done" | "error"

/**
 * UploadClient — the shared upload UI used by both Local and Sandbox.
 *
 * Exposes data-testids the Playwright specs assert:
 *   file-input      — hidden <input type="file">
 *   start-btn       — starts or resumes the upload
 *   pause-btn       — pauses an in-flight upload
 *   resume-btn      — resumes a paused upload
 *   progress        — text node showing "N%" progress
 *   upload-status   — Chip showing current status word
 *   result          — upload URL shown when done
 *
 * Uses tus-js-client v4 with browser localStorage fingerprint so the learner
 * can pause mid-upload, refresh the page, and click Resume — the library HEADs
 * the server to read Upload-Offset and continues from that byte.
 */
export function UploadClient(): JSX.Element {
    const [file, setFile] = useState<File | null>(null)
    const [status, setStatus] = useState<UploadStatus>("idle")
    const [percent, setPercent] = useState<number>(0)
    const [uploadUrl, setUploadUrl] = useState<string>("")
    const uploadRef = useRef<tus.Upload | null>(null)
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    /** Create a new tus.Upload for the given File and wire all callbacks. */
    function createUpload(f: File): tus.Upload {
        return new tus.Upload(f, {
            endpoint: TUS_ENDPOINT,
            // 2 MB chunks — visible progress on the log for demo files.
            chunkSize: 2 * 1024 * 1024,
            // Auto-retry on transient network errors.
            retryDelays: [0, 1000, 3000, 5000],
            metadata: {
                filename: f.name,
                filetype: f.type || "application/octet-stream",
            },
            // Log each tus HTTP response: status + Upload-Offset so learners can
            // see the server advancing the offset per PATCH.
            onAfterResponse(_req: tus.HttpRequest, res: tus.HttpResponse): void {
                const offset = res.getHeader("Upload-Offset")
                const location = res.getHeader("Location")
                const parts: string[] = [`HTTP ${res.getStatus()}`]
                if (offset) parts.push(`Upload-Offset=${offset}`)
                if (location) parts.push(`Location=${location}`)
                console.log("[tus]", parts.join("  "))
            },
            onProgress(uploaded: number, total: number): void {
                const pct = total > 0 ? Math.round((uploaded / total) * 100) : 0
                setPercent(pct)
            },
            onSuccess(): void {
                const url = (uploadRef.current as unknown as { url?: string })?.url ?? ""
                setUploadUrl(url)
                setStatus("done")
                setPercent(100)
            },
            onError(_err: Error): void {
                // Only mark as error if we did not intentionally abort (pause sets status first).
                setStatus((prev) => (prev === "running" ? "error" : prev))
            },
        })
    }

    /** Handle file picker change — resets all state. */
    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
        const picked = e.target.files?.[0] ?? null
        setFile(picked)
        setStatus("idle")
        setPercent(0)
        setUploadUrl("")
        uploadRef.current = null
    }

    /** Start a new upload for the selected file. */
    function handleStart(): void {
        if (!file) return
        setStatus("running")
        const upload = createUpload(file)
        uploadRef.current = upload
        // Check localStorage fingerprint — if a matching previous upload exists,
        // resumeFromPreviousUpload instructs the library to HEAD for Upload-Offset
        // and continue PATCH from that byte.
        upload.findPreviousUploads().then((previous) => {
            if (previous.length > 0) {
                upload.resumeFromPreviousUpload(previous[0])
            }
            upload.start()
        })
    }

    /** Abort an in-flight upload (bytes already sent are preserved on the server). */
    function handlePause(): void {
        uploadRef.current?.abort()
        setStatus("paused")
    }

    /** Resume a paused upload — HEAD for offset, then PATCH from there. */
    function handleResume(): void {
        if (!file) return
        setStatus("running")
        // Re-create the Upload instance for the same file so the library can
        // call findPreviousUploads and pick up the fingerprint from localStorage.
        const upload = createUpload(file)
        uploadRef.current = upload
        upload.findPreviousUploads().then((previous) => {
            if (previous.length > 0) {
                upload.resumeFromPreviousUpload(previous[0])
            }
            upload.start()
        })
    }

    /** Map status to HeroUI Chip color. */
    function chipColor(): "success" | "danger" | "default" {
        if (status === "done") return "success"
        if (status === "error") return "danger"
        return "default"
    }

    return (
        <div className="flex flex-col">
            {/* Status chip */}
            <Chip
                data-testid="upload-status"
                variant="soft"
                color={chipColor()}
                className="capitalize"
            >
                {status}
            </Chip>

            <div className="h-3" />

            {/* File picker */}
            <input
                ref={fileInputRef}
                data-testid="file-input"
                type="file"
                className="hidden"
                onChange={handleFileChange}
            />
            <label className="text-sm font-medium text-foreground">File</label>
            <div className="h-1.5" />
            <button
                type="button"
                className="inline-flex w-full cursor-pointer items-center rounded-xl border border-border bg-content1 px-4 py-2 text-sm text-foreground hover:bg-default-100"
                onClick={() => fileInputRef.current?.click()}
            >
                {file ? file.name : "Click to pick a file…"}
            </button>

            <div className="h-6" />

            {/* Action buttons */}
            <div className="flex gap-2">
                <Button
                    data-testid="start-btn"
                    variant="primary"
                    isDisabled={!file || status === "running" || status === "done"}
                    onPress={handleStart}
                >
                    Start
                </Button>
                <Button
                    data-testid="pause-btn"
                    variant="secondary"
                    isDisabled={status !== "running"}
                    onPress={handlePause}
                >
                    Pause
                </Button>
                <Button
                    data-testid="resume-btn"
                    variant="secondary"
                    isDisabled={status !== "paused"}
                    onPress={handleResume}
                >
                    Resume
                </Button>
            </div>

            <div className="h-6" />

            {/* Progress bar + label */}
            <label className="text-sm font-medium text-foreground">Progress</label>
            <div className="h-1.5" />
            <div className="h-3 w-full overflow-hidden rounded-full bg-default-100">
                <div
                    data-testid="progress"
                    className="h-full bg-accent transition-[width] duration-300"
                    style={{ width: `${percent}%` }}
                    aria-label={`${percent}%`}
                />
            </div>
            <div className="h-1.5" />
            <div className="text-sm text-muted">{percent}% complete</div>

            {/* Upload URL when done */}
            {uploadUrl && (
                <>
                    <div className="h-6" />
                    <label className="text-sm font-medium text-foreground">Upload URL</label>
                    <div className="h-1.5" />
                    <div
                        data-testid="result"
                        className="break-all rounded-2xl border border-border bg-content1 p-3 text-sm text-foreground"
                    >
                        {uploadUrl}
                    </div>
                </>
            )}
        </div>
    )
}
