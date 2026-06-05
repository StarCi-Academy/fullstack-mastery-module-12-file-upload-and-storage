package academy.starci.dto;

/**
 * Response body for POST /uploads/:id/finalize (HTTP 200).
 * Field names must match TS FinalizeResponse exactly: filename, size, sha256, path.
 */
public class FinalizeResponse {

    /** Original filename as provided at init. */
    private String filename;

    /** Actual merged file size in bytes (sum of all chunk lengths). */
    private long size;

    /** Hex-encoded SHA-256 digest computed during the merge pass. */
    private String sha256;

    /** Absolute or relative path of the saved merged file on the server. */
    private String path;

    public FinalizeResponse(String filename, long size, String sha256, String path) {
        this.filename = filename;
        this.size = size;
        this.sha256 = sha256;
        this.path = path;
    }

    public String getFilename() { return filename; }
    public long getSize() { return size; }
    public String getSha256() { return sha256; }
    public String getPath() { return path; }
}
