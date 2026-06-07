// Package main implements a tus 1.0 resumable-upload server in idiomatic Go.
// Mirrors the TypeScript (@tus/server + @tus/file-store) reference implementation exactly:
//   - Route prefix  : /files  (env TUS_PATH, default /files)
//   - Storage dir   : ./uploads (env TUS_DIRECTORY, default ./uploads)
//   - Max upload    : 100 MiB  (env TUS_MAX_SIZE, default 104857600)
//   - Port          : 3370     (env PORT, default 3370)
//
// Sidecar metadata per upload: <id>.info stored as JSON with fields:
//   id, size, offset, metadata, creation_date
// (matching the @tus/file-store .info file schema)
package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ----------------------------------------------------------------------------
// Constants — tus 1.0 protocol values
// ----------------------------------------------------------------------------

const (
	// tusResumable is the tus protocol version header value.
	tusResumable = "1.0.0"
	// tusSupportedVersions lists all versions this server accepts.
	tusSupportedVersions = "1.0.0"
	// tusSupportedExtensions lists optional extensions this server implements.
	tusSupportedExtensions = "creation,termination"
)

// ----------------------------------------------------------------------------
// Upload info — matches @tus/file-store .info sidecar schema
// ----------------------------------------------------------------------------

// UploadInfo is serialised to <id>.info alongside the binary data file.
// Field names match @tus/file-store JSON keys exactly for cross-lang parity.
type UploadInfo struct {
	// ID is the upload identifier (hex UUID).
	ID string `json:"id"`
	// Size is the declared total upload length in bytes.
	Size int64 `json:"size"`
	// Offset is the number of bytes received so far.
	Offset int64 `json:"offset"`
	// Metadata holds the decoded Upload-Metadata key/value pairs.
	Metadata map[string]string `json:"metadata"`
	// CreationDate is the RFC3339 timestamp of the POST request.
	CreationDate string `json:"creation_date"`
}

// ----------------------------------------------------------------------------
// Server
// ----------------------------------------------------------------------------

// TusServer holds shared state for all upload sessions.
type TusServer struct {
	// dir is the directory where uploads and .info files are stored.
	dir string
	// maxSize is the maximum allowed Upload-Length in bytes (0 = unlimited).
	maxSize int64
	// path is the HTTP route prefix (e.g. "/files").
	path string
	// mu protects concurrent PATCH writes to the same upload.
	mu sync.Map // key: uploadID -> *sync.Mutex
}

// lockUpload returns a per-upload mutex, creating it if needed.
func (s *TusServer) lockUpload(id string) *sync.Mutex {
	v, _ := s.mu.LoadOrStore(id, &sync.Mutex{})
	return v.(*sync.Mutex)
}

// ----------------------------------------------------------------------------
// ID generation
// ----------------------------------------------------------------------------

// generateID returns a 16-byte hex string suitable for upload IDs.
func generateID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// ----------------------------------------------------------------------------
// Info file helpers
// ----------------------------------------------------------------------------

// infoPath returns the .info sidecar path for a given upload ID.
func (s *TusServer) infoPath(id string) string {
	return filepath.Join(s.dir, id+".info")
}

// dataPath returns the binary data file path for a given upload ID.
func (s *TusServer) dataPath(id string) string {
	return filepath.Join(s.dir, id)
}

// readInfo reads and deserialises a .info sidecar file.
func (s *TusServer) readInfo(id string) (*UploadInfo, error) {
	raw, err := os.ReadFile(s.infoPath(id))
	if err != nil {
		return nil, err
	}
	var info UploadInfo
	if err := json.Unmarshal(raw, &info); err != nil {
		return nil, err
	}
	return &info, nil
}

// writeInfo serialises and writes a .info sidecar file.
func (s *TusServer) writeInfo(info *UploadInfo) error {
	raw, err := json.Marshal(info)
	if err != nil {
		return err
	}
	return os.WriteFile(s.infoPath(info.ID), raw, 0o644)
}

// ----------------------------------------------------------------------------
// Metadata parsing — Upload-Metadata: key base64value, key2 base64value2
// ----------------------------------------------------------------------------

