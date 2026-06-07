/**
 * Playwright config — runs on real Google Chrome (channel: 'chrome').
 *
 * Prerequisites:
 *   - MinIO running on :9000 (docker compose up -d in ./backend)
 *   - MinIO bucket "uploads" with CORS AllowedMethods=[PUT] so the browser
 *     can PUT directly; if MinIO CORS is not configured the upload step will
 *     fail with a "Failed to fetch" / network error.
 *   - NestJS backend running on :3000 (nest start --watch in ./backend)
 *   - Frontend dev server on FE_PORT (npm run dev in ./frontend)
 *
 * The webServer blocks start both servers automatically when not already
 * running (reusesExistingServer: true in development mode).
 */
import { defineConfig, devices } from "@playwright/test"

const FE_PORT = Number(process.env.FE_PORT ?? 5173)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${FE_PORT}`

export default defineConfig({
    testDir: "./scripts",
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [["list"]],
    use: {
        baseURL: BASE_URL,
        trace: "off",
        actionTimeout: 10_000,
        navigationTimeout: 20_000,
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"], channel: "chrome" },
        },
    ],
    webServer: [
        {
            // NestJS backend — starts MinIO via docker compose before this
            command: "npm run start:dev",
            cwd: "../backend/0-typescript",
            port: 3000,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
        {
            // Vite frontend dev server
            command: `npm run dev -- --port ${FE_PORT}`,
            cwd: "../frontend",
            port: FE_PORT,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
            env: {
                VITE_API_BASE: "http://localhost:3000",
            },
        },
    ],
})
