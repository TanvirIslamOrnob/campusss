package com.campusx;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CampusXApplication {
    public static void main(String[] args) {
        SpringApplication.run(CampusXApplication.class, args);
    }
}
