@echo off
SETLOCAL ENABLEEXTENSIONS

REM Stable GreenCRM startup configuration
SET BACKEND_PORT=9000
SET FRONTEND_PORT=5173

REM Determine repo root (one level up from scripts folder)
SET REPO_ROOT=%~dp0\..
PUSHD %REPO_ROOT%
SET REPO_ROOT=%CDP%
POPD

REM Do not launch duplicate development servers when this script is run again.
powershell -NoProfile -Command "$backend = Get-NetTCPConnection -State Listen -LocalPort %BACKEND_PORT% -ErrorAction SilentlyContinue; $frontend = Get-NetTCPConnection -State Listen -LocalPort %FRONTEND_PORT% -ErrorAction SilentlyContinue; if ($backend -or $frontend) { exit 1 }"
if errorlevel 1 (
    echo GreenCRM is already running on one or more required ports.
    echo Backend: http://localhost:%BACKEND_PORT%
    echo Frontend: http://localhost:%FRONTEND_PORT%
    exit /b 0
)

start "GreenCRM Backend" cmd /k "cd /d %REPO_ROOT%\backend && pnpm.cmd run dev"
start "GreenCRM Frontend" cmd /k "cd /d %REPO_ROOT%\frontend && pnpm.cmd run dev"

REM Give the frontend a moment to boot before opening it.
TIMEOUT /T 8 /NOBREAK > NUL
start "" http://localhost:%FRONTEND_PORT%

echo GreenCRM started successfully.
echo Backend: http://localhost:%BACKEND_PORT%
echo Frontend: http://localhost:%FRONTEND_PORT%

exit /b 0
