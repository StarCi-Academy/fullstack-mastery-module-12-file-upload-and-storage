package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// --------------------------------------------------------------------------
// Config — mirrors upload.config.ts env vars exactly.
// --------------------------------------------------------------------------

const defaultChunkSize = 5 * 1024 * 1024  // 5 MB
const defaultMaxFile = 1024 * 1024 * 1024 // 1 GB

type config struct {
	tmpDir         string
	finalDir       string
	chunkSizeBytes int64
	maxFileBytes   int64
	port           string
}

func loadConfig() config {
	c := config{
		tmpDir:         getEnvStr("UPLOAD_TMP_DIR", "tmp"),
		finalDir:       getEnvStr("UPLOAD_FINAL_DIR", "uploads"),
		chunkSizeBytes: getEnvInt64("UPLOAD_CHUNK_SIZE_BYTES", defaultChunkSize),
		maxFileBytes:   getEnvInt64("UPLOAD_MAX_FILE_BYTES", defaultMaxFile),
		port:           getEnvStr("PORT", "3000"),
	}
	return c
}

func getEnvStr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt64(key string, fallback int64) int64 {
	if v := os.Getenv(key); v != "" {
		n, err := strconv.ParseInt(v, 10, 64)
		if err == nil {
			return n
		}
	}
	return fallback
}

// --------------------------------------------------------------------------
// Domain types — field names mirror upload.types.ts exactly.
// --------------------------------------------------------------------------

// uploadSession holds in-memory state for one chunked upload.
type uploadSession struct {
	id             string
	filename       string
	size           int64
	chunkSize      int64
	totalChunks    int
	receivedChunks []int
	createdAt      int64
	finalized      bool
}

// initSessionResponse mirrors InitSessionResponse in upload.types.ts.
type initSessionResponse struct {
	SessionID   string `json:"sessionId"`
	TotalChunks int    `json:"totalChunks"`
	ChunkSize   int64  `json:"chunkSize"`
}

// sessionStatusResponse mirrors SessionStatusResponse in upload.types.ts.
type sessionStatusResponse struct {
	SessionID   string `json:"sessionId"`
	TotalChunks int    `json:"totalChunks"`
	ChunkSize   int64  `json:"chunkSize"`
	Received    []int  `json:"received"`
	Missing     []int  `json:"missing"`
	Finalized   bool   `json:"finalized"`
}

// finalizeResponse mirrors FinalizeResponse in upload.types.ts.
type finalizeResponse struct {
	Filename string `json:"filename"`
	Size     int64  `json:"size"`
	SHA256   string `json:"sha256"`
	Path     string `json:"path"`
}

// errorResponse is the standard error envelope.
type errorResponse struct {
	Message string `json:"message"`
}

// --------------------------------------------------------------------------
// Session store — thread-safe, in-memory Map equivalent.
// --------------------------------------------------------------------------

type sessionStore struct {
	mu       sync.Mutex
	sessions map[string]*uploadSession
}

func newSessionStore() *sessionStore {
	return &sessionStore{sessions: make(map[string]*uploadSession)}
}

func (s *sessionStore) set(sess *uploadSession) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sessions[sess.id] = sess
}

func (s *sessionStore) get(id string) (*uploadSession, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, ok := s.sessions[id]
	return sess, ok
}

// --------------------------------------------------------------------------
// UUID helper — no external dependency, uses crypto/rand.
// --------------------------------------------------------------------------

func newUUID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	// Set version 4 and variant bits.
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// --------------------------------------------------------------------------
// HTTP helpers.
// --------------------------------------------------------------------------

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("writeJSON encode error: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, errorResponse{Message: msg})
}

// --------------------------------------------------------------------------
// Handler — POST /uploads/init → 201
// --------------------------------------------------------------------------

