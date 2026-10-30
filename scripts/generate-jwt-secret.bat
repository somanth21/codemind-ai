@echo off
setlocal enabledelayedexpansion

echo ==============================================================================
echo  CodeMind AI - Cryptographic JWT Secret Generator (256-bit HMAC-SHA256)
echo ==============================================================================

powershell -NoProfile -Command ^
  "$bytes = New-Object byte[] 32; (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes); [Convert]::ToBase64String($bytes)" > "%TEMP%\jwt_secret.tmp"

set /p JWT_SECRET=<"%TEMP%\jwt_secret.tmp"
del "%TEMP%\jwt_secret.tmp"

echo.
echo Your generated production JWT_SECRET is:
echo.
echo   %JWT_SECRET%
echo.
echo Place this value in your .env.production file:
echo   JWT_SECRET=%JWT_SECRET%
echo ==============================================================================
