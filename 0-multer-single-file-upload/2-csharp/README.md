# Single File Upload — C# (ASP.NET Core Minimal API)

Cross-lang parity implementation of the TypeScript/NestJS lesson.

## Run

```bash
dotnet run
```

Server starts on **http://localhost:3000** (set `PORT` env to override).

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP listen port |
| `UPLOAD_DEST` | `uploads` | Directory where files are saved |
| `UPLOAD_MAX_BYTES` | `5242880` (5 MB) | Maximum allowed file size |
| `UPLOAD_ALLOWED_MIMES` | `image/jpeg,image/png,image/webp` | Comma-separated MIME allow-list |

## API

### POST /upload

Accepts `multipart/form-data` with field `file`.

**201 Created** (success):
```json
{
  "originalName": "photo.jpg",
  "filename": "1717600000000-photo.jpg",
  "size": 102400,
  "mimetype": "image/jpeg",
  "path": "uploads/1717600000000-photo.jpg"
}
```

**413 Payload Too Large** (file > `UPLOAD_MAX_BYTES`):
```json
{ "statusCode": 413, "message": "File too large" }
```

**415 Unsupported Media Type** (MIME not in allow-list):
```json
{ "message": "Validation failed (expected MIME types: image/jpeg, image/png, image/webp)" }
```
