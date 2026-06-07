package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// UploadedFileInfo is the JSON shape returned on a successful upload.
// Field names mirror the TypeScript UploadedFileInfo interface exactly.
type UploadedFileInfo struct {
	OriginalName string `json:"originalName"`
	Filename     string `json:"filename"`
	Size         int64  `json:"size"`
	Mimetype     string `json:"mimetype"`
	Path         string `json:"path"`
}

// ErrorResponse is the JSON shape used for 4xx error responses.
type ErrorResponse struct {
	StatusCode int    `json:"statusCode,omitempty"`
	Message    string `json:"message"`
}

// config holds upload settings read from environment variables.
type config struct {
	dest         string   // UPLOAD_DEST
	maxBytes     int64    // UPLOAD_MAX_BYTES
	allowedMimes []string // UPLOAD_ALLOWED_MIMES (comma-separated)
}

// loadConfig reads env vars and returns defaults matching the TypeScript config.
func loadConfig() config {
	dest := os.Getenv("UPLOAD_DEST")
	if dest == "" {
		dest = "uploads"
	}

	maxBytes := int64(5 * 1024 * 1024) // 5 MB default
	if v := os.Getenv("UPLOAD_MAX_BYTES"); v != "" {
		var n int64
		if _, err := fmt.Sscan(v, &n); err == nil && n > 0 {
			maxBytes = n
		}
	}

	mimesEnv := os.Getenv("UPLOAD_ALLOWED_MIMES")
	if mimesEnv == "" {
		mimesEnv = "image/jpeg,image/png,image/webp"
	}
	var mimes []string
	for _, m := range strings.Split(mimesEnv, ",") {
		if t := strings.TrimSpace(m); t != "" {
			mimes = append(mimes, t)
		}
	}

	return config{
		dest:         dest,
		maxBytes:     maxBytes,
		allowedMimes: mimes,
	}
}

// writeJSON serialises v as JSON and writes it with the given status code.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// containsMime returns true when mime is present in the allow-list.
func containsMime(allowedMimes []string, mime string) bool {
	for _, m := range allowedMimes {
		if m == mime {
			return true
		}
	}
	return false
}

// makeUploadHandler builds the http.HandlerFunc for POST /upload.
func makeUploadHandler(cfg config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.NotFound(w, r)
			return
		}

		// Wrap the request body so that reads beyond maxBytes return an error.
		// This mirrors multer's limits.fileSize → LIMIT_FILE_SIZE → 413.
		r.Body = http.MaxBytesReader(w, r.Body, cfg.maxBytes+1024) // +1 KB for headers/boundary

		// ParseMultipartForm will fail with "http: request body too large" if the
		// body exceeds the limit set by MaxBytesReader above.
		if err := r.ParseMultipartForm(cfg.maxBytes); err != nil {
			// Any "too large" error maps to 413 with the exact TS message.
			writeJSON(w, http.StatusRequestEntityTooLarge, ErrorResponse{
				StatusCode: http.StatusRequestEntityTooLarge,
				Message:    "File too large",
			})
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			// No file field at all — treat as MIME validation failure (same as TS:
			// fileFilter silently rejects → file is undefined → controller throws 415).
			writeJSON(w, http.StatusUnsupportedMediaType, ErrorResponse{
				Message: fmt.Sprintf(
					"Validation failed (expected MIME types: %s)",
					strings.Join(cfg.allowedMimes, ", "),
				),
			})
			return
		}
		defer file.Close()

		// Detect MIME from the first 512 bytes (Content-Type header is unreliable
		// from some clients; sniff actual bytes for accuracy).
		buf := make([]byte, 512)
		n, _ := file.Read(buf)
		detectedMime := http.DetectContentType(buf[:n])

		// Normalise: DetectContentType may return "image/jpeg; charset=..." etc.
		// Strip parameters to get the bare type.
		detectedMime = strings.SplitN(detectedMime, ";", 2)[0]
		detectedMime = strings.TrimSpace(detectedMime)

		if !containsMime(cfg.allowedMimes, detectedMime) {
			writeJSON(w, http.StatusUnsupportedMediaType, ErrorResponse{
				Message: fmt.Sprintf(
					"Validation failed (expected MIME types: %s)",
					strings.Join(cfg.allowedMimes, ", "),
				),
			})
			return
		}

		// Ensure upload destination directory exists.
		if err := os.MkdirAll(cfg.dest, 0o755); err != nil {
			http.Error(w, "could not create upload dir", http.StatusInternalServerError)
			return
		}

		// Build filename: <epochMillis>-<originalname> — matches TS diskStorage filename cb.
		epochMs := time.Now().UnixMilli()
		filename := fmt.Sprintf("%d-%s", epochMs, header.Filename)
		destPath := filepath.Join(cfg.dest, filename)

		// Create the destination file.
		dst, err := os.Create(destPath)
		if err != nil {
			http.Error(w, "could not create file", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		// Write the already-read buffer back first, then copy the remainder.
		written, err := dst.Write(buf[:n])
		if err != nil {
			http.Error(w, "could not write file", http.StatusInternalServerError)
			return
		}
		rest, err := io.Copy(dst, file)
		if err != nil {
			http.Error(w, "could not write file", http.StatusInternalServerError)
			return
		}
		totalSize := int64(written) + rest

		log.Printf("saved %d KB to %s", totalSize/1024, destPath)

		// Return 201 with metadata — field names match TS UploadedFileInfo exactly.
		writeJSON(w, http.StatusCreated, UploadedFileInfo{
			OriginalName: header.Filename,
			Filename:     filename,
			Size:         totalSize,
			Mimetype:     detectedMime,
			Path:         destPath,
		})
	}
}

func main() {
	cfg := loadConfig()

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/upload", makeUploadHandler(cfg))

	// Bind to the loopback interface only — the demo never needs to be reachable
	// from other hosts, and binding 127.0.0.1 avoids the host firewall prompt that
	// 0.0.0.0 triggers on some platforms.
	addr := "127.0.0.1:" + port
	log.Printf("Go server started on http://%s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("ListenAndServe error: %v", err)
	}
}
