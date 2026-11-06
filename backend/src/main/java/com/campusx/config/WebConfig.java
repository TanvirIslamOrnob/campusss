package com.campusx.config;
import java.nio.file.Paths;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

/**
 * Publicly serves only avatars and image folders (browsers can't send a JWT for <img> tags; file names are random).
 * The "materials" folder is deliberately NOT mapped: study documents are only reachable through the authenticated download endpoint.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Value("${campusx.upload-dir}") private String uploadDir;
    @Override public void addResourceHandlers(ResourceHandlerRegistry r) {
        for (String folder : new String[] {"avatars", "posts", "items", "listings"})
            r.addResourceHandler("/uploads/" + folder + "/**").addResourceLocations("file:" + Paths.get(uploadDir, folder).toAbsolutePath() + "/");
    }
}
