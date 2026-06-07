Param()
$bat = (Resolve-Path (Join-Path $PSScriptRoot 'start-all.bat')).Path
$taskName = 'GreenCRM Start'
Write-Output "Registering scheduled task '$taskName' to run at logon..."

# Use schtasks for compatibility across Windows versions
$quoted = '"' + $bat + '"'
schtasks /Create /SC ONLOGON /TN $taskName /TR $quoted /F | Out-Null
Write-Output "Scheduled task created. Run 'schtasks /Query /TN \"$taskName\"' to verify."
