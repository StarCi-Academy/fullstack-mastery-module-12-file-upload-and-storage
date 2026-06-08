import { useCallback } from "react"
import { cn, Label, Typography } from "@heroui/react"
import { useDropzone } from "react-dropzone"

/** Props for {@link FileDropzone}. */
export interface FileDropzoneProps {
    /** Currently selected file, or null when none is chosen. */
    file: File | null
    /** Called when the user selects or drops a file (first file only). */
    onFileSelect: (file: File | null) => void
}

/**
 * Drag-and-drop file picker for the TUS resumable upload lesson.
 *
 * @param props - Selected file state and selection callback
 */
export const FileDropzone = ({ file, onFileSelect }: FileDropzoneProps): JSX.Element => {
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
    })

    return (
        <div className="flex flex-col gap-1.5">
            <Label>File</Label>
            <div
                {...getRootProps()}
                className={cn(
                    "flex min-h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-default-100 px-4 py-6 text-center transition-colors",
                    isDragActive && "border-accent bg-accent/10"
                )}
            >
                <input {...getInputProps()} data-testid="file-input" />
                <Typography.Paragraph size="sm">
                    {file?.name ?? "Drop a file here, or click to browse"}
                </Typography.Paragraph>
                <Typography.Paragraph size="xs" color="muted">
                    TUS protocol — pause, refresh, then resume from Upload-Offset
                </Typography.Paragraph>
            </div>
        </div>
    )
}
