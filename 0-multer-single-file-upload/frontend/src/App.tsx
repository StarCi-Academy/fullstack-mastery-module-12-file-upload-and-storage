import { HeroUIProvider } from "./components/providers"
import { Local } from "./components/Local"
import { Sandbox } from "./components/Sandbox"

/** Lesson label (shown above the content in both modes). */
const TITLE = "Multer Single-File Upload"
/** Lesson description (shown under the label in both modes). */
const DESCRIPTION =
    "Upload an image file to POST /upload — the backend enforces a 5 MB size limit and an image MIME allow-list via Multer interceptors. See how 413 and 415 errors surface from the interceptor layer."

/**
 * App root — shared Label + Description, then the content switches on the
 * `?sandbox` query param: `<Sandbox/>` for embedded preview, `<Local/>` otherwise
 * (single client, what Playwright drives). For this single-client lesson Sandbox
 * renders the same client as Local — the split keeps the structure uniform.
 */
export default function App(): JSX.Element {
    // Embedded preview loads `/?sandbox=1`; cloned-repo + Playwright load `/`.
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
