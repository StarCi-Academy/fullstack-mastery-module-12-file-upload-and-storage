import { useCallback, useState } from "react"
import { Button, Chip, Input, Spinner } from "@heroui/react"
import { FileDropzone } from "./FileDropzone"
import {
    initSession,
    getStatus,
    finalizeUpload,
    patchChunk,
    type FinalizeResp,
} from "../../lib/api"

/**
 * Shared upload client — used by both Local and Sandbox.
 * Exposes the following data-testids consumed by Playwright specs:
 *   file-input       — hidden <input type="file">
 *   upload-btn       — "Upload" button (triggers full init→PATCH→finalize flow)
 *   resume-btn       — "Resume" button (GET status → PATCH missing[] → finalize)
 *   progress         — <progress> element (value 0-100, max 100)
 *   upload-status    — overall status text (idle / uploading / finalizing / done / error)
 *   result-meta      — text block showing sha256 + path after successful finalize
 *   error-msg        — error message text (only visible on error)
 */
export function UploadClient(): JSX.Element {
    // The selected file
    const [file, setFile] = useState<File | null>(null)
    // session id — auto-filled after init, can be pasted for resume
    const [sessionId, setSessionId] = useState<string>("")
    // overall progress 0-100
    const [progress, setProgress] = useState<number>(0)
    // per-chunk progress array (index = chunk index)
    const [chunkPcts, setChunkPcts] = useState<number[]>([])
    // human-readable status label
    const [status, setStatus] = useState<string>("idle")
    // finalize result
    const [result, setResult] = useState<FinalizeResp | null>(null)
    // error message
    const [error, setError] = useState<string | null>(null)
    // whether a flow is running
    const [busy, setBusy] = useState<boolean>(false)

    const onFileSelect = useCallback((picked: File | null): void => {
        setFile(picked)
        setError(null)
        setResult(null)
        setProgress(0)
        setChunkPcts([])
        setStatus("idle")
    }, [])

    /** Update a single chunk's progress percentage in the array. */
    function setChunkPct(index: number, pct: number): void {
        setChunkPcts((prev) => {
            const next = [...prev]
            next[index] = pct
            return next
        })
    }

    /** Run the full upload flow: init → PATCH all chunks sequentially → finalize. */
    async function handleUpload(): Promise<void> {
        if (!file) return
        setBusy(true)
        setError(null)
        setResult(null)
        setProgress(0)
        setChunkPcts([])
        setStatus("uploading")

        try {
            // Step 1: init session — server computes totalChunks from file.size / default chunkSize
            const init = await initSession(file.name, file.size)
            setSessionId(init.sessionId)
            setChunkPcts(new Array<number>(init.totalChunks).fill(0))

            // Step 2: PATCH each chunk sequentially with raw binary body
            for (let i = 0; i < init.totalChunks; i++) {
                const start = i * init.chunkSize
                const end = Math.min(start + init.chunkSize, file.size)
                await patchChunk(init.sessionId, i, file.slice(start, end), (pct) => {
                    setChunkPct(i, pct)
                })
                // overall progress advances 1 chunk at a time
                setProgress(Math.round(((i + 1) / init.totalChunks) * 100))
            }

            // Step 3: finalize — server merges chunks and computes SHA-256
            setStatus("finalizing")
            const fin = await finalizeUpload(init.sessionId)
            setResult(fin)
            setProgress(100)
            setStatus("done")
        } catch (err) {
            setError((err as Error).message)
            setStatus("error")
        } finally {
            setBusy(false)
        }
    }

    /**
     * Resume flow: GET /status → PATCH missing[] chunks → finalize.
     * Requires a file to be selected (to slice the correct byte ranges).
     */
    async function handleResume(): Promise<void> {
        if (!file || !sessionId) return
        setBusy(true)
        setError(null)
        setResult(null)
        setStatus("uploading")

        try {
            // GET status to learn which chunks are still missing
            const st = await getStatus(sessionId)

            // Seed progress from already-received chunks
            const pcts = new Array<number>(st.totalChunks).fill(0)
            for (const i of st.received) pcts[i] = 100
            setChunkPcts(pcts)
            setProgress(Math.round((st.received.length / st.totalChunks) * 100))

            let done = st.received.length

            // PATCH only the missing chunk indices
            for (const i of st.missing) {
                const start = i * st.chunkSize
                const end = Math.min(start + st.chunkSize, file.size)
                await patchChunk(sessionId, i, file.slice(start, end), (pct) => {
                    setChunkPct(i, pct)
                })
                done++
                setProgress(Math.round((done / st.totalChunks) * 100))
            }

            // Finalize once all chunks are present
            setStatus("finalizing")
            const fin = await finalizeUpload(sessionId)
            setResult(fin)
            setProgress(100)
            setStatus("done")
        } catch (err) {
            setError((err as Error).message)
            setStatus("error")
        } finally {
            setBusy(false)
        }
    }

    const isIdle = status === "idle"
    const isDone = status === "done"
    const isError = status === "error"

    return (
        <div>
            <FileDropzone file={file} onFileSelect={onFileSelect} isDisabled={busy} />
            {file && (
                <p className="mt-1.5 text-xs text-muted">
                    {file.name} — {(file.size / 1024).toFixed(1)} KB
                </p>
            )}
            <div className="h-3" />

            {/* Session ID — auto-filled after init, can be pasted to resume */}
            <label className="text-sm font-medium text-foreground">
                Session ID (auto-filled — paste to resume)
            </label>
            <div className="h-1.5" />
            <Input
                variant="secondary"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="auto-filled after Upload"
                aria-label="Session ID"
            />
            <div className="h-6" />

            {/* Action buttons */}
            <div className="flex items-center gap-3">
                <Button
                    variant="primary"
                    isDisabled={!file || busy}
                    onPress={handleUpload}
                    data-testid="upload-btn"
                >
                    <span className="flex items-center gap-2">
                        {busy && status !== "finalizing" && <Spinner size="sm" color="current" />}
                        Upload
                    </span>
                </Button>
                <Button
                    variant="secondary"
                    isDisabled={!file || !sessionId || busy}
                    onPress={handleResume}
                    data-testid="resume-btn"
                >
                    <span className="flex items-center gap-2">
                        {busy && status === "uploading" && <Spinner size="sm" color="current" />}
                        Resume
                    </span>
                </Button>
            </div>
            <div className="h-6" />

            {/* Status chip */}
            <Chip
                variant="secondary"
                color={isDone ? "success" : isError ? "danger" : "default"}
                size="sm"
                className="w-fit capitalize"
                data-testid="upload-status"
            >
                {status}
            </Chip>
            <div className="h-3" />

            {/* Overall progress bar */}
            <label className="text-sm font-medium text-foreground">
                Overall progress
            </label>
            <div className="h-1.5" />
            <div className="flex items-center gap-3">
                <progress
                    data-testid="progress"
                    value={progress}
                    max={100}
                    className="h-2 flex-1 rounded-full overflow-hidden appearance-none [&::-webkit-progress-bar]:bg-default-100 [&::-webkit-progress-value]:bg-accent [&::-webkit-progress-value]:rounded-full"
                />
                <span className="text-sm font-semibold text-foreground w-10 text-right">
                    {progress}%
                </span>
            </div>
            <div className="h-3" />

            {/* Per-chunk progress (only shown when chunks are known) */}
            {chunkPcts.length > 1 && (
                <>
                    <label className="text-sm font-medium text-foreground">
                        Chunks ({chunkPcts.length})
                    </label>
                    <div className="h-1.5" />
                    <div className="flex flex-col gap-1.5">
                        {chunkPcts.map((pct, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-xs text-muted w-16 flex-shrink-0">
                                    Chunk {i}
                                </span>
                                <progress
                                    value={pct}
                                    max={100}
                                    className="h-1.5 flex-1 rounded-full overflow-hidden appearance-none [&::-webkit-progress-bar]:bg-default-100 [&::-webkit-progress-value]:bg-accent"
                                />
                                <span className="text-xs text-muted w-8 text-right">
                                    {pct}%
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="h-3" />
                </>
            )}

            {/* Result metadata (shown after successful finalize) */}
            {result && (
                <div data-testid="result-meta" className="text-sm text-foreground">
                    <div className="font-semibold mb-1.5">Upload complete</div>
                    <div className="text-muted text-xs space-y-0.5">
                        <div>filename: {result.filename}</div>
                        <div>size: {result.size} B</div>
                        <div>sha256: {result.sha256}</div>
                        <div>path: {result.path}</div>
                    </div>
                </div>
            )}

            {/* Error message */}
            {isError && error && (
                <div data-testid="error-msg" className="text-sm text-danger">
                    {error}
                </div>
            )}
        </div>
    )
}
