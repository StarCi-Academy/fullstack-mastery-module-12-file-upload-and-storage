/**
 * Resolves the tus backend origin.
 *
 * In the Sandpack embed the platform string-replaces VITE_API_BASE with the
 * mock session URL; in local dev it defaults to http://localhost:3370.
 * We always use port 3370 as the tus server port (not the Vite dev port).
 */
const BASE = new URL(import.meta.env.VITE_API_BASE ?? "http://localhost:3370").origin

/** tus endpoint — POST /files to create an upload slot. */
export const TUS_ENDPOINT = `${BASE}/files`
