/**
 * Playwright config — runs against a real Chromium (channel: chrome).
 * webServer spins up both the NestJS backend (port 3000) and the Vite
 * frontend (default port 3001) so specs can run fully offline with just
 * `npm ci && npx playwright test` from the `.playwright/` directory.
 */
import { defineConfig, devices } from "@playwright/test"

const FE_PORT = Number(process.env.FE_PORT ?? 3001)
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
            // NestJS backend — uses `npm run start:dev` from the backend/0-typescript directory
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
