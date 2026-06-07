package academy.starci.service;

import academy.starci.config.UploadProperties;
import academy.starci.dto.FinalizeResponse;
import academy.starci.dto.InitSessionResponse;
import academy.starci.dto.SessionStatusResponse;
import academy.starci.model.UploadSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Core service for chunked upload sessions.
 * Sessions are stored in-memory in a ConcurrentHashMap.
 * Chunks are written to {@code <tmpDir>/<id>/<n>.part} on disk.
 * Finalize merges all parts in order, computes SHA-256, then removes the tmp folder.
 */
@Service
public class UploadService {

    private static final Logger log = LoggerFactory.getLogger(UploadService.class);

    private final UploadProperties props;

    /** In-memory session store — UUID -> UploadSession. */
    private final ConcurrentHashMap<String, UploadSession> sessions = new ConcurrentHashMap<>();

    public UploadService(UploadProperties props) {
        this.props = props;
    }

    /**
     * Create a new upload session.
     * totalChunks = ceil(size / chunkSize); persists the tmp directory immediately.
     *
     * @param filename    original file name from the client
     * @param size        total declared file size in bytes
     * @param chunkSize   optional client chunk size override (null = use server default)
     * @return {@link InitSessionResponse} — sessionId, totalChunks, chunkSize
     */
    public InitSessionResponse initSession(String filename, long size, Long chunkSize) throws IOException {
        if (size <= 0 || size > props.getMaxFileBytes()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid size: must be 1.." + props.getMaxFileBytes());
        }

        // Use client-supplied chunkSize if valid, otherwise fall back to server default
        long effectiveChunkSize = (chunkSize != null && chunkSize > 0)
                ? chunkSize
                : props.getChunkSizeBytes();

        int totalChunks = (int) Math.ceil((double) size / effectiveChunkSize);
        String id = UUID.randomUUID().toString();

        UploadSession session = new UploadSession(id, filename, size, effectiveChunkSize, totalChunks);
        sessions.put(id, session);

        // Create tmp directory upfront so PATCH can write immediately
        Path tmpDir = Paths.get(props.getTmpDir(), id);
        Files.createDirectories(tmpDir);

        log.info("init session {} total={}", id, totalChunks);
        return new InitSessionResponse(id, totalChunks, effectiveChunkSize);
    }

    /**
     * Write a single chunk to {@code <tmpDir>/<id>/<index>.part}.
     * Idempotent: re-sending the same index overwrites the existing part file.
     *
     * @param id    session UUID
     * @param index zero-based chunk index (must be in [0, totalChunks))
     * @param data  raw chunk bytes
     */
    public void writeChunk(String id, int index, byte[] data) throws IOException {
        UploadSession session = requireSession(id);

        if (index < 0 || index >= session.getTotalChunks()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Chunk index " + index + " out of range [0, " + session.getTotalChunks() + ")");
        }

        Path partPath = Paths.get(props.getTmpDir(), id, index + ".part");
        Files.write(partPath, data);

        // Update receivedChunks — synchronized to avoid concurrent list corruption
        synchronized (session.getReceivedChunks()) {
            if (!session.getReceivedChunks().contains(index)) {
                session.getReceivedChunks().add(index);
                Collections.sort(session.getReceivedChunks());
            }
        }

        log.info("received chunk {}/{} ({}B)", index, session.getTotalChunks(), data.length);
    }

    /**
     * Return the current session status including received/missing chunk bitmaps.
     *
     * @param id session UUID
     * @return {@link SessionStatusResponse}
     */
    public SessionStatusResponse getStatus(String id) {
        UploadSession session = requireSession(id);

        List<Integer> received;
        synchronized (session.getReceivedChunks()) {
            received = new ArrayList<>(session.getReceivedChunks());
        }

        List<Integer> missing = new ArrayList<>();
        for (int i = 0; i < session.getTotalChunks(); i++) {
            if (!received.contains(i)) {
                missing.add(i);
            }
        }

        return new SessionStatusResponse(
                session.getId(),
                session.getTotalChunks(),
                session.getChunkSize(),
                received,
                missing,
                session.isFinalized());
    }

    /**
     * Merge all chunks in order, compute SHA-256 in the same pass, remove the tmp folder.
     * Throws 400 if not all chunks have been received.
     *
     * @param id session UUID
     * @return {@link FinalizeResponse} — filename, size, sha256, path
     */
    public FinalizeResponse finalize(String id) throws IOException, NoSuchAlgorithmException {
        UploadSession session = requireSession(id);

        int receivedCount;
        synchronized (session.getReceivedChunks()) {
            receivedCount = session.getReceivedChunks().size();
        }

        if (receivedCount != session.getTotalChunks()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Missing chunks: " + (session.getTotalChunks() - receivedCount));
        }

        // Ensure the final output directory exists
        Path finalDir = Paths.get(props.getFinalDir());
        Files.createDirectories(finalDir);

        String finalFilename = id + "-" + session.getFilename();
        Path finalPath = finalDir.resolve(finalFilename);

        MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
        long totalSize = 0;

        // Stream-concatenate chunks in order and compute SHA-256 in the same pass
        try (FileOutputStream out = new FileOutputStream(finalPath.toFile())) {
            for (int i = 0; i < session.getTotalChunks(); i++) {
                Path partPath = Paths.get(props.getTmpDir(), id, i + ".part");
                try (FileInputStream in = new FileInputStream(partPath.toFile())) {
                    byte[] buf = new byte[8192];
                    int read;
                    while ((read = in.read(buf)) != -1) {
                        out.write(buf, 0, read);
                        sha256.update(buf, 0, read);
                        totalSize += read;
                    }
                }
            }
        }

        // Remove tmp folder after successful merge
        deleteDirectory(Paths.get(props.getTmpDir(), id));

        session.setFinalized(true);

        // Hex-encode the SHA-256 digest (lowercase, matching TS hash.digest("hex"))
        byte[] digestBytes = sha256.digest();
        StringBuilder hexSha256 = new StringBuilder(digestBytes.length * 2);
        for (byte b : digestBytes) {
            hexSha256.append(String.format("%02x", b));
        }

        log.info("finalized -> {}", finalPath);
        return new FinalizeResponse(session.getFilename(), totalSize, hexSha256.toString(), finalPath.toString());
    }

    /**
     * Look up the session by id; throw 404 if not found.
     *
     * @param id session UUID
     * @return the {@link UploadSession}
     */
    private UploadSession requireSession(String id) {
        UploadSession session = sessions.get(id);
        if (session == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Upload session " + id + " not found");
        }
        return session;
    }

    /**
     * Recursively delete a directory and all its contents.
     *
     * @param dir directory path to remove
     */
    private void deleteDirectory(Path dir) throws IOException {
        if (!Files.exists(dir)) return;
        try (var stream = Files.walk(dir)) {
            stream.sorted(java.util.Comparator.reverseOrder())
                  .map(Path::toFile)
                  .forEach(java.io.File::delete);
        }
    }
}
