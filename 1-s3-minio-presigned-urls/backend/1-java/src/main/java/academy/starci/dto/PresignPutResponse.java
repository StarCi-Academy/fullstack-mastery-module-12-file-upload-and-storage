package academy.starci.dto;

/**
 * Response shape for POST /presign/put.
 * JSON field names must exactly match the TypeScript PresignedUploadInfo + filename:
 *   { key, url, method, expiresInSeconds, filename }
 */
public class PresignPutResponse {

    /** Object key in the bucket — format: <epochMillis>-<uuid> */
    private String key;

    /** Presigned PUT URL the client uses to upload the file directly to MinIO/S3. */
    private String url;

    /** Always "PUT" — tells the client which HTTP method to use on the presigned URL. */
    private String method;

    /** TTL of the presigned URL in seconds (from S3_PRESIGN_EXPIRES_SECONDS env). */
    private int expiresInSeconds;

    /** Echoed back from the request body — display name of the file. */
    private String filename;

    // --- constructor ---

    public PresignPutResponse(String key, String url, String method, int expiresInSeconds, String filename) {
        this.key = key;
        this.url = url;
        this.method = method;
        this.expiresInSeconds = expiresInSeconds;
        this.filename = filename;
    }

    // --- getters (Jackson serialises via getters by default) ---

    public String getKey() { return key; }
    public String getUrl() { return url; }
    public String getMethod() { return method; }
    public int getExpiresInSeconds() { return expiresInSeconds; }
    public String getFilename() { return filename; }
}
