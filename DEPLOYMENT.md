# CodeMind AI — Enterprise Production Deployment Guide

This guide details how to build, containerize, harden, and deploy **CodeMind AI** across any modern production environment — including Docker Compose, Kubernetes, Cloud PaaS (Render, Railway, Fly.io), and self-hosted Linux/Windows virtual machines.

---

## 1. Architectural Topologies

CodeMind AI supports three distinct deployment topologies:

```
TOPOLOGY A: Unified Standalone Container (Recommended for PaaS / Cost Efficiency)
┌─────────────────────────────────────────────────────────────────────────────┐
│ CodeMind Container (Port 8080)                                              │
│                                                                             │
│   ┌──────────────────────────┐         ┌────────────────────────────────┐   │
│   │ Embedded Vite React SPA  │ ──────> │ Spring Boot REST & AST Engine  │   │
│   │ (Served via Spring MVC)  │         │ (Flyway, JavaParser, Gemini)   │   │
│   └──────────────────────────┘         └────────────────┬───────────────┘   │
└─────────────────────────────────────────────────────────┼───────────────────┘
                                                          │ SSL (Require)
                                                          ▼
                                            Managed PostgreSQL 16 / Neon

-------------------------------------------------------------------------------

TOPOLOGY B: Multi-Container Micro-Architecture (Recommended for Docker / K8s)
┌──────────────────────────┐             ┌────────────────────────────────┐
│   Nginx Reverse Proxy    │             │   Spring Boot Backend Engine   │
│   (Frontend Container)   │ ──/api/───> │   (Backend Container :8080)    │
│   Port 80 / 443          │             │   AST, Symbols, Security, LLM  │
└──────────────────────────┘             └────────────────┬───────────────┘
                                                          │
                                                          ▼
                                            ┌─────────────────────────────┐
                                            │ Local / Managed PostgreSQL  │
                                            └─────────────────────────────┘

-------------------------------------------------------------------------------

TOPOLOGY C: Decoupled Edge & Cloud
- Frontend: Deployed to Vercel, Netlify, or Cloudflare Pages with `VITE_API_BASE_URL=https://api.yourdomain.com`
- Backend: Deployed on AWS ECS, GCP Cloud Run, or Render with `CORS_ALLOWED_ORIGINS=https://yourdomain.com`
- Database: Managed Neon PostgreSQL with pooled connection string.
```

---

## 2. System Requirements & Prerequisites

| Resource | Minimum | Recommended | Notes |
| :--- | :--- | :--- | :--- |
| **CPU** | 1 vCPU | 2+ vCPUs | JavaParser AST static analysis & graph calculations benefit from multi-threading |
| **RAM** | 1.5 GB | 2 – 4 GB | JVM container heap configured with `-XX:MaxRAMPercentage=75.0` |
| **Disk Storage** | 5 GB | 20+ GB SSD | Sandbox storage for repository analysis cache and temporary clones |
| **Java Runtime** | Java 17 | Eclipse Temurin 17 JRE | Included automatically in Docker containers |
| **Database** | PostgreSQL 15+ | PostgreSQL 16 (Neon / RDS) | Requires standard PostgreSQL dialect; Flyway automates migrations |

---

## 3. Quick Start Deployments

### Option A: Unified Single Container (Render, Railway, Fly.io, Cloud Run)

The root [`Dockerfile`](file:///c:/Users/soman/Desktop/Act%20Mini/Dockerfile) packages the Vite React frontend and Spring Boot backend into a single lightweight, self-contained Alpine container.

1. **Build Container Image**:
   ```bash
   docker build -t codemind-ai:latest .
   ```

2. **Run Container**:
   ```bash
   docker run -d \
     --name codemind \
     -p 8080:8080 \
     -e SPRING_PROFILES_ACTIVE=prod \
     -e USE_ENV_DATABASE_URL=true \
     -e DATABASE_URL="postgresql://user:pass@ep-instance.aws.neon.tech/neondb?sslmode=require" \
     -e JWT_SECRET="your_cryptographically_secure_256_bit_secret" \
     -e CODEMIND_LLM_API_KEY="your_gemini_api_key" \
     -e LLM_MODEL="gemini-3.6-flash" \
     -e CODEMIND_ADMIN_EMAIL="admin@codemind.ai" \
     -e CODEMIND_ADMIN_PASSWORD="YourSecurePassword123!" \
     codemind-ai:latest
   ```

3. **Access Application**:
   - Web Application: `http://localhost:8080`
   - Health Probe: `http://localhost:8080/actuator/health`

---

### Option B: Multi-Service Orchestration with Docker Compose

For production environments running on virtual machines (AWS EC2, DigitalOcean Droplet, Hetzner, or on-premise):

1. **Prepare Environment Configuration**:
   ```bash
   cp .env.production.example .env.production
   # Edit .env.production with your real secrets
   ```

2. **Launch Services**:
   ```bash
   # Windows:
   .\scripts\deploy-docker.bat

   # Linux / macOS:
   chmod +x ./scripts/*.sh
   ./scripts/deploy-docker.sh
   ```
   Or directly via Docker Compose:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```

3. **Verify Deployment**:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ./scripts/health-check.sh
   ```

---

### Option C: Standalone Native Deployment (Without Docker)

You can run CodeMind AI directly on any server with Java 17 and Node.js.

