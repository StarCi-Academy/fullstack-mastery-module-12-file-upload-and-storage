import { UploadClient } from "../UploadClient"

/**
 * Local — the default (no `?sandbox`) content: a single upload client.
 *
 * This is the canonical product UI that runs on `npm run dev` and that
 * the Playwright specs drive. It exposes all data-testids the specs assert.
 */
export const Local = (): JSX.Element => {
    return <UploadClient />
}
