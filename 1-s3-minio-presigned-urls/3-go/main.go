package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

// s3Config holds all MinIO/S3 connection parameters read from environment variables.
// Defaults mirror the TypeScript config defaults (s3.config.ts).
type s3Config struct {
	endpoint             string
	region               string
	accessKey            string
	secretKey            string
	bucket               string
	forcePathStyle       bool
	presignExpiresSeconds int
}

// loadConfig reads S3_* environment variables and applies defaults identical to the TS implementation.
func loadConfig() s3Config {
	presignExpires := 300
	if v := os.Getenv("S3_PRESIGN_EXPIRES_SECONDS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			presignExpires = n
		}
	}

	forcePathStyle := true
	if v := os.Getenv("S3_FORCE_PATH_STYLE"); v != "" {
		forcePathStyle = v == "true"
	}

	cfg := s3Config{
		endpoint:             getEnvOrDefault("S3_ENDPOINT", "http://localhost:9000"),
		region:               getEnvOrDefault("S3_REGION", "us-east-1"),
		accessKey:            getEnvOrDefault("S3_ACCESS_KEY", "minioadmin"),
		secretKey:            getEnvOrDefault("S3_SECRET_KEY", "minioadmin"),
		bucket:               getEnvOrDefault("S3_BUCKET", "uploads"),
		forcePathStyle:       forcePathStyle,
		presignExpiresSeconds: presignExpires,
	}
	return cfg
}

// getEnvOrDefault returns the environment variable value or a fallback default.
func getEnvOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

// presignedUploadInfo mirrors PresignedUploadInfo from the TypeScript service.
// JSON field names are identical to the TS response shape.
type presignedUploadInfo struct {
	Key              string `json:"key"`
	URL              string `json:"url"`
	Method           string `json:"method"`
	ExpiresInSeconds int    `json:"expiresInSeconds"`
}

// presignPutRequest mirrors PresignPutDto — body of POST /presign/put.
type presignPutRequest struct {
	Filename    string `json:"filename"`
	ContentType string `json:"contentType"`
}

// presignPutResponse is the full response for POST /presign/put:
// presignedUploadInfo fields + filename (matches TS: { ...info, filename: dto.filename }).
type presignPutResponse struct {
	Key              string `json:"key"`
	URL              string `json:"url"`
	Method           string `json:"method"`
	ExpiresInSeconds int    `json:"expiresInSeconds"`
	Filename         string `json:"filename"`
}

// presignGetResponse is the response for GET /presign/get/:key.
// expiresInSeconds is hardcoded to 300 (matches TS controller line 49).
type presignGetResponse struct {
	URL              string `json:"url"`
	Key              string `json:"key"`
	ExpiresInSeconds int    `json:"expiresInSeconds"`
}

// server holds the S3 presign client and config needed to handle requests.
type server struct {
	presignClient *s3.PresignClient
	cfg           s3Config
}

