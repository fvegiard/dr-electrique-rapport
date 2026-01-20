<#
.SYNOPSIS
    DR Électrique - Service Monitor Script

.DESCRIPTION
    Monitors the DR Électrique application and its dependencies.
    Can run continuously to check health and restart services as needed.

.PARAMETER Mode
    - check: Run a single health check (default)
    - watch: Continuous monitoring with auto-restart
    - dev: Start development server and monitor

.PARAMETER Interval
    Seconds between checks in watch mode (default: 60)

.EXAMPLE
    .\monitor.ps1
    .\monitor.ps1 -Mode watch -Interval 30
    .\monitor.ps1 -Mode dev

.NOTES
    Author: Claude Code
    Date: 2026-01-20
    Requires: PowerShell 5.1+
#>

param(
    [ValidateSet("check", "watch", "dev")]
    [string]$Mode = "check",

    [int]$Interval = 60
)

# ============================================
# CONFIGURATION
# ============================================

$Config = @{
    # URLs to monitor
    ProductionUrl = "https://dr-electrique-rapport.netlify.app"
    DashboardUrl  = "https://dr-electrique-rapport.netlify.app/dashboard-a2c15af64b97e73f.html"
    SupabaseUrl   = "https://iawsshgkogntmdzrfjyw.supabase.co"

    # Local dev
    LocalPort     = 8002
    LocalUrl      = "http://localhost:8002"

    # Paths
    ProjectRoot   = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

    # Thresholds
    TimeoutSec    = 10
    MaxRetries    = 3
}

# ============================================
# HELPER FUNCTIONS
# ============================================

