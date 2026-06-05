package academy.starci.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Reads upload-related settings from environment variables.
 * Mirrors the TS UploadConfig: UPLOAD_DEST / UPLOAD_MAX_BYTES / UPLOAD_ALLOWED_MIMES.
 */
@Component
public class UploadProperties {

    /**
     * Directory on disk where uploaded files are stored.
     * Env: UPLOAD_DEST (default: uploads)
     */
    @Value("${UPLOAD_DEST:uploads}")
    private String dest;

    /**
     * Maximum allowed file size in bytes.
     * Env: UPLOAD_MAX_BYTES (default: 5242880 = 5 MB)
     */
    @Value("${UPLOAD_MAX_BYTES:5242880}")
    private long maxBytes;

    /**
     * Comma-separated list of accepted MIME types.
     * Env: UPLOAD_ALLOWED_MIMES (default: image/jpeg,image/png,image/webp)
     */
    @Value("${UPLOAD_ALLOWED_MIMES:image/jpeg,image/png,image/webp}")
    private String allowedMimesRaw;

    public String getDest() {
        return dest;
    }

    public long getMaxBytes() {
        return maxBytes;
    }

    /**
     * Returns the allow-list as a trimmed list of MIME type strings.
     */
    public List<String> getAllowedMimes() {
        return Arrays.stream(allowedMimesRaw.split(","))
                .map(String::trim)
                .toList();
    }
}
