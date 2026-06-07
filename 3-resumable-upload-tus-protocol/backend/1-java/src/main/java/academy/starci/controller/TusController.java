package academy.starci.controller;

import academy.starci.config.TusProperties;
import academy.starci.service.FileStorageService;
import academy.starci.service.UploadInfo;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.InputStream;

/**
 * tus 1.0 protocol controller — handles all five operations over /files.
 *
 * <p>Parity table vs TypeScript @tus/server (all routes, status codes, headers):
 * <pre>
 *   OPTIONS  /files          -> 204  Tus-Resumable, Tus-Version, Tus-Extension, Tus-Max-Size
 *   POST     /files          -> 201  Location: /files/{id}
 *   HEAD     /files/{id}     -> 200  Upload-Offset, Upload-Length, Tus-Resumable
 *   PATCH    /files/{id}     -> 204  Upload-Offset (new value)
 *   DELETE   /files/{id}     -> 204  (termination extension)
 * </pre>
 *
 * <p>Header constants used here match tus 1.0 spec verbatim (case matches spec recommendation).
 */
@RestController
@RequestMapping("${tus.path:/files}")
public class TusController {

    private static final Logger log = LoggerFactory.getLogger(TusController.class);

    /** tus protocol version supported by this implementation. */
    private static final String TUS_VERSION = "1.0.0";

    /** Comma-separated list of supported extensions (creation + termination). */
    private static final String TUS_EXTENSION = "creation,termination";

    private final TusProperties props;
    private final FileStorageService storageService;

    public TusController(TusProperties props, FileStorageService storageService) {
        this.props = props;
        this.storageService = storageService;
    }

    // -------------------------------------------------------------------------
    // OPTIONS — discovery
    // -------------------------------------------------------------------------

    /**
     * tus discovery endpoint.
     * Returns server capabilities: supported version, extensions, and max upload size.
     * Status 204 (No Content) as specified by tus 1.0.
     */
    @RequestMapping(method = RequestMethod.OPTIONS)
    public ResponseEntity<Void> options() {
        HttpHeaders headers = tusBaseHeaders();
        headers.set("Tus-Version", TUS_VERSION);
        headers.set("Tus-Extension", TUS_EXTENSION);
        headers.set("Tus-Max-Size", String.valueOf(props.getMaxSize()));
        return ResponseEntity.status(HttpStatus.NO_CONTENT).headers(headers).build();
    }

    // -------------------------------------------------------------------------
    // POST — create upload
    // -------------------------------------------------------------------------

    /**
     * Creates a new upload resource.
     *
     * <p>Required headers: Upload-Length (total bytes), Tus-Resumable (must be 1.0.0).
     * Optional header: Upload-Metadata (base64 key-value pairs).
     *
     * <p>Returns 201 Created with Location header pointing to the new upload URL.
     */
    @PostMapping
    public ResponseEntity<Void> create(
            @RequestHeader("Upload-Length") long uploadLength,
            @RequestHeader(value = "Upload-Metadata", required = false) String uploadMetadata,
            @RequestHeader(value = "Tus-Resumable", defaultValue = "1.0.0") String tusResumable,
            HttpServletRequest request
    ) throws IOException {
        if (uploadLength < 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        if (uploadLength > props.getMaxSize()) {
            // 413 Request Entity Too Large — upload exceeds Tus-Max-Size.
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).build();
        }

        String id = storageService.create(uploadLength, uploadMetadata);

        // Build Location URL using the incoming request base URL so it works behind a proxy.
        String location = buildLocationUrl(request, id);

        HttpHeaders headers = tusBaseHeaders();
        headers.set("Location", location);
        return ResponseEntity.status(HttpStatus.CREATED).headers(headers).build();
    }

    // -------------------------------------------------------------------------
    // HEAD — query offset
    // -------------------------------------------------------------------------

    /**
     * Returns the current upload offset and total length.
     * Used by the client to resume after a network interruption.
     * Status 200 with Upload-Offset and Upload-Length headers.
     */
    @RequestMapping(value = "/{id}", method = RequestMethod.HEAD)
    public ResponseEntity<Void> head(@PathVariable String id) throws IOException {
        UploadInfo info = storageService.head(id);
        if (info == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        HttpHeaders headers = tusBaseHeaders();
        headers.set("Upload-Offset", String.valueOf(info.getOffset()));
        headers.set("Upload-Length", String.valueOf(info.getSize()));
        // Cache-Control: no-store prevents browsers from caching stale offset values.
        headers.set("Cache-Control", "no-store");
        return ResponseEntity.ok().headers(headers).build();
    }

    // -------------------------------------------------------------------------
    // PATCH — append chunk
    // -------------------------------------------------------------------------

    /**
     * Appends a chunk to an existing upload.
     *
     * <p>Required headers:
     * <ul>
     *   <li>Content-Type: application/offset+octet-stream</li>
     *   <li>Upload-Offset: current byte offset (must match stored value)</li>
     *   <li>Tus-Resumable: 1.0.0</li>
     * </ul>
     *
     * <p>Returns 204 No Content with the new Upload-Offset value.
     */
    @PatchMapping(value = "/{id}", consumes = "application/offset+octet-stream")
    public ResponseEntity<Void> patch(
            @PathVariable String id,
            @RequestHeader("Upload-Offset") long uploadOffset,
            @RequestHeader(value = "Content-Length", required = false) Long contentLength,
            HttpServletRequest request
    ) throws IOException {
        UploadInfo existing = storageService.head(id);
        if (existing == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        long newOffset;
        try (InputStream body = request.getInputStream()) {
            newOffset = storageService.patch(id, uploadOffset, contentLength != null ? contentLength : 0L, body);
        } catch (IllegalArgumentException e) {
            // Offset mismatch — 409 Conflict as per tus 1.0 spec.
            log.warn("PATCH conflict for id={}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (IllegalStateException e) {
            // Upload already complete.
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        HttpHeaders headers = tusBaseHeaders();
        headers.set("Upload-Offset", String.valueOf(newOffset));
        return ResponseEntity.status(HttpStatus.NO_CONTENT).headers(headers).build();
    }

    // -------------------------------------------------------------------------
    // DELETE — termination extension
    // -------------------------------------------------------------------------

    /**
     * Terminates an upload, freeing server-side resources.
     * Part of the tus "termination" extension (declared in Tus-Extension on OPTIONS).
     * Returns 204 No Content regardless of whether the upload existed.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) throws IOException {
        storageService.delete(id);
        HttpHeaders headers = tusBaseHeaders();
        return ResponseEntity.status(HttpStatus.NO_CONTENT).headers(headers).build();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Returns headers common to every tus response: Tus-Resumable version header.
     */
    private HttpHeaders tusBaseHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Tus-Resumable", TUS_VERSION);
        return headers;
    }

    /**
     * Builds the absolute Location URL for a newly created upload.
     * Uses the incoming request's scheme + host so the URL works behind a reverse proxy.
     */
    private String buildLocationUrl(HttpServletRequest request, String id) {
        // Prefer X-Forwarded-* headers when behind a proxy.
        String scheme = getHeader(request, "X-Forwarded-Proto", request.getScheme());
        String host = getHeader(request, "X-Forwarded-Host", request.getHeader("Host"));
        if (host == null) {
            host = request.getServerName() + ":" + request.getServerPort();
        }
        return scheme + "://" + host + props.getPath() + "/" + id;
    }

    private String getHeader(HttpServletRequest request, String name, String fallback) {
        String value = request.getHeader(name);
        return (value != null && !value.isBlank()) ? value : fallback;
    }
}