// parseMetadata parses the tus Upload-Metadata header into a string map.
// Each pair is "<key> <base64(value)>"; keys without a value are stored as "".
func parseMetadata(header string) map[string]string {
	result := make(map[string]string)
	if header == "" {
		return result
	}
	for _, part := range strings.Split(header, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		fields := strings.SplitN(part, " ", 2)
		key := strings.TrimSpace(fields[0])
		if len(fields) == 1 || fields[1] == "" {
			result[key] = ""
			continue
		}
		decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(fields[1]))
		if err != nil {
			result[key] = ""
			continue
		}
		result[key] = string(decoded)
	}
	return result
}

// ----------------------------------------------------------------------------
// CORS helpers — mirrors NestJS enableCors({ preflightContinue: true, ... })
// ----------------------------------------------------------------------------

// setCORSHeaders sets permissive CORS headers on every response.
// The TS reference uses preflightContinue so tus handles OPTIONS itself;
// here we let every handler set CORS then each method handler adds tus headers.
func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "OPTIONS, HEAD, GET, POST, PATCH, DELETE")
	w.Header().Set("Access-Control-Allow-Headers",
		"Content-Type, Upload-Length, Upload-Offset, Upload-Metadata, Tus-Resumable, X-HTTP-Method-Override")
	w.Header().Set("Access-Control-Expose-Headers",
		"Upload-Offset, Upload-Length, Tus-Resumable, Tus-Version, Tus-Extension, Tus-Max-Size, Location, Upload-Metadata")
}

// ----------------------------------------------------------------------------
// tus required header validation
// ----------------------------------------------------------------------------

// requireTusResumable validates the Tus-Resumable header (required on all
// non-OPTIONS requests per tus 1.0 spec §3.3).
func requireTusResumable(w http.ResponseWriter, r *http.Request) bool {
	if r.Method == http.MethodOptions {
		return true
	}
	v := r.Header.Get("Tus-Resumable")
	if v != tusResumable {
		http.Error(w, "Tus-Resumable header missing or unsupported", http.StatusPreconditionFailed)
		return false
	}
	return true
}

// ----------------------------------------------------------------------------
// Handler: OPTIONS — tus discovery
// Response: 204 No Content + Tus-Resumable + Tus-Version + Tus-Extension + Tus-Max-Size
// ----------------------------------------------------------------------------

func (s *TusServer) handleOptions(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w)
	w.Header().Set("Tus-Resumable", tusResumable)
	w.Header().Set("Tus-Version", tusSupportedVersions)
	w.Header().Set("Tus-Extension", tusSupportedExtensions)
	if s.maxSize > 0 {
		w.Header().Set("Tus-Max-Size", strconv.FormatInt(s.maxSize, 10))
	}
	w.WriteHeader(http.StatusNoContent) // 204
}

// ----------------------------------------------------------------------------
// Handler: POST — create a new upload resource
// Request:  Tus-Resumable, Upload-Length, [Upload-Metadata]
// Response: 201 Created + Location: <path>/<id>
// ----------------------------------------------------------------------------

func (s *TusServer) handlePost(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w)
	if !requireTusResumable(w, r) {
		return
	}

	// Parse Upload-Length — required for creation extension.
	lengthStr := r.Header.Get("Upload-Length")
	if lengthStr == "" {
		http.Error(w, "Upload-Length header is required", http.StatusBadRequest)
		return
	}
	uploadLength, err := strconv.ParseInt(lengthStr, 10, 64)
	if err != nil || uploadLength < 0 {
		http.Error(w, "Upload-Length must be a non-negative integer", http.StatusBadRequest)
		return
	}
	if s.maxSize > 0 && uploadLength > s.maxSize {
		http.Error(w, fmt.Sprintf("Upload-Length exceeds maximum allowed size (%d)", s.maxSize), http.StatusRequestEntityTooLarge)
		return
	}

	// Parse optional Upload-Metadata.
	metadata := parseMetadata(r.Header.Get("Upload-Metadata"))

	// Generate unique ID and create data + info files.
	id, err := generateID()
	if err != nil {
		http.Error(w, "Failed to generate upload ID", http.StatusInternalServerError)
		return
	}

	info := &UploadInfo{
		ID:           id,
		Size:         uploadLength,
		Offset:       0,
		Metadata:     metadata,
		CreationDate: time.Now().UTC().Format(time.RFC3339),
	}

	// Create empty data file to reserve the slot.
	dataFile, err := os.Create(s.dataPath(id))
	if err != nil {
		http.Error(w, "Failed to create upload file", http.StatusInternalServerError)
		return
	}
	dataFile.Close()

	if err := s.writeInfo(info); err != nil {
		http.Error(w, "Failed to write upload info", http.StatusInternalServerError)
		return
	}

	// Build Location header: scheme://host<path>/<id>
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	location := fmt.Sprintf("%s://%s%s/%s", scheme, r.Host, s.path, id)

	w.Header().Set("Tus-Resumable", tusResumable)
	w.Header().Set("Location", location)
	w.WriteHeader(http.StatusCreated) // 201
}

