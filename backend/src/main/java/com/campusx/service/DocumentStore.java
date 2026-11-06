package com.campusx.service;
import com.campusx.exception.ApiException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/** Study documents are PRIVATE: stored outside any public URL and served only through the authenticated download endpoint. */
@Component
public class DocumentStore {
    public record Saved(String path, String type) {}
    @Value("${campusx.upload-dir}") private String dir;

    public Saved save(MultipartFile f) throws IOException {
        byte[] b = f.getBytes();
        if (b.length == 0 || b.length > 10 * 1024 * 1024) throw new ApiException(HttpStatus.BAD_REQUEST, "File must be under 10 MB.");
        String name = f.getOriginalFilename() == null ? "" : f.getOriginalFilename().toLowerCase();
        String type = null;
        if (new String(b, 0, Math.min(5, b.length), StandardCharsets.ISO_8859_1).equals("%PDF-")) type = "pdf";
        else if (b.length > 3 && b[0] == 'P' && b[1] == 'K' && b[2] == 3 && b[3] == 4) { // docx/pptx are zip files
            if (name.endsWith(".docx")) type = "docx"; else if (name.endsWith(".pptx")) type = "pptx";
        }
        if (type == null) throw new ApiException(HttpStatus.BAD_REQUEST, "Only PDF, DOCX or PPTX files are allowed.");
        Path target = Paths.get(dir, "materials"); Files.createDirectories(target);
        String stored = UUID.randomUUID() + "." + type;
        Files.write(target.resolve(stored), b);
        return new Saved("materials/" + stored, type);
    }
    public Path resolve(String rel) {
        Path base = Paths.get(dir).toAbsolutePath().normalize();
        Path p = base.resolve(rel).normalize();
        if (!p.startsWith(base) || !Files.exists(p)) throw new ApiException(HttpStatus.NOT_FOUND, "The file is missing on the server.");
        return p;
    }
    public void delete(String rel) { try { Files.deleteIfExists(Paths.get(dir).resolve(rel)); } catch (IOException e) { /* best effort */ } }
}
