@echo off
REM Start CodeMind AI Backend (Spring Boot with H2 Dev Fallback or PostgreSQL)
cd /d "%~dp0..\backend"
echo Starting CodeMind AI Backend on port 8080...
call mvnw.cmd spring-boot:run
