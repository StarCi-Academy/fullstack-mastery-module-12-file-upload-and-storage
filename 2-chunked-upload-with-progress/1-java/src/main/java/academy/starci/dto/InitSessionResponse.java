package academy.starci.dto;

/**
 * Response body for POST /uploads/init (HTTP 201).
 * Field names must match TS InitSessionResponse exactly: sessionId, totalChunks, chunkSize.
 */
public class InitSessionResponse {

    /** UUID of the created upload session. */
    private String sessionId;

    /** Total number of chunks the client must PATCH. */
    private int totalChunks;

    /** Effective chunk size in bytes (server default or client override). */
    private long chunkSize;

    public InitSessionResponse(String sessionId, int totalChunks, long chunkSize) {
        this.sessionId = sessionId;
        this.totalChunks = totalChunks;
        this.chunkSize = chunkSize;
    }

    public String getSessionId() { return sessionId; }
    public int getTotalChunks() { return totalChunks; }
    public long getChunkSize() { return chunkSize; }
}