func handleInit(cfg config, store *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		// Parse JSON body: {filename, size, chunkSize?}
		var body struct {
			Filename  string `json:"filename"`
			Size      int64  `json:"size"`
			ChunkSize *int64 `json:"chunkSize"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}

		// Validate required fields — mirrors ValidationPipe behaviour.
		if strings.TrimSpace(body.Filename) == "" {
			writeError(w, http.StatusBadRequest, "filename must not be empty")
			return
		}
		if body.Size <= 0 || body.Size > cfg.maxFileBytes {
			writeError(w, http.StatusBadRequest,
				fmt.Sprintf("Invalid size: must be 1..%d", cfg.maxFileBytes))
			return
		}

		effectiveChunkSize := cfg.chunkSizeBytes
		if body.ChunkSize != nil && *body.ChunkSize > 0 {
			effectiveChunkSize = *body.ChunkSize
		}
		totalChunks := int(math.Ceil(float64(body.Size) / float64(effectiveChunkSize)))

		id := newUUID()
		sess := &uploadSession{
			id:          id,
			filename:    body.Filename,
			size:        body.Size,
			chunkSize:   effectiveChunkSize,
			totalChunks: totalChunks,
			receivedChunks: []int{},
			createdAt:   time.Now().UnixMilli(),
			finalized:   false,
		}
		store.set(sess)

		// Create tmp/<id>/ directory eagerly — mirrors fs.mkdir recursive.
		tmpDir := filepath.Join(cfg.tmpDir, id)
		if err := os.MkdirAll(tmpDir, 0o755); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create tmp dir")
			return
		}

		log.Printf("[init] session %s total=%d", id, totalChunks)

		writeJSON(w, http.StatusCreated, initSessionResponse{
			SessionID:   id,
			TotalChunks: totalChunks,
			ChunkSize:   effectiveChunkSize,
		})
	}
}

// --------------------------------------------------------------------------
// Handler — PATCH /uploads/:id/chunks?index=N → 204
// --------------------------------------------------------------------------

func handlePatchChunk(cfg config, store *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPatch {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		id := extractPathSegment(r.URL.Path, 2) // /uploads/<id>/chunks
		sess, ok := store.get(id)
		if !ok {
			writeError(w, http.StatusNotFound, fmt.Sprintf("Upload session %s not found", id))
			return
		}

		indexStr := r.URL.Query().Get("index")
		index, err := strconv.Atoi(indexStr)
		if err != nil || index < 0 || index >= sess.totalChunks {
			writeError(w, http.StatusBadRequest,
				fmt.Sprintf("Chunk index %s out of range [0, %d)", indexStr, sess.totalChunks))
			return
		}

		// Drain raw body — no JSON parsing, mirrors readBody() in TS controller.
		data, err := io.ReadAll(r.Body)
		if err != nil {
			writeError(w, http.StatusBadRequest, "failed to read chunk body")
			return
		}

		// Write <tmp>/<id>/<index>.part
		partPath := filepath.Join(cfg.tmpDir, id, fmt.Sprintf("%d.part", index))
		if err := os.WriteFile(partPath, data, 0o644); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to write chunk")
			return
		}

		// Update receivedChunks — idempotent (overwrite OK), sorted.
		store.mu.Lock()
		if !intSliceContains(sess.receivedChunks, index) {
			sess.receivedChunks = append(sess.receivedChunks, index)
			sort.Ints(sess.receivedChunks)
		}
		store.mu.Unlock()

		log.Printf("[chunk] session %s index=%d size=%dB", id, index, len(data))

		w.WriteHeader(http.StatusNoContent) // 204 — no body
	}
}

// --------------------------------------------------------------------------
// Handler — POST /uploads/:id/finalize → 200
// --------------------------------------------------------------------------

func handleFinalize(cfg config, store *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		id := extractPathSegment(r.URL.Path, 2) // /uploads/<id>/finalize
		sess, ok := store.get(id)
		if !ok {
			writeError(w, http.StatusNotFound, fmt.Sprintf("Upload session %s not found", id))
			return
		}

		store.mu.Lock()
		receivedCount := len(sess.receivedChunks)
		store.mu.Unlock()

		if receivedCount != sess.totalChunks {
			writeError(w, http.StatusBadRequest,
				fmt.Sprintf("Missing chunks: %d", sess.totalChunks-receivedCount))
			return
		}

		// Ensure final directory exists.
		if err := os.MkdirAll(cfg.finalDir, 0o755); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create final dir")
			return
		}

		// Final file path: <finalDir>/<id>-<filename>
		finalPath := filepath.Join(cfg.finalDir, fmt.Sprintf("%s-%s", id, sess.filename))
		outFile, err := os.Create(finalPath)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create output file")
			return
		}
		defer outFile.Close()

		// Merge chunks in order, compute SHA-256 in the same pass.
		h := sha256.New()
		var totalSize int64

		for i := 0; i < sess.totalChunks; i++ {
			partPath := filepath.Join(cfg.tmpDir, id, fmt.Sprintf("%d.part", i))
			partData, err := os.ReadFile(partPath)
			if err != nil {
				writeError(w, http.StatusInternalServerError,
					fmt.Sprintf("failed to read chunk %d", i))
				return
			}
			h.Write(partData)
			if _, err := outFile.Write(partData); err != nil {
				writeError(w, http.StatusInternalServerError,
					fmt.Sprintf("failed to write chunk %d to output", i))
				return
			}
			totalSize += int64(len(partData))
		}

		// Remove tmp/<id>/ directory — mirrors fs.rm recursive force.
		tmpDir := filepath.Join(cfg.tmpDir, id)
		if err := os.RemoveAll(tmpDir); err != nil {
			log.Printf("[finalize] warning: could not remove tmp dir %s: %v", tmpDir, err)
		}

		store.mu.Lock()
		sess.finalized = true
		store.mu.Unlock()

		sha256Hex := hex.EncodeToString(h.Sum(nil))
		log.Printf("[finalize] session %s -> %s sha256=%s", id, finalPath, sha256Hex)

		writeJSON(w, http.StatusOK, finalizeResponse{
			Filename: sess.filename,
			Size:     totalSize,
			SHA256:   sha256Hex,
			Path:     finalPath,
		})
	}
}

// --------------------------------------------------------------------------
// Handler — GET /uploads/:id/status → 200
// --------------------------------------------------------------------------

func handleStatus(store *sessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		id := extractPathSegment(r.URL.Path, 2) // /uploads/<id>/status
		sess, ok := store.get(id)
		if !ok {
			writeError(w, http.StatusNotFound, fmt.Sprintf("Upload session %s not found", id))
			return
		}

		store.mu.Lock()
		received := make([]int, len(sess.receivedChunks))
		copy(received, sess.receivedChunks)
		finalized := sess.finalized
		store.mu.Unlock()

		// Build missing list — mirrors TS getStatus logic.
		missing := []int{}
		receivedSet := make(map[int]bool, len(received))
		for _, idx := range received {
			receivedSet[idx] = true
		}
		for i := 0; i < sess.totalChunks; i++ {
			if !receivedSet[i] {
				missing = append(missing, i)
			}
		}

		writeJSON(w, http.StatusOK, sessionStatusResponse{
			SessionID:   sess.id,
			TotalChunks: sess.totalChunks,
			ChunkSize:   sess.chunkSize,
			Received:    received,
			Missing:     missing,
			Finalized:   finalized,
		})
	}
}

// --------------------------------------------------------------------------
// Router — register all four routes on a plain ServeMux.
// --------------------------------------------------------------------------

func newRouter(cfg config, store *sessionStore) http.Handler {
	mux := http.NewServeMux()

	// POST /uploads/init
	mux.HandleFunc("/uploads/init", handleInit(cfg, store))

	// All /uploads/<id>/... routes dispatched by sub-path suffix.
	mux.HandleFunc("/uploads/", func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path // e.g. /uploads/<id>/chunks or /uploads/<id>/status

		switch {
		// PATCH /uploads/:id/chunks?index=N
		case strings.HasSuffix(path, "/chunks") && r.Method == http.MethodPatch:
			handlePatchChunk(cfg, store)(w, r)

		// POST /uploads/:id/finalize
		case strings.HasSuffix(path, "/finalize") && r.Method == http.MethodPost:
			handleFinalize(cfg, store)(w, r)

		// GET /uploads/:id/status
		case strings.HasSuffix(path, "/status") && r.Method == http.MethodGet:
			handleStatus(store)(w, r)

		default:
			writeError(w, http.StatusNotFound, "route not found")
		}
	})

	// CORS wrapper — mirrors app.enableCors() in TS main.ts.
	return corsMiddleware(mux)
}

// corsMiddleware adds permissive CORS headers matching NestJS enableCors() defaults.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// --------------------------------------------------------------------------
// Path helpers.
// --------------------------------------------------------------------------

// extractPathSegment returns the N-th slash-separated segment from a URL path.
// e.g. "/uploads/abc-123/chunks" with N=2 → "abc-123".
func extractPathSegment(path string, n int) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) > n {
		return parts[n]
	}
	return ""
}

// intSliceContains reports whether v is present in slice s.
func intSliceContains(s []int, v int) bool {
	for _, x := range s {
		if x == v {
			return true
		}
	}
	return false
}

// --------------------------------------------------------------------------
// Entry point.
// --------------------------------------------------------------------------

func main() {
	cfg := loadConfig()
	store := newSessionStore()
	router := newRouter(cfg, store)

	addr := ":" + cfg.port
	log.Printf("[bootstrap] backend listening on http://localhost%s", addr)
	if err := http.ListenAndServe(addr, router); err != nil {
		log.Fatalf("ListenAndServe error: %v", err)
	}
}
