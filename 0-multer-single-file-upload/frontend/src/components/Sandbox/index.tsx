import { UploadClient } from "../UploadClient"

/**
 * Sandbox — rendered when `?sandbox=1` is present.
 *
 * This lesson has a single-client workflow (no realtime / multi-user), so Sandbox
 * renders the same client as Local. The split keeps the App layout structure uniform
 * across the entire course and the `?sandbox` switch harmless.
 */
export function Sandbox(): JSX.Element {
    return <UploadClient />
}
