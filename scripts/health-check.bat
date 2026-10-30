@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo  CodeMind AI - Production Deployment Health Check
echo ==============================================================================

set "BACKEND_URL=%~1"
if "%BACKEND_URL%"=="" set "BACKEND_URL=http://localhost:8080"

echo [1/4] Checking Backend Public Health (%BACKEND_URL%/api/v1/health)...
curl -s -f "%BACKEND_URL%/api/v1/health" > nul
if %ERRORLEVEL% equ 0 (
    echo   -^> STATUS: UP [200 OK]
) else (
    echo   -^> STATUS: DOWN / UNREACHABLE
)

echo.
echo [2/4] Checking Spring Actuator Probes (%BACKEND_URL%/actuator/health)...
curl -s -f "%BACKEND_URL%/actuator/health" > nul
if %ERRORLEVEL% equ 0 (
    echo   -^> STATUS: ACTUATOR HEALTHY [200 OK]
) else (
    echo   -^> STATUS: ACTUATOR WARNING / NON-200
)

echo.
echo [3/4] Testing Admin Authentication and Database Access...
node -e "process.stdout.write(JSON.stringify({email: 'admin@codemind.ai', password: 'AdminSecure123' + String.fromCharCode(33)}))" > %TEMP%\cm_health_auth.json
curl.exe -s -X POST "%BACKEND_URL%/api/v1/auth/login" --header "Content-Type: application/json" --data-binary @%TEMP%\cm_health_auth.json | findstr "accessToken" > nul
if not errorlevel 1 (
    echo   -^> STATUS: AUTHENTICATION AND DATABASE READY [200 OK]
) else (
    echo   -^> STATUS: AUTHENTICATION FAILED OR ADMIN NOT PROVISIONED
)
if exist %TEMP%\cm_health_auth.json del %TEMP%\cm_health_auth.json

echo.
echo [4/4] Checking Frontend HTTP Listener...
curl -s -f "http://localhost:80" > nul
if %ERRORLEVEL% equ 0 (
    echo   -^> STATUS: FRONTEND RUNNING ON PORT 80 [200 OK]
) else (
    curl -s -f "http://localhost:5173" > nul
    if !ERRORLEVEL! equ 0 (
        echo   -^> STATUS: FRONTEND RUNNING ON PORT 5173 [200 OK]
    ) else (
        echo   -^> STATUS: NO FRONTEND DETECTED ON PORT 80 OR 5173
    )
)

echo.
echo ==============================================================================
echo  Health check complete.
echo ==============================================================================
