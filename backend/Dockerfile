# ==============================================================================
# CodeMind AI - Backend Production Dockerfile
# Multi-stage build with Eclipse Temurin JDK 17 & minimal JRE 17 Alpine runtime
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Package
# ------------------------------------------------------------------------------
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /build

# Install dos2unix to ensure line endings on Windows checkouts don't break mvnw
RUN apk add --no-cache dos2unix

# Copy Maven wrapper & POM first for optimal layer caching
COPY pom.xml mvnw ./
COPY .mvn .mvn/

RUN dos2unix mvnw && chmod +x mvnw

# Resolve dependencies in separate cached layer
RUN ./mvnw dependency:go-offline -B || true

# Copy source tree
COPY src ./src

# Compile and package production executable JAR (skipping unit tests for packaging)
RUN ./mvnw clean package -DskipTests -B

# ------------------------------------------------------------------------------
# Stage 2: Minimal Production Runtime
# ------------------------------------------------------------------------------
FROM eclipse-temurin:17-jre-alpine AS runner

LABEL maintainer="CodeMind AI Engineering <admin@codemind.ai>"
LABEL description="CodeMind AI Repository Understanding & Architecture Intelligence Engine"

# Install curl for container health check
RUN apk add --no-cache curl tzdata

# Create dedicated non-root application user and group
RUN addgroup -g 1001 -S codemind && \
    adduser -u 1001 -S codemind -G codemind

WORKDIR /app

# Create repository analysis sandbox directory
RUN mkdir -p /app/codemind-sandbox && \
    chown -R codemind:codemind /app

# Copy executable JAR from builder stage
COPY --from=builder --chown=codemind:codemind /build/target/codemind-backend.jar /app/codemind-backend.jar

# Switch to unprivileged user
USER codemind

# Expose HTTP port
EXPOSE 8080

# Configure container-aware JVM flags
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0 -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"
ENV SPRING_PROFILES_ACTIVE="prod"
ENV SERVER_PORT="8080"

# Actuator Health Check
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Launch Spring Boot Application
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/codemind-backend.jar"]
