@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo  CodeMind AI - Complete Production Build Pipeline
echo ==============================================================================

cd /d "%~dp0.."

echo.
echo [1/2] Building Frontend Production Bundle...
cd frontend
if not exist "node_modules" (
    call npm ci
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Frontend npm ci failed.
        exit /b !ERRORLEVEL!
    )
)
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend build failed.
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Building Backend Executable JAR...
cd ..\backend
call mvnw.cmd clean package -DskipTests
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend package build failed.
    exit /b %ERRORLEVEL%
)

echo.
echo ==============================================================================
echo  [SUCCESS] All components built successfully!
echo  Backend JAR: backend\target\codemind-backend.jar
echo  Frontend:    frontend\dist
echo ==============================================================================
