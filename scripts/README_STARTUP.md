Startup scripts to automatically start frontend and backend on Windows logon.

Files:
- `start-all.bat`: Launches backend and frontend in separate Command Prompt windows.
- `install-startup.ps1`: Registers a Scheduled Task named "GreenCRM Start" to run `start-all.bat` at user logon.
- `uninstall-startup.ps1`: Removes the Scheduled Task.

Usage:
1. To test manually, run `scripts\start-all.bat`.

2. To register at logon (run with PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-startup.ps1
```

3. To remove the scheduled task:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\uninstall-startup.ps1
```

Notes:
- `pnpm.cmd` must be available in `PATH` for the batch script to work.
- If you prefer a single-window solution or using a process manager, I can add that instead.
