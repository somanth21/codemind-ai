package com.codemind.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

/**
 * DataSource configuration supporting standard environment variables and Neon PostgreSQL.
 * Seamlessly converts standard postgresql:// or postgres:// connection strings
 * (e.g., from DATABASE_URL or DATABASE_URL_POOLED) into valid JDBC configuration.
 */
@Configuration
public class DataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    @Bean
    @Primary
    @ConditionalOnProperty(name = "spring.datasource.use-env-url", havingValue = "true")
    public DataSource envAwareDataSource(
            @Value("${DATABASE_URL_POOLED:${DATABASE_URL:}}") String rawDatabaseUrl,
            @Value("${spring.datasource.driver-class-name:org.postgresql.Driver}") String driverClassName,
            @Value("${spring.datasource.hikari.maximum-pool-size:10}") int maxPoolSize,
            @Value("${spring.datasource.hikari.connection-timeout:20000}") long connectionTimeout
    ) {
        HikariConfig config = new HikariConfig();
        config.setMaximumPoolSize(maxPoolSize);
        config.setConnectionTimeout(connectionTimeout);

        if (rawDatabaseUrl != null && !rawDatabaseUrl.isBlank()) {
            ParsedConnection parsed = parseConnectionUrl(rawDatabaseUrl.trim());
            config.setJdbcUrl(parsed.jdbcUrl());
            if (parsed.jdbcUrl() != null && parsed.jdbcUrl().startsWith("jdbc:postgresql:")) {
                config.setDriverClassName("org.postgresql.Driver");
            } else {
                config.setDriverClassName(driverClassName);
            }
            if (parsed.username() != null && !parsed.username().isBlank()) {
                config.setUsername(parsed.username());
            }
            if (parsed.password() != null && !parsed.password().isBlank()) {
                config.setPassword(parsed.password());
            }
            log.info("Configured HikariDataSource from environment connection URL (target host: {})", parsed.host());
        }

        return new HikariDataSource(config);
    }

    public record ParsedConnection(String jdbcUrl, String username, String password, String host) {}

    public static ParsedConnection parseConnectionUrl(String url) {
        if (url == null || url.isBlank()) {
            return new ParsedConnection(url, null, null, "unknown");
        }

        if (url.startsWith("jdbc:")) {
            return new ParsedConnection(url, null, null, "direct-jdbc");
        }

        try {
            URI uri = URI.create(url);
            String scheme = uri.getScheme();
            if ("postgresql".equalsIgnoreCase(scheme) || "postgres".equalsIgnoreCase(scheme)) {
                String host = uri.getHost() != null ? uri.getHost() : "localhost";
                int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                String path = uri.getPath() != null && !uri.getPath().isBlank() ? uri.getPath() : "/neondb";
                String query = uri.getQuery();

                String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + path;
                if (query != null && !query.isBlank()) {
                    jdbcUrl += "?" + query;
                }

                String username = null;
                String password = null;
                String userInfo = uri.getUserInfo();
                if (userInfo != null && !userInfo.isBlank()) {
                    int colonIdx = userInfo.indexOf(':');
                    if (colonIdx >= 0) {
                        username = userInfo.substring(0, colonIdx);
                        password = userInfo.substring(colonIdx + 1);
                    } else {
                        username = userInfo;
                    }
                }

                return new ParsedConnection(jdbcUrl, username, password, host);
            }
        } catch (Exception e) {
            log.warn("Failed to parse standard connection URI as postgresql://, using verbatim: {}", e.getMessage());
        }

        return new ParsedConnection(url, null, null, "fallback");
    }
}