// ----------------------------------------------------------------------------
// Handler: HEAD — query upload offset and size
// Response: 200 OK + Upload-Offset + Upload-Length + Tus-Resumable
// Cache-Control: no-store (prevents stale offset caching)
// ----------------------------------------------------------------------------

func (s *TusServer) handleHead(w http.ResponseWriter, r *http.Request, id string) {
	setCORSHeaders(w)
	if !requireTusResumable(w, r) {
		return
	}

	info, err := s.readInfo(id)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "Upload not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to read upload info", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Tus-Resumable", tusResumable)
	w.Header().Set("Upload-Offset", strconv.FormatInt(info.Offset, 10))
	w.Header().Set("Upload-Length", strconv.FormatInt(info.Size, 10))
	w.WriteHeader(http.StatusOK) // 200
}

// ----------------------------------------------------------------------------
// Handler: PATCH — append upload data
// Request:  Tus-Resumable, Upload-Offset, Content-Type: application/offset+octet-stream
// Response: 204 No Content + Upload-Offset (new value)
// ----------------------------------------------------------------------------

func (s *TusServer) handlePatch(w http.ResponseWriter, r *http.Request, id string) {
	setCORSHeaders(w)
	if !requireTusResumable(w, r) {
		return
	}

	// Content-Type MUST be application/offset+octet-stream.
	ct := r.Header.Get("Content-Type")
	if ct != "application/offset+octet-stream" {
		http.Error(w, "Content-Type must be application/offset+octet-stream", http.StatusUnsupportedMediaType)
		return
	}

	// Parse Upload-Offset from request.
	offsetStr := r.Header.Get("Upload-Offset")
	if offsetStr == "" {
		http.Error(w, "Upload-Offset header is required", http.StatusBadRequest)
		return
	}
	requestOffset, err := strconv.ParseInt(offsetStr, 10, 64)
	if err != nil || requestOffset < 0 {
		http.Error(w, "Upload-Offset must be a non-negative integer", http.StatusBadRequest)
		return
	}

	// Acquire per-upload lock to serialise concurrent PATCH requests.
	mu := s.lockUpload(id)
	mu.Lock()
	defer mu.Unlock()

	info, err := s.readInfo(id)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "Upload not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to read upload info", http.StatusInternalServerError)
		return
	}

	// Offset mismatch — client and server are out of sync.
	if requestOffset != info.Offset {
		http.Error(w, fmt.Sprintf("Offset mismatch: server has %d, client sent %d", info.Offset, requestOffset), http.StatusConflict)
		return
	}

	// Open data file and seek to current offset.
	dataFile, err := os.OpenFile(s.dataPath(id), os.O_WRONLY, 0o644)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "Upload data file not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to open upload file", http.StatusInternalServerError)
		return
	}
	defer dataFile.Close()

	if _, err := dataFile.Seek(info.Offset, io.SeekStart); err != nil {
		http.Error(w, "Failed to seek in upload file", http.StatusInternalServerError)
		return
	}

	// Copy body into the data file, tracking how many bytes were written.
	written, err := io.Copy(dataFile, r.Body)
	if err != nil {
		http.Error(w, "Failed to write upload data", http.StatusInternalServerError)
		return
	}

	// Persist new offset.
	info.Offset += written
	if err := s.writeInfo(info); err != nil {
		http.Error(w, "Failed to update upload info", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Tus-Resumable", tusResumable)
	w.Header().Set("Upload-Offset", strconv.FormatInt(info.Offset, 10))
	w.WriteHeader(http.StatusNoContent) // 204
}

// ----------------------------------------------------------------------------
// Handler: DELETE — termination extension
// Response: 204 No Content
// ----------------------------------------------------------------------------

func (s *TusServer) handleDelete(w http.ResponseWriter, r *http.Request, id string) {
	setCORSHeaders(w)
	if !requireTusResumable(w, r) {
		return
	}

	// Verify the upload exists before deleting.
	if _, err := s.readInfo(id); err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "Upload not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to read upload info", http.StatusInternalServerError)
		return
	}

	// Remove both the data file and the .info sidecar.
	_ = os.Remove(s.dataPath(id))
	_ = os.Remove(s.infoPath(id))

	w.Header().Set("Tus-Resumable", tusResumable)
	w.WriteHeader(http.StatusNoContent) // 204
}

