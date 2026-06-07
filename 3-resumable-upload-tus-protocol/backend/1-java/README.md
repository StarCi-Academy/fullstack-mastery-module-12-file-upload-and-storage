# tus 1.0 Resumable Upload — Java (Spring Boot)

Cross-language parity implementation of the TypeScript reference.  
Port: **3370** (same as TypeScript so the shared Playwright test suite can target either).

## Run

```bash
./mvnw spring-boot:run
```

## Env vars

| Variable        | Default     | Description                          |
|-----------------|-------------|--------------------------------------|
| `PORT`          | `3370`      | HTTP listen port                     |
| `TUS_PATH`      | `/files`    | URL path for the tus endpoint        |
| `TUS_DIRECTORY` | `./uploads` | Directory to store uploads + sidecars |
| `TUS_MAX_SIZE`  | `104857600` | Max upload size in bytes (100 MiB)   |

## tus 1.0 endpoints

| Method   | Path          | Status | Key headers out                          |
|----------|---------------|--------|------------------------------------------|
| OPTIONS  | /files        | 204    | Tus-Resumable, Tus-Version, Tus-Extension, Tus-Max-Size |
| POST     | /files        | 201    | Location                                 |
| HEAD     | /files/{id}   | 200    | Upload-Offset, Upload-Length             |
| PATCH    | /files/{id}   | 204    | Upload-Offset (new value)                |
| DELETE   | /files/{id}   | 204    | —                                        |

## Storage layout

```
uploads/
  <uuid>        — raw binary data
  <uuid>.json   — sidecar: { id, size, offset, metadata, creation_date }
```

Sidecar field names match the TypeScript `@tus/file-store` sidecar schema exactly.
