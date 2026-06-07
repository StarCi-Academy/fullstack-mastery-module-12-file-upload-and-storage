# multer-single-file-upload — Java (Spring Boot)

Mirrors the TypeScript/NestJS version. Same route, status codes, and JSON field names.

## Run

```bash
./mvnw spring-boot:run
```

Server starts on **http://localhost:3000**.

## Endpoint

```
POST /upload
Content-Type: multipart/form-data
Field: file
```

**Success — 201**
```json
{
  "originalName": "photo.jpg",
  "filename": "1717000000000-photo.jpg",
  "size": 204800,
  "mimetype": "image/jpeg",
  "path": "uploads/1717000000000-photo.jpg"
}
```

**File too large — 413**
```json
{ "statusCode": 413, "message": "File too large" }
```

**Unsupported MIME — 415**
```json
{ "message": "Validation failed (expected MIME types: image/jpeg, image/png, image/webp)" }
```

## Environment variables

| Variable             | Default                             | Description                      |
|----------------------|-------------------------------------|----------------------------------|
| `PORT`               | `3000`                              | HTTP port                        |
| `UPLOAD_DEST`        | `uploads`                           | Directory for stored files       |
| `UPLOAD_MAX_BYTES`   | `5242880` (5 MB)                    | Max file size in bytes           |
| `UPLOAD_ALLOWED_MIMES` | `image/jpeg,image/png,image/webp` | Comma-separated MIME allow-list  |
