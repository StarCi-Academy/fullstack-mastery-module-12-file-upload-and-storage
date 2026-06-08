import { UploadClient } from "../UploadClient"

/**
 * Sandbox — rendered when `?sandbox=1` is in the URL (embedded Sandpack preview).
 *
 * This is a single-client lesson (no multi-user interaction), so Sandbox renders
 * the same UploadClient as Local. The split structure is kept for consistency with
 * all other course lesson frontends.
 */
export const Sandbox = (): JSX.Element => {
    return <UploadClient />
}
