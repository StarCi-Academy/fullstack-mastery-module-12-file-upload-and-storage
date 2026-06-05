import { HeroUIProvider } from "./components/providers/HeroUIProvider"
import { Local } from "./components/Local"
import { Sandbox } from "./components/Sandbox"

/** Lesson label shown above content in both modes. */
const TITLE = "Chunked Upload with Progress"
/** Lesson description shown under the label in both modes. */
const DESCRIPTION =
    "Pick a file, upload it in chunks to the NestJS backend (init → PATCH each chunk → finalize), and track per-chunk + overall progress. Paste a session ID to resume an interrupted upload."

/**
 * App root — shared Label + Description, then content switches on the
 * `?sandbox` query param: `<Sandbox/>` for the embedded preview,
 * `<Local/>` otherwise (single client, what Playwright drives).
 *
 * This lesson is single-client — Sandbox renders the same UI as Local.
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