// ----------------------------------------------------------------------------
// ServeHTTP — route dispatch
// Paths handled:
//   <prefix>          -> OPTIONS / POST
//   <prefix>/<id>     -> OPTIONS / HEAD / PATCH / DELETE
// ----------------------------------------------------------------------------

func (s *TusServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Strip the mount prefix from the URL path.
	path := strings.TrimPrefix(r.URL.Path, s.path)

	// Normalise trailing slashes so both /files and /files/ hit the same branch.
	path = strings.TrimLeft(path, "/")

	// path == ""  ->  collection endpoint  (OPTIONS, POST)
	// path == id  ->  resource endpoint    (OPTIONS, HEAD, PATCH, DELETE)

	if path == "" {
		// Collection endpoint.
		switch r.Method {
		case http.MethodOptions:
			s.handleOptions(w, r)
		case http.MethodPost:
			s.handlePost(w, r)
		default:
			setCORSHeaders(w)
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Resource endpoint — path is the upload ID.
	id := path
	// Reject IDs containing path separators to prevent directory traversal.
	if strings.Contains(id, "/") || strings.Contains(id, "..") {
		http.Error(w, "Invalid upload ID", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodOptions:
		s.handleOptions(w, r)
	case http.MethodHead:
		s.handleHead(w, r, id)
	case http.MethodPatch:
		s.handlePatch(w, r, id)
	case http.MethodDelete:
		s.handleDelete(w, r, id)
	default:
		setCORSHeaders(w)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// ----------------------------------------------------------------------------
// main
// ----------------------------------------------------------------------------

func main() {
	// Read env vars — names match the TypeScript config exactly.
	port := os.Getenv("PORT")
	if port == "" {
		port = "3370"
	}
	tusPath := os.Getenv("TUS_PATH")
	if tusPath == "" {
		tusPath = "/files"
	}
	tusDirectory := os.Getenv("TUS_DIRECTORY")
	if tusDirectory == "" {
		tusDirectory = "./uploads"
	}
	tuMaxSizeStr := os.Getenv("TUS_MAX_SIZE")
	tusMaxSize := int64(104857600) // 100 MiB default
	if tuMaxSizeStr != "" {
		if v, err := strconv.ParseInt(tuMaxSizeStr, 10, 64); err == nil {
			tusMaxSize = v
		}
	}

	// Ensure the upload directory exists.
	if err := os.MkdirAll(tusDirectory, 0o755); err != nil {
		log.Fatalf("[main] failed to create upload directory %q: %v", tusDirectory, err)
	}

	server := &TusServer{
		dir:     tusDirectory,
		maxSize: tusMaxSize,
		path:    tusPath,
	}

	// Mount the tus handler at the configured path prefix.
	// Both /files and /files/<id> must be captured, so use a prefix pattern.
	mux := http.NewServeMux()
	// Go 1.21 ServeMux does not support wildcards — register the exact prefix
	// and use a trailing "/" to capture all sub-paths.
	mux.Handle(tusPath+"/", server)
	mux.Handle(tusPath, server) // collection endpoint without trailing slash

	// Bind to the loopback interface so the dev server is reachable only from
	// localhost (matches the documented http://localhost:3370 startup URL and
	// avoids exposing the upload endpoint on every network interface).
	addr := "127.0.0.1:" + port
	log.Printf("[main] tus backend listening on http://%s (path=%s, dir=%s, maxSize=%d)",
		addr, tusPath, tusDirectory, tusMaxSize)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("[main] ListenAndServe error: %v", err)
	}
}
