package academy.starci.dto;

import java.util.List;

/**
 * Response body for GET /uploads/:id/status (HTTP 200).
 * Field names must match TS SessionStatusResponse exactly:
 *   sessionId, totalChunks, chunkSize, received, missing, finalized.
 */
public class SessionStatusResponse {

    /** UUID of the upload session. */
    private String sessionId;

    /** Total number of chunks expected. */
    private int totalChunks;

    /** Effective chunk size in bytes. */
    private long chunkSize;

    /** Sorted list of chunk indices already received. */
    private List<Integer> received;

    /** Sorted list of chunk indices not yet received. */
    private List<Integer> missing;

    /** Whether finalize() has been called successfully. */
    private boolean finalized;

    public SessionStatusResponse(
            String sessionId,
            int totalChunks,
            long chunkSize,
            List<Integer> received,
            List<Integer> missing,
            boolean finalized) {
        this.sessionId = sessionId;
        this.totalChunks = totalChunks;
        this.chunkSize = chunkSize;
        this.received = received;
        this.missing = missing;
        this.finalized = finalized;
    }

    public String getSessionId() { return sessionId; }
    public int getTotalChunks() { return totalChunks; }
    public long getChunkSize() { return chunkSize; }
    public List<Integer> getReceived() { return received; }
    public List<Integer> getMissing() { return missing; }
    public boolean isFinalized() { return finalized; }
}
