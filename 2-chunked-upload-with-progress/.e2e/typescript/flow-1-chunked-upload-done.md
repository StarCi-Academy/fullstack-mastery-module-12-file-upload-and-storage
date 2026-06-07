# Flow 1 — full chunked upload (TypeScript / NestJS) — DONE

- Lang: TypeScript (NestJS, `backend/0-typescript`)
- Frontend: Vite (`frontend`), Playwright Chromium
- Date: 2026-06-07
- Bind: backend `127.0.0.1:3000`, frontend `127.0.0.1:3001` (IPv4 only — backends bind 127.0.0.1 for the Windows Firewall workaround)
- Layout verified: Playwright `webServer.cwd = ../backend/0-typescript` boots after the `backend/<lang>` restructure.

## Spec

`.playwright/scripts/flow-1-chunked-upload.spec.ts` — selects an 11 MB in-memory file (3 chunks at 5 MB default), runs init → PATCH all chunks → finalize through the real UI, asserts progress reaches 100% and `result-meta` shows `sha256:` + `path:`.

## Result (real run)

```
Running 3 tests using 1 worker
  ok 1 [chromium] › scripts\flow-1-chunked-upload.spec.ts:14:5 › flow 1 — full chunked upload reaches 100% and shows result meta (2.7s)
  3 passed (7.6s)
```

PASS — progress = 100, result-meta rendered with `sha256` + `path`.

## SHA-256 correctness (cross-language anchor)

Deterministic finalize over bytes `0..9` (two chunks 5+5) on the live TS backend:

```
TS finalize: size=10 sha256=1f825aa2f0020ef7cf91dfa30da4668d791c5d4824fc8e41354b89ec05795ab3
local ref   sha256=1f825aa2f0020ef7cf91dfa30da4668d791c5d4824fc8e41354b89ec05795ab3
```

The finalize SHA-256 equals the locally-computed SHA-256 of the same bytes — assembly + hashing are correct. Java/C#/Go implement the identical streaming SHA-256 at finalize (contract-verified from source), so they produce the same digest for the same bytes.
