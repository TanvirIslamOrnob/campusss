package com.campusx.service;
import com.campusx.exception.ApiException;
import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/** Saves validated images under uploads/<folder>/ with random names. Checks the file's real bytes, not the client-supplied name or type. */
@Component
public class ImageStore {
    @Value("${campusx.upload-dir}") private String dir;

    public String save(MultipartFile f, String folder, int maxBytes) throws IOException {
        byte[] b = f.getBytes();
        if (b.length == 0 || b.length > maxBytes) throw new ApiException(HttpStatus.BAD_REQUEST, "Image must be under " + (maxBytes / 1024 / 1024) + " MB.");
        boolean png = b.length > 4 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
        boolean jpg = b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8;
        if (!png && !jpg) throw new ApiException(HttpStatus.BAD_REQUEST, "Only PNG or JPEG images are allowed.");
        Path target = Paths.get(dir, folder); Files.createDirectories(target);
        String name = UUID.randomUUID() + (png ? ".png" : ".jpg");
        Files.write(target.resolve(name), b);
        return folder + "/" + name;
    }
    public void delete(String relPath) {
        try { if (relPath != null) Files.deleteIfExists(Paths.get(dir).resolve(relPath)); } catch (IOException e) { /* best effort */ }
    }
}
