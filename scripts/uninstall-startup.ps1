Param()
$taskName = 'GreenCRM Start'
Write-Output "Deleting scheduled task '$taskName'..."
schtasks /Delete /TN $taskName /F | Out-Null
Write-Output "Scheduled task deleted."
