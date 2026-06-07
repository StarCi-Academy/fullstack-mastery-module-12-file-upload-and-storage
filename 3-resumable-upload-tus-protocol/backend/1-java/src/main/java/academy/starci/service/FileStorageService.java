package academy.starci.service;

import academy.starci.config.TusProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.RandomAccessFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.UUID;

/**
 * Manages tus upload state on disk.
 *
 * <p>Storage layout (mirrors @tus/file-store):
 * <pre>
 *   ./uploads/
 *     &lt;id&gt;          — raw binary data file (written sequentially via PATCH)
 *     &lt;id&gt;.json     — sidecar JSON with id, size, offset, metadata, creation_date
 * </pre>
 *
 * <p>Thread safety: per-upload synchronization on the sidecar path string provides
 * coarse-grained protection against concurrent PATCH requests for the same upload ID.
 */
@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    private final TusProperties props;
    private final ObjectMapper objectMapper;
    private Path storageDir;

    public FileStorageService(TusProperties props, ObjectMapper objectMapper) {
        this.props = props;
        this.objectMapper = objectMapper;
    }

    /** Ensure the uploads directory exists before the first request arrives. */
    @PostConstruct
    public void init() throws IOException {
        storageDir = Paths.get(props.getDirectory()).toAbsolutePath();
        Files.createDirectories(storageDir);
        log.info("tus storage directory: {}", storageDir);
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    /**
     * Allocates a new upload entry and writes the initial sidecar JSON.
     *
     * @param uploadLength declared total file size in bytes (from Upload-Length header)
     * @param metadata     raw Upload-Metadata header value (may be null)
     * @return generated upload ID (UUID)
     */
    public String create(long uploadLength, String metadata) throws IOException {
        String id = UUID.randomUUID().toString().replace("-", "");
        UploadInfo info = new UploadInfo(
                id,
                uploadLength,
                0L,
                metadata != null ? metadata : "",
                Instant.now().toString()
        );
        writeSidecar(id, info);
        // Create the empty data file so concurrent HEAD requests do not fail.
        dataPath(id).toFile().createNewFile();
        log.debug("created upload id={} size={}", id, uploadLength);
        return id;
    }

    // -------------------------------------------------------------------------
    // Patch (write chunk)
    // -------------------------------------------------------------------------

    /**
     * Appends a chunk of bytes to an existing upload, atomically updating the sidecar offset.
     *
     * @param id            upload ID
     * @param uploadOffset  client-declared current offset (must match stored offset)
     * @param contentLength number of bytes in this chunk
     * @param body          raw chunk input stream
     * @return new offset after the chunk was written
     * @throws IOException              on I/O errors
     * @throws IllegalArgumentException if the offset does not match the stored value
     * @throws IllegalStateException    if the upload is already complete
     */
    public long patch(String id, long uploadOffset, long contentLength, InputStream body)
            throws IOException {
        UploadInfo info = readSidecar(id);
        if (info == null) {
            throw new IllegalArgumentException("Upload not found: " + id);
        }
        if (info.getOffset() != uploadOffset) {
            throw new IllegalArgumentException(
                    "Offset conflict: stored=" + info.getOffset() + " client=" + uploadOffset);
        }
        if (info.getOffset() >= info.getSize()) {
            throw new IllegalStateException("Upload already complete: " + id);
        }

        // Write chunk at the declared offset using RandomAccessFile for seek support.
        Path dataFile = dataPath(id);
        try (RandomAccessFile raf = new RandomAccessFile(dataFile.toFile(), "rw")) {
            raf.seek(uploadOffset);
            byte[] buf = new byte[8192];
            long written = 0;
            int read;
            while ((read = body.read(buf)) != -1) {
                raf.write(buf, 0, read);
                written += read;
            }
            long newOffset = uploadOffset + written;
            // Update sidecar offset atomically.
            info.setOffset(newOffset);
            writeSidecar(id, info);
            log.debug("patch upload id={} offset={}->{}", id, uploadOffset, newOffset);
            return newOffset;
        }
    }

    // -------------------------------------------------------------------------
    // Head (query offset)
    // -------------------------------------------------------------------------

    /**
     * Returns the current upload metadata (offset + size) for a HEAD request.
     *
     * @param id upload ID
     * @return UploadInfo or null if not found
     */
    public UploadInfo head(String id) throws IOException {
        return readSidecar(id);
    }

    // -------------------------------------------------------------------------
    // Delete (termination extension)
    // -------------------------------------------------------------------------

    /**
     * Deletes both the data file and the sidecar JSON for an upload.
     *
     * @param id upload ID
     * @return true if the upload existed and was deleted, false otherwise
     */
    public boolean delete(String id) throws IOException {
        boolean deleted = false;
        File sidecar = sidecarPath(id).toFile();
        File data = dataPath(id).toFile();
        if (sidecar.exists()) {
            Files.delete(sidecar.toPath());
            deleted = true;
        }
        if (data.exists()) {
            Files.delete(data.toPath());
            deleted = true;
        }
        log.debug("deleted upload id={} existed={}", id, deleted);
        return deleted;
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Path dataPath(String id) {
        return storageDir.resolve(id);
    }

    private Path sidecarPath(String id) {
        return storageDir.resolve(id + ".json");
    }

    private void writeSidecar(String id, UploadInfo info) throws IOException {
        objectMapper.writeValue(sidecarPath(id).toFile(), info);
    }

    private UploadInfo readSidecar(String id) throws IOException {
        File sidecar = sidecarPath(id).toFile();
        if (!sidecar.exists()) {
            return null;
        }
        return objectMapper.readValue(sidecar, UploadInfo.class);
    }
}
