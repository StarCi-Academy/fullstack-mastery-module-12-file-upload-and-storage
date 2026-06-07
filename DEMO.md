# Module 12 — Instructor demo

## Concept

- **One `frontend/`** per lesson — HeroUI upload UI + SWR where needed.
- **FE port pinned in `vite.config.ts`** (same pattern as M7/M8/M9).
- **`VITE_API_BASE`** in `frontend/.env.development` points FE at the lesson backend (override `.env` `PORT=3000` when demoing).
- **`?sandbox=1`** — embedded preview; Playwright uses `/`.

## Demo ports (TypeScript)

| Lesson | BE | FE | Notes |
|--------|----|----|--------|
| L0 Multer single file | **3410** | **3411** | Writes to `0-typescript/uploads/` |
| L1 S3/MinIO presigned | **3420** | **3421** | Requires MinIO on `:9000` |
| L2 Chunked + progress | **3430** | **3431** | |
| L3 TUS resumable | **3440** | **3441** | |

### L0 — quick start

```powershell
# BE
cd 0-multer-single-file-upload/0-typescript
$env:PORT='3410'; npm run start:dev

# FE (separate terminal)
cd 0-multer-single-file-upload/frontend
npm run dev
```

Open **http://127.0.0.1:3411/**

**Demo script:** pick a JPEG/PNG/WebP under 5 MB → Upload → see 201 metadata. Try oversize or wrong MIME → 413/415.

### L1 — MinIO presigned URLs

MinIO on `:9000` (lesson compose: `1-s3-minio-presigned-urls/.docker` → `minioadmin/minioadmin`).

If your local MinIO uses a different password (e.g. Docker `minio` container with `minioadmin123`):

```powershell
$env:PORT='3420'
$env:S3_SECRET_KEY='minioadmin123'   # match your MinIO root password
cd 1-s3-minio-presigned-urls/0-typescript
npm run start:dev

cd 1-s3-minio-presigned-urls/frontend
npm run dev
```

Open **http://127.0.0.1:3421/** — dropzone → Upload via presigned URL → download link.

### L2 — chunked upload

```powershell
cd 2-chunked-upload-with-progress/0-typescript
$env:PORT='3430'; npm run start:dev

cd 2-chunked-upload-with-progress/frontend
npm run dev
```

Open **http://127.0.0.1:3431/**

### L3 — TUS resumable

```powershell
cd 3-resumable-upload-tus-protocol/0-typescript
$env:PORT='3440'; npm run start:dev

cd 3-resumable-upload-tus-protocol/frontend
npm run dev
```

Open **http://127.0.0.1:3441/** — Start → Pause → Resume.

### E2E

```bash
cd <lesson>/frontend
$env:CI='true'; npm run test:e2e
```

Use `CI=true` when another app already listens on the lesson ports.
