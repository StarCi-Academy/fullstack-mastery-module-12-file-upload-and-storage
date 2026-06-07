package academy.starci.service;

import academy.starci.config.UploadProperties;
import academy.starci.dto.UploadedFileInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Handles persisting the uploaded file to disk and building the response DTO.
 * Mirrors TS UploadService.describe(): filename = <epochMillis>-<originalName>.
 */
@Service
public class UploadService {

    private static final Logger logger = LoggerFactory.getLogger(UploadService.class);

    private final UploadProperties uploadProperties;

    public UploadService(UploadProperties uploadProperties) {
        this.uploadProperties = uploadProperties;
    }

    /**
     * Saves the multipart file to the configured destination directory and returns metadata.
     * Filename format: <System.currentTimeMillis()>-<originalFilename>
     *
     * @param file the validated multipart file
     * @return UploadedFileInfo matching the TS response shape
     * @throws IOException if writing to disk fails
     */
    public UploadedFileInfo save(MultipartFile file) throws IOException {
        // Ensure the upload directory exists — use absolute path so transferTo() works
        // regardless of the JVM working directory (Tomcat temp dir under Maven).
        Path destDir = Paths.get(uploadProperties.getDest()).toAbsolutePath();
        Files.createDirectories(destDir);

        // Build stored filename: <epochMillis>-<originalName>
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload";
        String storedFilename = System.currentTimeMillis() + "-" + originalName;
        Path storedPath = destDir.resolve(storedFilename);

        // Write bytes to disk.
        file.transferTo(storedPath.toFile());

        long sizeKb = Math.round(file.getSize() / 1024.0);
        logger.info("saved {} KB to {}", sizeKb, storedPath);

        // Normalise path separator to forward-slash for cross-platform consistency.
        String relPath = storedPath.toString().replace(File.separatorChar, '/');

        return new UploadedFileInfo(
                originalName,
                storedFilename,
                file.getSize(),
                file.getContentType(),
                relPath
        );
    }
}
