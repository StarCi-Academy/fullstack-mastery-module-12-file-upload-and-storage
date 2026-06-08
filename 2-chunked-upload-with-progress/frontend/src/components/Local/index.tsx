import { UploadClient } from "../UploadClient"

/**
 * Local — the default (no `?sandbox`) content: a single upload client.
 *
 * This is the canonical product UI that runs on `npm run dev` and that the
 * Playwright specs drive. The specs open this single-client view directly.
 */
export const Local = (): JSX.Element => {
    return <UploadClient />
}
