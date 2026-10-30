@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo  CodeMind AI - Production Docker Deployment
echo ==============================================================================

cd /d "%~dp0.."

if not exist ".env.production" (
    if exist ".env" (
        echo [INFO] Using .env file for deployment...
        copy /y ".env" ".env.production" >nul
    ) else (
        echo [WARNING] No .env.production file found!
        echo Copying .env.production.example to .env.production...
        copy /y ".env.production.example" ".env.production" >nul
        echo [IMPORTANT] Please update .env.production with your real secrets and database credentials.
    )
)

echo.
echo Building and starting containers via Docker Compose...
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

if %ERRORLEVEL% equ 0 (
    echo.
    echo ==============================================================================
    echo  [SUCCESS] CodeMind AI successfully deployed!
    echo  Frontend: http://localhost (port 80)
    echo  Backend:  http://localhost:8080/api/v1/health
    echo ==============================================================================
) else (
    echo [ERROR] Deployment failed. Check docker logs for details.
)