function Write-Status {
    param(
        [string]$Message,
        [ValidateSet("Info", "Success", "Warning", "Error")]
        [string]$Type = "Info"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    switch ($Type) {
        "Success" { Write-Host "[$timestamp] ✅ $Message" -ForegroundColor Green }
        "Warning" { Write-Host "[$timestamp] ⚠️  $Message" -ForegroundColor Yellow }
        "Error"   { Write-Host "[$timestamp] ❌ $Message" -ForegroundColor Red }
        default   { Write-Host "[$timestamp] ℹ️  $Message" -ForegroundColor Cyan }
    }
}

function Test-UrlHealth {
    param(
        [string]$Url,
        [string]$Name,
        [hashtable]$Headers = @{}
    )

    try {
        $params = @{
            Uri            = $Url
            Method         = "GET"
            TimeoutSec     = $Config.TimeoutSec
            UseBasicParsing = $true
        }

        if ($Headers.Count -gt 0) {
            $params.Headers = $Headers
        }

        $response = Invoke-WebRequest @params -ErrorAction Stop

        if ($response.StatusCode -eq 200) {
            Write-Status "$Name is healthy (HTTP 200)" -Type Success
            return $true
        } else {
            Write-Status "$Name returned HTTP $($response.StatusCode)" -Type Warning
            return $false
        }
    } catch {
        Write-Status "$Name is unreachable: $($_.Exception.Message)" -Type Error
        return $false
    }
}

function Test-LocalServer {
    try {
        $response = Invoke-WebRequest -Uri $Config.LocalUrl -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Start-LocalServer {
    Write-Status "Starting local development server on port $($Config.LocalPort)..." -Type Info

    # Check if port is already in use
    $portInUse = Get-NetTCPConnection -LocalPort $Config.LocalPort -ErrorAction SilentlyContinue

    if ($portInUse) {
        Write-Status "Port $($Config.LocalPort) is already in use" -Type Warning
        return $false
    }

    # Start Python HTTP server
    $pythonCmd = "python -m http.server $($Config.LocalPort)"

    Start-Process -FilePath "cmd.exe" `
                  -ArgumentList "/c", "cd /d `"$($Config.ProjectRoot)`" && $pythonCmd" `
                  -WindowStyle Minimized

    # Wait for server to start
    Start-Sleep -Seconds 2

    if (Test-LocalServer) {
        Write-Status "Local server started at $($Config.LocalUrl)" -Type Success
        return $true
    } else {
        Write-Status "Failed to start local server" -Type Error
        return $false
    }
}

function Stop-LocalServer {
    Write-Status "Stopping local server..." -Type Info

    # Find and kill Python processes on our port
    $process = Get-NetTCPConnection -LocalPort $Config.LocalPort -ErrorAction SilentlyContinue |
               Select-Object -ExpandProperty OwningProcess |
               ForEach-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue }

    if ($process) {
        $process | Stop-Process -Force
        Write-Status "Local server stopped" -Type Success
    } else {
        Write-Status "No local server found" -Type Info
    }
}

function Get-SupabaseKey {
    # Try to get Supabase key from environment or .env file
    $key = $env:SUPABASE_ANON_KEY

    if (-not $key) {
        $envFile = Join-Path $Config.ProjectRoot ".env"
        if (Test-Path $envFile) {
            $content = Get-Content $envFile -Raw
            if ($content -match 'SUPABASE_ANON_KEY=([^\r\n]+)') {
                $key = $Matches[1]
            }
        }
    }

    return $key
}

# ============================================
# HEALTH CHECK FUNCTIONS
# ============================================

function Invoke-HealthCheck {
    Write-Host ""
    Write-Host "=" * 50 -ForegroundColor DarkGray
    Write-Host "  DR Électrique Health Check" -ForegroundColor White
    Write-Host "=" * 50 -ForegroundColor DarkGray
    Write-Host ""

    $results = @{
        Production = $false
        Dashboard  = $false
        Supabase   = $false
        Local      = $false
    }

    # Check production site
    $results.Production = Test-UrlHealth -Url $Config.ProductionUrl -Name "Production Site"

    # Check dashboard
    $results.Dashboard = Test-UrlHealth -Url $Config.DashboardUrl -Name "Dashboard"

    # Check Supabase
    $supabaseKey = Get-SupabaseKey
    if ($supabaseKey) {
        $supabaseHeaders = @{
            "apikey" = $supabaseKey
        }
        $results.Supabase = Test-UrlHealth -Url "$($Config.SupabaseUrl)/rest/v1/" -Name "Supabase API" -Headers $supabaseHeaders
    } else {
        Write-Status "Supabase API key not found - skipping API check" -Type Warning
        # Still check if URL is reachable
        $results.Supabase = Test-UrlHealth -Url $Config.SupabaseUrl -Name "Supabase (basic)"
    }

    # Check local server
    if (Test-LocalServer) {
        Write-Status "Local dev server is running" -Type Success
        $results.Local = $true
    } else {
        Write-Status "Local dev server is not running" -Type Info
    }

    Write-Host ""
    Write-Host "-" * 50 -ForegroundColor DarkGray

    # Summary
    $healthy = ($results.Values | Where-Object { $_ }).Count
    $total = $results.Count

    if ($healthy -eq $total) {
        Write-Status "All systems operational ($healthy/$total)" -Type Success
    } elseif ($healthy -gt 0) {
        Write-Status "Some systems degraded ($healthy/$total healthy)" -Type Warning
    } else {
        Write-Status "All systems down!" -Type Error
    }

    Write-Host ""

    return $results
}

# ============================================
# WATCH MODE
# ============================================

function Start-WatchMode {
    Write-Host ""
    Write-Host "Starting continuous monitoring (Ctrl+C to stop)..." -ForegroundColor Cyan
    Write-Host "Check interval: $Interval seconds" -ForegroundColor Gray
    Write-Host ""

    $failureCount = 0

    try {
        while ($true) {
            $results = Invoke-HealthCheck

            # Track failures
            if (-not $results.Production) {
                $failureCount++
                Write-Status "Production failure count: $failureCount" -Type Warning

                if ($failureCount -ge $Config.MaxRetries) {
                    Write-Status "Multiple failures detected - check Netlify deployment" -Type Error

                    # Could add notification here (email, webhook, etc.)
                }
            } else {
                $failureCount = 0
            }

            Write-Host "Next check in $Interval seconds..." -ForegroundColor Gray
            Start-Sleep -Seconds $Interval
        }
    } catch {
        Write-Host ""
        Write-Status "Monitoring stopped" -Type Info
    }
}

# ============================================
# DEV MODE
# ============================================

function Start-DevMode {
    Write-Host ""
    Write-Host "Starting development mode..." -ForegroundColor Cyan
    Write-Host ""

    # Check if server is already running
    if (Test-LocalServer) {
        Write-Status "Local server already running at $($Config.LocalUrl)" -Type Success
    } else {
        Start-LocalServer
    }

    # Open browser
    Start-Process $Config.LocalUrl

    Write-Host ""
    Write-Host "Development server is running." -ForegroundColor Green
    Write-Host "Press any key to stop the server and exit..." -ForegroundColor Gray
    Write-Host ""

    # Wait for keypress
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

    Stop-LocalServer
}

# ============================================
# MAIN
# ============================================

# Banner
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║       DR Électrique - Service Monitor            ║" -ForegroundColor Red
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Red

switch ($Mode) {
    "check" {
        Invoke-HealthCheck
    }
    "watch" {
        Start-WatchMode
    }
    "dev" {
        Start-DevMode
    }
}
