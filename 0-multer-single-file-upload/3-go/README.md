# 0-multer-single-file-upload — Go

Single-file upload server using only the Go standard library (`net/http`).

## Run

```bash
go run .
```

Server listens on **port 3000** (same as the TypeScript reference).

## Environment variables

| Variable              | Default                              | Description                        |
|-----------------------|--------------------------------------|------------------------------------|
| `PORT`                | `3000`                               | HTTP listen port                   |
| `UPLOAD_DEST`         | `uploads`                            | Directory where files are saved    |
| `UPLOAD_MAX_BYTES`    | `5242880` (5 MB)                     | Maximum file size in bytes         |
| `UPLOAD_ALLOWED_MIMES`| `image/jpeg,image/png,image/webp`    | Comma-separated MIME allow-list    |

## Endpoint

```
POST /upload
Content-Type: multipart/form-data
Field:        file
```

### Success — 201

```json
{
  "originalName": "photo.jpg",
  "filename": "1717600000000-photo.jpg",
  "size": 102400,
  "mimetype": "image/jpeg",
  "path": "uploads/1717600000000-photo.jpg"
}
```

### File too large — 413

```json
{ "statusCode": 413, "message": "File too large" }
```

### Disallowed MIME — 415

```json
{ "message": "Validation failed (expected MIME types: image/jpeg, image/png, image/webp)" }
```
