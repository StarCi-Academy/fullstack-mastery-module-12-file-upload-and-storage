import { Typography } from "@heroui/react"
import { HeroUIProvider } from "./components/providers"
import { Local } from "./components/Local"
import { Sandbox } from "./components/Sandbox"

/** Lesson label (shown above the content in both modes). */
const TITLE = "S3 / MinIO Presigned URL Upload"
/** Lesson description (shown under the label in both modes). */
const DESCRIPTION =
    "Select a file, request a presigned PUT URL from the NestJS backend, then upload directly to MinIO — the server never receives a single byte of the file. After uploading, request a presigned GET URL to download the object."

/**
 * App root — shared Label + Description, then the content switches on the
 * `?sandbox` query param: `<Sandbox/>` for the embedded preview,
 * `<Local/>` otherwise (single client, what Playwright drives).
 *
 * This is a single-client lesson: Sandbox renders the same UploadClient as Local.
 */
const App = (): JSX.Element => {
    // embedded preview loads `/?sandbox=1`; cloned-repo + Playwright load `/`
    const isSandbox = new URLSearchParams(window.location.search).has("sandbox")

    return (
        <HeroUIProvider>
            <main className="min-h-screen bg-background p-3">
                <div className="mx-auto flex max-w-2xl flex-col gap-6">
                    {/* Lesson header: title grouped with description. */}
                    <div className="flex flex-col gap-3">
                        <Typography.Heading level={4} className="text-sm font-semibold">
                            {TITLE}
                        </Typography.Heading>
                        <Typography.Paragraph size="sm" color="muted">
                            {DESCRIPTION}
                        </Typography.Paragraph>
                    </div>
                    {/* Content switches on the `?sandbox` query param. */}
                    {isSandbox ? <Sandbox /> : <Local />}
                </div>
            </main>
        </HeroUIProvider>
    )
}

export default App
