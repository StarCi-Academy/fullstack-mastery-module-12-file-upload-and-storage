# tus 1.0 Resumable Upload — Go

Go implementation of the tus 1.0 resumable-upload protocol.
Mirrors the TypeScript (`0-typescript/`) reference exactly: same routes, status codes, JSON sidecar fields, and env-var names.

## Run

```bash
go run .
```

Server starts on **http://localhost:3370** by default.

## Environment variables

| Variable       | Default      | Description                                |
|----------------|--------------|--------------------------------------------|
| `PORT`         | `3370`       | HTTP listen port                           |
| `TUS_PATH`     | `/files`     | Route prefix for the tus endpoint          |
| `TUS_DIRECTORY`| `./uploads`  | Directory where upload files are stored    |
| `TUS_MAX_SIZE` | `104857600`  | Maximum upload size in bytes (100 MiB)     |

## tus 1.0 endpoints

| Method   | Path              | Status | Description                          |
|----------|-------------------|--------|--------------------------------------|
| OPTIONS  | /files            | 204    | Discovery: Tus-Version, Tus-Extension|
| POST     | /files            | 201    | Create upload, returns Location      |
| HEAD     | /files/:id        | 200    | Query offset + length                |
| PATCH    | /files/:id        | 204    | Append chunk, returns new offset     |
| DELETE   | /files/:id        | 204    | Terminate (delete) upload            |

## Storage layout

```
uploads/
  <id>        # raw binary data
  <id>.info   # JSON sidecar: { id, size, offset, metadata, creation_date }
```

## No external dependencies

Only the Go standard library is used — no extra `go get` needed.
