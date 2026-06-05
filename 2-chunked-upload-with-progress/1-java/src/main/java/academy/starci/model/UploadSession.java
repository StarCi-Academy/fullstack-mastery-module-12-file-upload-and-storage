package academy.starci.model;

import java.util.ArrayList;
import java.util.List;

/**
 * In-memory state of a single upload session.
 * Held in a ConcurrentHashMap keyed by session id (UUID).
 * chunkSize and totalChunks are immutable after init; receivedChunks grows per PATCH.
 */
public class UploadSession {

    /** UUID assigned at init — used as path param {@code :id}. */
    private final String id;

    /** Original filename provided by the client. */
    private final String filename;

    /** Total file size in bytes as declared by the client. */
    private final long size;

    /** Effective chunk size in bytes (client override or server default). */
    private final long chunkSize;

    /** Ceiling of (size / chunkSize) — fixed at init. */
    private final int totalChunks;

    /** Sorted list of received chunk indices. Guarded by synchronized blocks in the service. */
    private final List<Integer> receivedChunks = new ArrayList<>();

    /** Epoch millis of session creation. */
    private final long createdAt;

    /** Set to true after finalize() succeeds. */
    private boolean finalized = false;

    public UploadSession(String id, String filename, long size, long chunkSize, int totalChunks) {
        this.id = id;
        this.filename = filename;
        this.size = size;
        this.chunkSize = chunkSize;
        this.totalChunks = totalChunks;
        this.createdAt = System.currentTimeMillis();
    }

    public String getId() { return id; }
    public String getFilename() { return filename; }
    public long getSize() { return size; }
    public long getChunkSize() { return chunkSize; }
    public int getTotalChunks() { return totalChunks; }
    public List<Integer> getReceivedChunks() { return receivedChunks; }
    public long getCreatedAt() { return createdAt; }
    public boolean isFinalized() { return finalized; }
    public void setFinalized(boolean finalized) { this.finalized = finalized; }
}
