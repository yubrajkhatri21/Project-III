@echo off
SETLOCAL ENABLEEXTENSIONS

REM Stable GreenCRM startup configuration
SET BACKEND_PORT=9000
SET FRONTEND_PORT=5173

REM Determine repo root (one level up from scripts folder)
SET REPO_ROOT=%~dp0\..
FOR %%I IN ("%REPO_ROOT%") DO SET REPO_ROOT=%%~fI

where pnpm >NUL 2>&1
if errorlevel 1 (
    echo pnpm was not found in PATH.
    echo Install Node.js and pnpm, then run this script again.
    exit /b 1
)

REM Check actual TCP listeners before starting anything so we don't exit early on false positives.
netstat -ano -p tcp | findstr ":%BACKEND_PORT% " >NUL
if not errorlevel 1 set BACKEND_RUNNING=1
netstat -ano -p tcp | findstr ":%FRONTEND_PORT% " >NUL
if not errorlevel 1 set FRONTEND_RUNNING=1

if defined BACKEND_RUNNING if defined FRONTEND_RUNNING (
    echo GreenCRM is already running.
    echo Backend: http://localhost:%BACKEND_PORT%
    echo Frontend: http://localhost:%FRONTEND_PORT%
    exit /b 0
)

if not defined BACKEND_RUNNING (
    start "GreenCRM Backend" cmd /k "cd /d ""%REPO_ROOT%\backend"" && pnpm.cmd run dev"
)

if not defined FRONTEND_RUNNING (
    start "GreenCRM Frontend" cmd /k "cd /d ""%REPO_ROOT%\frontend"" && pnpm.cmd run dev --host 0.0.0.0 --port %FRONTEND_PORT%"
)

REM Give the frontend a moment to boot before opening it.
TIMEOUT /T 8 /NOBREAK > NUL
start "" http://127.0.0.1:%FRONTEND_PORT%

echo GreenCRM started successfully.
echo Backend: http://localhost:%BACKEND_PORT%
echo Frontend: http://localhost:%FRONTEND_PORT%
exit /b 0
