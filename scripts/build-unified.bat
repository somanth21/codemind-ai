@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo  CodeMind AI - Unified Single-Artifact Build Pipeline
echo  Produces single executable JAR with embedded frontend SPA
echo ==============================================================================

cd /d "%~dp0.."

echo.
echo [1/3] Compiling and Optimizing Frontend SPA...
cd frontend
if not exist "node_modules" (
    call npm ci
    if !ERRORLEVEL! neq 0 exit /b !ERRORLEVEL!
)
call npm run build
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

echo.
echo [2/3] Embedding Frontend Assets into Backend Static Resources...
cd ..
if not exist "backend\src\main\resources\static" mkdir "backend\src\main\resources\static"
xcopy /E /Y /I "frontend\dist\*" "backend\src\main\resources\static\"
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

echo.
echo [3/3] Packaging Unified Spring Boot Executable JAR...
cd backend
call mvnw.cmd clean package -DskipTests
if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%

echo.
echo ==============================================================================
echo  [SUCCESS] Unified single-artifact JAR created successfully!
echo  Artifact: backend\target\codemind-backend.jar
echo.
echo  To run locally in production mode:
echo    java -Dspring.profiles.active=prod -jar backend\target\codemind-backend.jar
echo ==============================================================================
