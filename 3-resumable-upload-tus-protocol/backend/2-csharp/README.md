# 3-resumable-upload-tus-protocol — C# (tusdotnet)

Implements the **tus 1.0** resumable upload protocol using [tusdotnet](https://github.com/tusdotnet/tusdotnet).
Parity target: `0-typescript/` (same routes, status codes, headers, env vars).

## Run

```bash
dotnet run
```

Server starts at **http://localhost:3370** by default.

## Environment variables

| Variable        | Default      | Notes                              |
|-----------------|--------------|------------------------------------|
| `PORT`          | `3370`       | Same default as TypeScript backend |
| `TUS_PATH`      | `/files`     | URL prefix for tus endpoint        |
| `TUS_DIRECTORY` | `./uploads`  | Local directory for stored chunks  |
| `TUS_MAX_SIZE`  | `104857600`  | Max upload bytes (100 MiB)         |

## Protocol routes (all at `TUS_PATH`)

| Method   | Path        | Status | Key response headers                                   |
|----------|-------------|--------|--------------------------------------------------------|
| OPTIONS  | /files      | 204    | Tus-Resumable, Tus-Version, Tus-Extension              |
| POST     | /files      | 201    | Location: /files/\<id\>                                |
| HEAD     | /files/\<id\> | 200  | Upload-Offset, Upload-Length                           |
| PATCH    | /files/\<id\> | 204  | Upload-Offset (updated)                                |
| DELETE   | /files/\<id\> | 204  | (termination extension)                                |
