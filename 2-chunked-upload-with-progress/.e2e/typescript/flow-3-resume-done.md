# Flow 3 — resume from missing chunks (TypeScript / NestJS) — DONE

- Lang: TypeScript (NestJS, `backend/0-typescript`)
- Frontend: Vite, Playwright Chromium
- Date: 2026-06-07
- Bind: `127.0.0.1:3000` / `127.0.0.1:3001`

## Spec

`.playwright/scripts/flow-3-resume.spec.ts` — uses `page.request` to init a 2-chunk (6 MB) session and PATCH only chunk 0, leaving `missing=[1]`. Then in the UI: select the same file, paste the session ID, click Resume. The UI GETs `/status`, sees `missing=[1]`, PATCHes chunk 1, finalizes. Asserts status `done` + result-meta with `sha256` + `path`.

## Result (real run)

```
  ok 3 [chromium] › scripts\flow-3-resume.spec.ts:20:5 › flow 3 — resume completes an interrupted upload from missing chunks (1.8s)
  3 passed (7.6s)
```

PASS — resume completed the interrupted upload using the `missing[]` bitmap.

## Manual contract probe (status bitmap)

```
init: id=... totalChunks=2 chunkSize=8
status before: received=[]     missing=[0,1] finalized=False
patch0: 204   patch1: 204
status after:  received=[0,1]  missing=[]
finalize: filename=e2e.bin size=15 sha256=36030fcc... path=uploads\...-e2e.bin
```

PATCH only chunk 0 → `status received=[0] missing=[1]` (resume entry point confirmed).
