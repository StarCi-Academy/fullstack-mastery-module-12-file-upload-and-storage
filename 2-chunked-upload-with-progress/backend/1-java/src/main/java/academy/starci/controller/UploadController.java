package academy.starci.controller;

import academy.starci.dto.FinalizeResponse;
import academy.starci.dto.InitSessionRequest;
import academy.starci.dto.InitSessionResponse;
import academy.starci.dto.SessionStatusResponse;
import academy.starci.service.UploadService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.security.NoSuchAlgorithmException;

/**
 * Chunked upload REST controller — mirrors TS UploadController exactly.
 * Routes: POST /uploads/init, GET /uploads/:id/status,
 *         PATCH /uploads/:id/chunks?index=N, POST /uploads/:id/finalize.
 */
@RestController
@RequestMapping("/uploads")
public class UploadController {

    private final UploadService uploadService;

    public UploadController(UploadService uploadService) {
        this.uploadService = uploadService;
    }

    /**
     * Create a new upload session.
     * Returns 201 with { sessionId, totalChunks, chunkSize }.
     *
     * @param body validated request body — filename, size, optional chunkSize
     * @return init session response
     */
    @PostMapping("/init")
    @ResponseStatus(HttpStatus.CREATED)
    public InitSessionResponse init(@Valid @RequestBody InitSessionRequest body) throws IOException {
        return uploadService.initSession(body.getFilename(), body.getSize(), body.getChunkSize());
    }

    /**
     * Return status bitmap so the client knows which chunks to skip on resume.
     * Returns 200 with { sessionId, totalChunks, chunkSize, received, missing, finalized }.
     *
     * @param id session UUID path param
     * @return session status response
     */
    @GetMapping("/{id}/status")
    public SessionStatusResponse status(@PathVariable("id") String id) {
        return uploadService.getStatus(id);
    }

    /**
     * Receive raw binary body for chunk at the given index and write it to disk.
     * Returns 204 No Content on success.
     * Raw bytes are read from the servlet InputStream to avoid multipart/body-parser interference.
     *
     * @param id      session UUID path param
     * @param index   zero-based chunk index query param
     * @param request raw servlet request for reading binary body
     */
    @PatchMapping("/{id}/chunks")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void patchChunk(
            @PathVariable("id") String id,
            @RequestParam("index") int index,
            HttpServletRequest request) throws IOException {
        // Read raw bytes directly from InputStream — avoids Spring body-parser consuming the stream
        byte[] data = request.getInputStream().readAllBytes();
        uploadService.writeChunk(id, index, data);
    }

    /**
     * Merge every chunk in order, compute SHA-256, remove the tmp folder.
     * Returns 200 with { filename, size, sha256, path }.
     *
     * @param id session UUID path param
     * @return finalize response
     */
    @PostMapping("/{id}/finalize")
    @ResponseStatus(HttpStatus.OK)
    public FinalizeResponse finalize(@PathVariable("id") String id)
            throws IOException, NoSuchAlgorithmException {
        return uploadService.finalize(id);
    }
}