1. **Build Unified Artifact**:
   ```bash
   # Windows:
   .\scripts\build-unified.bat

   # Linux / macOS:
   ./scripts/build-unified.sh
   ```
   *This compiles the Vite frontend, embeds the optimized assets into Spring Boot's static resources, and generates `backend/target/codemind-backend.jar`.*

2. **Launch Application**:
   ```bash
   export SPRING_PROFILES_ACTIVE=prod
   export USE_ENV_DATABASE_URL=true
   export DATABASE_URL="postgresql://user:password@host:5432/neondb?sslmode=require"
   export JWT_SECRET="$(openssl rand -base64 32)"
   export CODEMIND_LLM_API_KEY="your_api_key_here"
   export LLM_MODEL="gemini-3.6-flash"
   export CODEMIND_ADMIN_EMAIL="admin@codemind.ai"
   export CODEMIND_ADMIN_PASSWORD="AdminSecurePassword123!"

   java -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -jar backend/target/codemind-backend.jar
   ```

---

## 4. Cloud Platform 1-Click Blueprints

### Render ([render.yaml](file:///c:/Users/soman/Desktop/Act%20Mini/render.yaml))
1. Connect your repository to [Render.com](https://render.com).
2. Select **New** → **Blueprint**.
3. Render will detect `render.yaml` and provision:
   - A managed PostgreSQL database (`codemind-postgres`).
   - The unified Docker web service (`codemind-ai`).
4. Set the `CODEMIND_LLM_API_KEY` and `CODEMIND_ADMIN_PASSWORD` secret environment variables in the Render dashboard.

### Railway ([railway.json](file:///c:/Users/soman/Desktop/Act%20Mini/railway.json))
1. Install Railway CLI or connect via GitHub: `railway init`.
2. Add a PostgreSQL plugin or attach an existing Neon database URL.
3. Railway automatically uses `Dockerfile` and monitors `/actuator/health`.

---

## 5. Environment Variables Reference

| Variable | Description | Required | Default / Example |
| :--- | :--- | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | Active Spring profile (`prod` or `dev`) | **Yes** | `prod` |
| `USE_ENV_DATABASE_URL` | Parses postgres connection string from `DATABASE_URL` | **Yes** | `true` |
| `DATABASE_URL` | Full connection URI (Neon / Supabase / AWS RDS) | **Yes** | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | 256-bit secret key for signing tokens | **Yes** | Generate via `openssl rand -base64 32` |
| `JWT_EXPIRATION_MS` | Access token lifespan in milliseconds | No | `900000` (15 minutes) |
| `JWT_REFRESH_EXPIRATION_MS`| Refresh token lifespan in milliseconds | No | `604800000` (7 days) |
| `CODEMIND_LLM_API_KEY` | Google Gemini API key for Grounded AI synthesis | **Yes** | Your API key |
| `LLM_MODEL` | LLM model identifier | No | `gemini-3.6-flash` |
| `LLM_TIMEOUT_SECONDS` | Maximum timeout before fallback model attempt | No | `20` |
| `CORS_ALLOWED_ORIGINS` | Permitted client origins (comma-separated) | **Yes** | `https://yourdomain.com,http://localhost` |
| `CODEMIND_ADMIN_EMAIL` | Initial admin account provisioned on first boot | No | `admin@codemind.ai` |
| `CODEMIND_ADMIN_PASSWORD` | Initial admin password provisioned on first boot | No | Set strong password |
| `CODEMIND_SANDBOX_ROOT` | Filesystem root for extracted repositories | No | `/app/codemind-sandbox` |
| `CODEMIND_MAX_ARCHIVE_SIZE`| Maximum ZIP upload size in bytes | No | `104857600` (100 MB) |
| `SERVER_PORT` | Backend HTTP listening port | No | `8080` |
| `VITE_API_BASE_URL` | Frontend API base URL (only for decoupled hosting) | No | `https://api.yourdomain.com` |

---

## 6. Security Hardening Checklist

- [x] **Unprivileged User**: Docker containers run under dedicated non-root user `codemind` (UID `1001`).
- [x] **Secret Isolation**: Secrets are injected via environment variables; none are hardcoded in the codebase or Docker images.
- [x] **JWT Security**: Signed using HMAC-SHA512 with 256-bit entropy requirement; tokens expire in 15 minutes.
- [x] **CORS Defense**: Explicit origin verification with wildcard pattern support (`setAllowedOriginPatterns`).
- [x] **Security Headers**: Production Nginx and Spring Security emit `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- [x] **Sandbox Path Traversal Protection**: Archive extraction enforces strict canonical directory traversal prevention (`ZipSlip` protection).
- [x] **SQL & AST Injection Defense**: Zero dynamic string query construction; all repository operations use parameterized JPA repositories and JavaParser deterministic AST visitors.

---

## 7. Verification & Health Probes

Run the built-in health check script to confirm container and database health:

```bash
# Windows
.\scripts\health-check.bat http://localhost:8080

# Linux
./scripts/health-check.sh http://localhost:8080
```

Expected diagnostic output:
```
[1/4] Checking Backend Public Health (http://localhost:8080/api/v1/health)...
  -> STATUS: UP [200 OK]

[2/4] Checking Spring Actuator Probes (http://localhost:8080/actuator/health)...
  -> STATUS: ACTUATOR HEALTHY [200 OK]

[3/4] Testing Admin Authentication & Database Access...
  -> STATUS: AUTHENTICATION & DATABASE READY [200 OK]

[4/4] Checking Frontend HTTP Listener...
  -> STATUS: FRONTEND RUNNING ON PORT 80 [200 OK]
```
