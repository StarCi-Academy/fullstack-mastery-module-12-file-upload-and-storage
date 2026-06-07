package academy.starci.service;

import academy.starci.config.S3Properties;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.time.Duration;
import java.util.UUID;

/**
 * S3Service — wraps AWS SDK v2 S3Presigner to sign short-lived PUT and GET URLs.
 * Mirrors the TypeScript S3Service methods: createUploadUrl and createDownloadUrl.
 */
@Service
public class S3Service {

    private final S3Presigner presigner;
    private final S3Properties props;

    public S3Service(S3Presigner presigner, S3Properties props) {
        this.presigner = presigner;
        this.props = props;
    }

    /**
     * Signs a PUT URL so the client uploads directly to MinIO — bypassing the backend.
     * Key format: <epochMillis>-<uuid> (matches TypeScript: `${Date.now()}-${randomUUID()}`).
     *
     * @param contentType MIME type the client must include in the PUT request
     * @return object key and signed PUT URL with configured TTL
     */
    public PresignedUploadResult createUploadUrl(String contentType) {
        // Build object key: epoch milliseconds + UUID — same pattern as TS
        String key = System.currentTimeMillis() + "-" + UUID.randomUUID();

        // PutObjectRequest represents the S3 operation to be presigned
        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(props.getBucket())
                .key(key)
                .contentType(contentType)
                .build();

        // Wrap in a presign request with the configured TTL duration
        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(props.getPresignExpiresSeconds()))
                .putObjectRequest(putRequest)
                .build();

        // Generate the presigned URL — no HTTP call is made here
        PresignedPutObjectRequest presigned = presigner.presignPutObject(presignRequest);

        return new PresignedUploadResult(key, presigned.url().toString(), props.getPresignExpiresSeconds());
    }

    /**
     * Signs a short-lived GET URL — the bucket stays private but allows temporary downloads.
     * Mirrors TypeScript createDownloadUrl which uses getSignedUrl(s3, GetObjectCommand, ...).
     *
     * @param key the object key to sign
     * @return the presigned GET URL as a string
     */
    public String createDownloadUrl(String key) {
        // GetObjectRequest identifies which object to presign for download
        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(props.getBucket())
                .key(key)
                .build();

        // Wrap in presign request with configured TTL
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(props.getPresignExpiresSeconds()))
                .getObjectRequest(getRequest)
                .build();

        // Generate the presigned GET URL
        PresignedGetObjectRequest presigned = presigner.presignGetObject(presignRequest);

        return presigned.url().toString();
    }

    /**
     * Value type holding the result of createUploadUrl.
     * Passed back to the controller which merges it with the request filename.
     */
    public record PresignedUploadResult(String key, String url, int expiresInSeconds) {}
}
