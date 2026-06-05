/**
 * Playwright config — runs on real Google Chrome (channel: 'chrome') + Vite dev base URL.
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
            // Start the NestJS backend before running specs.
            command: "npm run start:dev",
            cwd: "../0-typescript",
            port: 3000,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
        {
            // Start the Vite dev server for the HeroUI frontend.
            command: `npx vite --port ${FE_PORT}`,
            cwd: "../frontend",
            port: FE_PORT,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
    ],
})
