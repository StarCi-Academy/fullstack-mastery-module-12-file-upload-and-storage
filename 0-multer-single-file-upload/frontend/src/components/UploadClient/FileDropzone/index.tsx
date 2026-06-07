import { useCallback } from "react"
import { cn } from "@heroui/react"
import { useDropzone } from "react-dropzone"
import { UPLOAD_ALLOWED_MIMES, UPLOAD_MAX_BYTES } from "../../../constants"

/** Props for {@link FileDropzone}. */
export interface FileDropzoneProps {
    /** Currently selected file, or null when none is chosen. */
    file: File | null
    /** Called when the user selects or drops a file (first file only). */
    onFileSelect: (file: File | null) => void
}

/**
 * Drag-and-drop file picker backed by react-dropzone.
 * Does not filter MIME or size client-side — Multer on the backend returns 413/415.
 *
 * @param props - Selected file state and selection callback
 */
export function FileDropzone({ file, onFileSelect }: FileDropzoneProps): JSX.Element {
    const onDrop = useCallback(
        (acceptedFiles: Array<File>) => {
            onFileSelect(acceptedFiles[0] ?? null)
        },
        [onFileSelect]
    )

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        maxFiles: 1,
        // No accept/maxSize — lesson demos server-side Multer validation (413, 415).
    })

    const hint = `Click or drag an image — ${UPLOAD_ALLOWED_MIMES.join(", ")}, max ${UPLOAD_MAX_BYTES / (1024 * 1024)} MB`

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">File</span>
            <div
                {...getRootProps()}
                className={cn(
                    "flex min-h-24 w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-default-100 px-4 py-6 text-center transition-colors",
                    isDragActive && "border-accent bg-accent/10"
                )}
            >
                <input {...getInputProps()} data-testid="file-input" />
                <p className="text-sm text-foreground">
                    {file?.name ?? "Drop a file here, or click to browse"}
                </p>
                <p className="mt-1 text-xs text-muted">{hint}</p>
            </div>
        </div>
    )
}
