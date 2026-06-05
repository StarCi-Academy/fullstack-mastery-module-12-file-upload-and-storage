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
export default function App(): JSX.Element {
    // embedded preview loads `/?sandbox=1`; cloned-repo + Playwright load `/`
    const isSandbox = new URLSearchParams(window.location.search).has("sandbox")

    return (
        <HeroUIProvider>
            <main className="min-h-screen bg-background p-3">
                <div className="mx-auto max-w-2xl">
                    {/* Label */}
                    <div className="text-base font-semibold text-foreground">{TITLE}</div>
                    <div className="h-3" />
                    {/* Description */}
                    <div className="text-sm text-muted">{DESCRIPTION}</div>
                    <div className="h-6" />
                    {/* Content */}
                    {isSandbox ? <Sandbox /> : <Local />}
                </div>
            </main>
        </HeroUIProvider>
    )
}
