import { Typography } from "@heroui/react"
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
const App = (): JSX.Element => {
    // Embedded preview loads `/?sandbox=1`; cloned-repo + Playwright load `/`.
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
