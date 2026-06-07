# Fullstack Mastery — Module 12: File Upload & Storage

Four lessons covering local Multer uploads, S3/MinIO presigned URLs, chunked uploads with progress, and resumable TUS uploads. Each lesson follows the canonical layout: `frontend/`, `0-typescript/` (+ Java/C#/Go where present), `.playwright/`.

| # | Lesson | Topic |
|---|--------|--------|
| 0 | `0-multer-single-file-upload` | Multer single-file POST, size/MIME limits, 413/415 errors |
| 1 | `1-s3-minio-presigned-urls` | Presigned PUT/GET to private MinIO bucket |
| 2 | `2-chunked-upload-with-progress` | Chunked multipart upload + progress UI |
| 3 | `3-resumable-upload-tus-protocol` | Resumable upload via TUS protocol |

## Frontend shell

- One **`frontend/`** per lesson (Vite + React 19 + HeroUI v3 + Tailwind v4).
- Dev **FE port pinned in `frontend/vite.config.ts`** — run with `npm run dev` only (no CLI `--port`).
- Backend origin via **`VITE_API_BASE`** in `frontend/.env.development` (see [DEMO.md](./DEMO.md) ports).
- **`?sandbox=1`** — embedded preview; Playwright drives `/` (Local).

## Run a lesson (TypeScript)

```bash
# Terminal 1 — backend (override PORT per DEMO.md)
cd <lesson>/0-typescript
npm install
$env:PORT='3410'   # PowerShell — see DEMO.md for each lesson
npm run start:dev

# Terminal 2 — frontend
cd <lesson>/frontend
npm install
npm run dev
```

## E2E

```bash
cd <lesson>/frontend
npm run test:e2e
```

Playwright boots backend + Vite via `.playwright/playwright.config.ts` (`FE_PORT` / backend port match DEMO.md).

Instructor quick reference: **[DEMO.md](./DEMO.md)**.
