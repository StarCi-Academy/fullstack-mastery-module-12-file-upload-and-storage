import { UploadClient } from "../UploadClient"

/**
 * Sandbox — the embedded-preview content (`?sandbox=1`).
 *
 * This lesson is single-client (no second user needed), so Sandbox renders
 * the same UploadClient as Local. The `?sandbox` switch is preserved for
 * uniformity with the rest of the course frontend structure.
 */
export function Sandbox(): JSX.Element {
    return <UploadClient />
}