// createUploadURL generates a presigned PUT URL — mirrors S3Service.createUploadUrl in TS.
// key format: <epochMillis>-<uuid> (identical to Date.now() + randomUUID() in TS).
func (s *server) createUploadURL(contentType string) (*presignedUploadInfo, error) {
	// Build key: epoch-ms timestamp + UUID — identical to TS: `${Date.now()}-${randomUUID()}`
	epochMs := time.Now().UnixMilli()
	key := fmt.Sprintf("%d-%s", epochMs, uuid.New().String())

	input := &s3.PutObjectInput{
		Bucket:      aws.String(s.cfg.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}

	result, err := s.presignClient.PresignPutObject(
		context.Background(),
		input,
		s3.WithPresignExpires(time.Duration(s.cfg.presignExpiresSeconds)*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("presign put failed: %w", err)
	}

	return &presignedUploadInfo{
		Key:              key,
		URL:              result.URL,
		Method:           "PUT",
		ExpiresInSeconds: s.cfg.presignExpiresSeconds,
	}, nil
}

// createDownloadURL generates a presigned GET URL — mirrors S3Service.createDownloadUrl in TS.
func (s *server) createDownloadURL(key string) (string, error) {
	input := &s3.GetObjectInput{
		Bucket: aws.String(s.cfg.bucket),
		Key:    aws.String(key),
	}

	result, err := s.presignClient.PresignGetObject(
		context.Background(),
		input,
		s3.WithPresignExpires(time.Duration(s.cfg.presignExpiresSeconds)*time.Second),
	)
	if err != nil {
		return "", fmt.Errorf("presign get failed: %w", err)
	}

	return result.URL, nil
}

// handlePresignPut handles POST /presign/put.
// Request body: { filename, contentType }
// Response 200: { key, url, method:"PUT", expiresInSeconds, filename }
func (s *server) handlePresignPut(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req presignPutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(req.Filename) == "" || strings.TrimSpace(req.ContentType) == "" {
		http.Error(w, "filename and contentType are required", http.StatusBadRequest)
		return
	}

	info, err := s.createUploadURL(req.ContentType)
	if err != nil {
		log.Printf("createUploadURL error: %v", err)
		http.Error(w, "failed to create presigned URL", http.StatusInternalServerError)
		return
	}

	// Merge info + filename — matches TS: return { ...info, filename: dto.filename }
	resp := presignPutResponse{
		Key:              info.Key,
		URL:              info.URL,
		Method:           info.Method,
		ExpiresInSeconds: info.ExpiresInSeconds,
		Filename:         req.Filename,
	}

	writeJSON(w, http.StatusOK, resp)
}

// handlePresignGet handles GET /presign/get/:key.
// URL param :key is URL-decoded before use (mirrors TS decodeURIComponent).
// Response 200: { url, key, expiresInSeconds: 300 }
func (s *server) handlePresignGet(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract :key from path — strip "/presign/get/" prefix
	rawKey := strings.TrimPrefix(r.URL.Path, "/presign/get/")
	if rawKey == "" {
		http.Error(w, "key is required", http.StatusBadRequest)
		return
	}

	// URL-decode the key — mirrors TS: decodeURIComponent(key)
	decoded, err := urlDecode(rawKey)
	if err != nil {
		http.Error(w, "invalid key encoding", http.StatusBadRequest)
		return
	}

	signedURL, err := s.createDownloadURL(decoded)
	if err != nil {
		log.Printf("createDownloadURL error: %v", err)
		http.Error(w, "failed to create presigned URL", http.StatusInternalServerError)
		return
	}

	// expiresInSeconds is hardcoded 300 — matches TS controller line 49
	resp := presignGetResponse{
		URL:              signedURL,
		Key:              decoded,
		ExpiresInSeconds: 300,
	}

	writeJSON(w, http.StatusOK, resp)
}

// writeJSON serialises v as JSON and sets Content-Type header.
func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("writeJSON encode error: %v", err)
	}
}

// urlDecode decodes a percent-encoded URL path segment.
// net/url.PathUnescape is equivalent to JS decodeURIComponent — decodes %XX but leaves + literal.
func urlDecode(s string) (string, error) {
	return url.PathUnescape(s)
}

// newS3PresignClient constructs an AWS S3 PresignClient configured for MinIO compatibility.
// BaseEndpoint + UsePathStyle mirrors the TS S3Module forRootAsync config.
func newS3PresignClient(cfg s3Config) *s3.PresignClient {
	// Use the static credentials provider — same as { accessKeyId, secretAccessKey } in TS.
	awsCfg := aws.Config{
		Region:      cfg.region,
		Credentials: credentials.NewStaticCredentialsProvider(cfg.accessKey, cfg.secretKey, ""),
	}

	// s3.Options.BaseEndpoint is the recommended way to point at a custom endpoint (MinIO).
	// UsePathStyle=true is required for MinIO path-style addressing.
	s3Client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(cfg.endpoint)
		o.UsePathStyle = cfg.forcePathStyle
	})

	return s3.NewPresignClient(s3Client)
}

func main() {
	cfg := loadConfig()

	presignClient := newS3PresignClient(cfg)
	srv := &server{
		presignClient: presignClient,
		cfg:           cfg,
	}

	mux := http.NewServeMux()

	// POST /presign/put — mint a presigned PUT URL for direct client upload
	mux.HandleFunc("/presign/put", srv.handlePresignPut)

	// GET /presign/get/{key} — mint a presigned GET URL for private-bucket download
	// The trailing slash pattern catches /presign/get/<any-key> in Go 1.21 stdlib mux.
	mux.HandleFunc("/presign/get/", srv.handlePresignGet)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	// Bind loopback explicitly (overridable via HOST) so local E2E does not trip the
	// host firewall prompt that fires when a fresh binary listens on all interfaces.
	host := getEnvOrDefault("HOST", "127.0.0.1")
	addr := host + ":" + port
	log.Printf("Go S3 presign server listening on http://%s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("ListenAndServe error: %v", err)
	}
}
