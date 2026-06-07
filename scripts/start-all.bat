@echo off
REM Start GreenCRM backend and frontend in separate cmd windows
REM This script assumes pnpm.cmd is available in PATH

REM Determine repo root (one level up from scripts folder)
SET REPO_ROOT=%~dp0\..
PUSHD %REPO_ROOT%
SET REPO_ROOT=%CD%
POPD

start "GreenCRM Backend" cmd /k "cd /d %REPO_ROOT%\backend && pnpm.cmd run dev"
start "GreenCRM Frontend" cmd /k "cd /d %REPO_ROOT%\frontend && pnpm.cmd run dev"

exit /b 0
