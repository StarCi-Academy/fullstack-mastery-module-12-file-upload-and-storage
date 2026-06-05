package academy.starci.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Typed binding of the {@code s3.*} namespace from application.yml.
 * Each field maps 1-to-1 to an env var defined in the TypeScript contract.
 */
@Component
@ConfigurationProperties(prefix = "s3")
public class S3Properties {

    /** S3_ENDPOINT — MinIO base URL, e.g. http://localhost:9000 */
    private String endpoint = "http://localhost:9000";

    /** S3_REGION — AWS region identifier, e.g. us-east-1 */
    private String region = "us-east-1";

    /** S3_ACCESS_KEY — access key / username */
    private String accessKey = "minioadmin";

    /** S3_SECRET_KEY — secret key / password */
    private String secretKey = "minioadmin";

    /** S3_BUCKET — target bucket name */
    private String bucket = "uploads";

    /** S3_FORCE_PATH_STYLE — must be true for MinIO path-style addressing */
    private boolean forcePathStyle = true;

    /** S3_PRESIGN_EXPIRES_SECONDS — TTL for presigned URLs */
    private int presignExpiresSeconds = 300;

    // --- getters and setters ---

    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getAccessKey() { return accessKey; }
    public void setAccessKey(String accessKey) { this.accessKey = accessKey; }

    public String getSecretKey() { return secretKey; }
    public void setSecretKey(String secretKey) { this.secretKey = secretKey; }

    public String getBucket() { return bucket; }
    public void setBucket(String bucket) { this.bucket = bucket; }

    public boolean isForcePathStyle() { return forcePathStyle; }
    public void setForcePathStyle(boolean forcePathStyle) { this.forcePathStyle = forcePathStyle; }

    public int getPresignExpiresSeconds() { return presignExpiresSeconds; }
    public void setPresignExpiresSeconds(int presignExpiresSeconds) { this.presignExpiresSeconds = presignExpiresSeconds; }
}
