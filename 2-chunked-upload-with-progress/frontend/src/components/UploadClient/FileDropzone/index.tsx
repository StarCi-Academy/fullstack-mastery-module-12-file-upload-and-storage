import { useCallback } from "react"
import { cn } from "@heroui/react"
import { useDropzone } from "react-dropzone"

/** Props for {@link FileDropzone}. */
export interface FileDropzoneProps {
    /** Currently selected file, or null when none is chosen. */
    file: File | null
    /** Called when the user selects or drops a file (first file only). */
    onFileSelect: (file: File | null) => void
    /** Disables interaction while an upload flow is running. */
    isDisabled?: boolean
}

/**
 * Drag-and-drop file picker for the chunked upload lesson.
 *
 * @param props - File state, selection callback, and optional disabled flag
 */
export function FileDropzone({
    file,
    onFileSelect,
    isDisabled = false,
}: FileDropzoneProps): JSX.Element {
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
        disabled: isDisabled,
    })

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">File</span>
            <div
                {...getRootProps()}
                className={cn(
                    "flex min-h-24 w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-default-100 px-4 py-6 text-center transition-colors",
                    isDragActive && "border-accent bg-accent/10",
                    isDisabled && "pointer-events-none opacity-60"
                )}
            >
                <input {...getInputProps()} data-testid="file-input" />
                <p className="text-sm text-foreground">
                    {file?.name ?? "Drop a file here, or click to browse"}
                </p>
                <p className="mt-1 text-xs text-muted">
                    Server splits into chunks — PATCH each slice with progress
                </p>
            </div>
        </div>
    )
}
