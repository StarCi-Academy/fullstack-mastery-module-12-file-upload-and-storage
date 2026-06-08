import { UploadClient } from "../UploadClient"

/**
 * Sandbox — the `?sandbox=1` content.
 *
 * tus upload is single-client by nature (one file, one upload slot), so Sandbox
 * renders the same single-client UI as Local — no multi-pane needed.
 */
export const Sandbox = (): JSX.Element => {
    return <UploadClient />
}
