# start-dev-server.ps1
# Starts the local development server with automatic restart on failure
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/start-dev-server.ps1

param(
    [int]$Port = 8002,
    [switch]$OpenBrowser
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DR Électrique - Development Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if port is in use
$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "Port $Port is already in use." -ForegroundColor Yellow
    $existingPid = $portInUse.OwningProcess
    Write-Host "Process ID: $existingPid"

    $response = Read-Host "Kill existing process and restart? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Stop-Process -Id $existingPid -Force
        Start-Sleep -Seconds 1
    } else {
        Write-Host "Server already running at http://localhost:$Port" -ForegroundColor Green
        exit 0
    }
}

Write-Host "Starting server on http://localhost:$Port ..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

# Change to project directory
Set-Location $ProjectRoot

# Open browser if requested
if ($OpenBrowser) {
    Start-Process "http://localhost:$Port"
}

# Start Python HTTP server
try {
    python -m http.server $Port
} catch {
    Write-Host "Failed to start server: $_" -ForegroundColor Red
    exit 1
}
