# Flow 2 — progress advances 0 → 100 (TypeScript / NestJS) — DONE

- Lang: TypeScript (NestJS, `backend/0-typescript`)
- Frontend: Vite, Playwright Chromium
- Date: 2026-06-07
- Bind: `127.0.0.1:3000` / `127.0.0.1:3001`

## Spec

`.playwright/scripts/flow-2-progress.spec.ts` — uploads a multi-chunk file and asserts the `progress` element passes through an intermediate value `> 0` (e.g. 50% after chunk 0 of a 2-chunk file) before reaching 100. Exercises the XHR `upload.onprogress` per-chunk callback.

## Result (real run)

```
  ok 2 [chromium] › scripts\flow-2-progress.spec.ts:12:5 › flow 2 — progress advances from 0 to 100 during upload (1.6s)
  3 passed (7.6s)
```

PASS — progress observed `0 → >0 → 100`.
