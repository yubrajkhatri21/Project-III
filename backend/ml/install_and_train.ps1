<#
PowerShell helper to install Python dependencies and run training.
Usage:
  Open PowerShell as Administrator (if needed)
  ./install_and_train.ps1
#>

Set-StrictMode -Version Latest

function Find-Python {
    $py = (Get-Command python -ErrorAction SilentlyContinue).Path
    if (-not $py) { $py = (Get-Command py -ErrorAction SilentlyContinue).Path }
    return $py
}

$python = Find-Python
if (-not $python) {
    Write-Error "Python not found. Install Python 3.8+ and ensure 'python' or 'py' is on PATH. https://www.python.org/downloads/"
    exit 1
}

Write-Host "Using Python: $python"

# Upgrade pip and install requirements
& $python -m pip install --upgrade pip
& $python -m pip install -r .\requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install dependencies. Check errors above."
    exit $LASTEXITCODE
}

Write-Host "Starting training..."
& $python .\train_model.py

if ($LASTEXITCODE -ne 0) {
    Write-Error "Training script failed. See output for details."
    exit $LASTEXITCODE
}

Write-Host "Training finished. Models saved to .\models\"
