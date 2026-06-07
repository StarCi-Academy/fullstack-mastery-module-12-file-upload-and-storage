package academy.starci.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Typed configuration bound from the {@code upload.*} namespace in application.yml.
 * Env var equivalents (Spring relaxed binding):
 *   UPLOAD_TMP_DIR, UPLOAD_FINAL_DIR, UPLOAD_CHUNK_SIZE_BYTES, UPLOAD_MAX_FILE_BYTES
 */
@Component
@ConfigurationProperties(prefix = "upload")
public class UploadProperties {

    /** Temporary directory for in-progress chunk parts. Default: "tmp" */
    private String tmpDir = "tmp";

    /** Final destination directory for merged files. Default: "uploads" */
    private String finalDir = "uploads";

    /** Default chunk size in bytes used when client omits chunkSize. Default: 5 MiB */
    private long chunkSizeBytes = 5L * 1024 * 1024;

    /** Maximum allowed total file size in bytes. Default: 1 GiB */
    private long maxFileBytes = 1024L * 1024 * 1024;

    public String getTmpDir() {
        return tmpDir;
    }

    public void setTmpDir(String tmpDir) {
        this.tmpDir = tmpDir;
    }

    public String getFinalDir() {
        return finalDir;
    }

    public void setFinalDir(String finalDir) {
        this.finalDir = finalDir;
    }

    public long getChunkSizeBytes() {
        return chunkSizeBytes;
    }

    public void setChunkSizeBytes(long chunkSizeBytes) {
        this.chunkSizeBytes = chunkSizeBytes;
    }

    public long getMaxFileBytes() {
        return maxFileBytes;
    }

    public void setMaxFileBytes(long maxFileBytes) {
        this.maxFileBytes = maxFileBytes;
    }
}
