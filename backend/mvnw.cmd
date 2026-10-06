@echo off
@REM ----------------------------------------------------------------------------
@REM CodeMind AI Maven Wrapper for Windows
@REM ----------------------------------------------------------------------------
setlocal

set "DIR=%~dp0"
set "MAVEN_CMD=%DIR%.mvn\apache-maven-3.9.9\bin\mvn.cmd"

if not exist "%MAVEN_CMD%" (
    echo Error: Maven binary not found at %MAVEN_CMD%
    exit /b 1
)

call "%MAVEN_CMD%" %*
exit /b %ERRORLEVEL%
