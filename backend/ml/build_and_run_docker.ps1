<#
Build and run the ML training container.
Run from `backend/ml`:
  ./build_and_run_docker.ps1

This script builds a Docker image and runs it, mounting the local `models/`
folder so trained artifacts persist on the host.
#>

param(
    [string]$ImageName = "greencrm-leadscore:latest",
    [int]$Port = 5000
)

Write-Host "Building Docker image $ImageName..."
docker build -t $ImageName .

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed. Ensure Docker is running and you have permissions."
    exit $LASTEXITCODE
}

# Ensure models directory exists on host so container can write to it
if (-not (Test-Path -Path "./models")) {
    New-Item -ItemType Directory -Path "./models" | Out-Null
}

Write-Host "Running Docker container (will run training)..."
docker run --rm -v ${PWD}/models:/app/models $ImageName
