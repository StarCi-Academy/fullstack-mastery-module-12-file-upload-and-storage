package academy.starci.dto;

/**
 * Response shape for GET /presign/get/:key.
 * JSON field names must exactly match the TypeScript response:
 *   { url, key, expiresInSeconds }
 * Note: expiresInSeconds is hardcoded to 300 in the TS contract — replicated here.
 */
public class PresignGetResponse {

    /** Presigned GET URL for downloading the object. */
    private String url;

    /** Object key echoed back (URL-decoded, same as the TS contract). */
    private String key;

    /** Hardcoded 300 — mirrors the TS controller which always returns 300 for GET URLs. */
    private int expiresInSeconds;

    // --- constructor ---

    public PresignGetResponse(String url, String key, int expiresInSeconds) {
        this.url = url;
        this.key = key;
        this.expiresInSeconds = expiresInSeconds;
    }

    // --- getters ---

    public String getUrl() { return url; }
    public String getKey() { return key; }
    public int getExpiresInSeconds() { return expiresInSeconds; }
}
