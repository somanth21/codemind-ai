# ==============================================================================
# CodeMind AI - Unified Standalone Production Dockerfile
# Self-contained single container: Vite Frontend + Spring Boot Backend Engine
# Perfect for PaaS (Render, Railway, Fly.io, Cloud Run, AWS App Runner, Heroku)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend Assets
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/tsconfig*.json frontend/vite.config.ts frontend/index.html ./
COPY frontend/public ./public
COPY frontend/src ./src

RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Build Backend with Bundled Frontend
# ------------------------------------------------------------------------------
FROM eclipse-temurin:17-jdk-alpine AS backend-builder

WORKDIR /app/backend

RUN apk add --no-cache dos2unix

COPY backend/pom.xml backend/mvnw ./
COPY backend/.mvn .mvn/
RUN dos2unix mvnw && chmod +x mvnw

RUN ./mvnw dependency:go-offline -B || true

COPY backend/src ./src

# Inject built frontend SPA assets directly into Spring Boot static resources
COPY --from=frontend-builder /app/frontend/dist ./src/main/resources/static

# Package single unified runnable JAR
RUN ./mvnw clean package -DskipTests -B

# ------------------------------------------------------------------------------
# Stage 3: Minimal Production Alpine JRE Runtime
# ------------------------------------------------------------------------------
FROM eclipse-temurin:17-jre-alpine AS runner

LABEL maintainer="CodeMind AI Engineering <admin@codemind.ai>"
LABEL description="CodeMind AI Unified Application (Backend + Frontend Embedded)"

RUN apk add --no-cache curl tzdata

RUN addgroup -g 1001 -S codemind && \
    adduser -u 1001 -S codemind -G codemind

WORKDIR /app

RUN mkdir -p /app/codemind-sandbox && \
    chown -R codemind:codemind /app

COPY --from=backend-builder --chown=codemind:codemind /app/backend/target/codemind-backend.jar /app/codemind-backend.jar

USER codemind

EXPOSE 8080

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0 -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"
ENV SPRING_PROFILES_ACTIVE="prod"
ENV SERVER_PORT="8080"

HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/codemind-backend.jar"]
