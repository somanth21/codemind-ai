package com.codemind;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * CodeMind AI - Main Application Entry Point
 * Modular Monolith Architecture for AI-Powered Software Repository Understanding.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableAsync
public class CodeMindApplication {

    public static void main(String[] args) {
        SpringApplication.run(CodeMindApplication.class, args);
    }
}
