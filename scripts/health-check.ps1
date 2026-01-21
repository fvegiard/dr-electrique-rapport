# health-check.ps1
# Monitors DR Électrique Rapport application health
# Tests Supabase connection, local server, and production site
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/health-check.ps1
#
# Returns exit code:
#   0 = All checks passed
#   1 = One or more checks failed
#
# Task Scheduler Setup (for periodic monitoring):
#   1. Open Task Scheduler (taskschd.msc)
#   2. Create Task > Name: "DR-Electrique-Health-Check"
#   3. Triggers > Daily / Every 4 hours / etc.
#   4. Actions > Start a program: powershell.exe
#   5. Arguments: -ExecutionPolicy Bypass -File "D:\dev\dr-electrique-rapport\scripts\health-check.ps1"

param(
    [switch]$ReturnStatus,  # Return status without output for scripts
    [switch]$Verbose,       # Show detailed output
    [switch]$Alert,         # Show Windows notification on failure
    [int]$Timeout = 10      # HTTP request timeout in seconds
)

$ErrorActionPreference = "Continue"

# Configuration - SUPABASE CREDENTIALS
$Config = @{
    SupabaseUrl = "https://iawsshgkogntmdzrfjyw.supabase.co"
    SupabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlhd3NzaGdrb2dudG1kenJmanl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NDkwMDUsImV4cCI6MjA4MzIyNTAwNX0.1BxhI5SWLL5786qsshidOMpTsOrGeNob6xpcKQjI4s4"
    ProductionUrl = "https://dr-electrique-rapport.netlify.app"
    LocalServerUrl = "http://localhost:8002"
    LocalServerPort = 8002
}

# Paths
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $PSScriptRoot "logs"
$LogFile = Join-Path $LogDir "health-check.log"

# Ensure log directory exists
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# Results tracking
$Results = @{
    SupabaseApi = $null
    SupabaseStorage = $null
    SupabaseDatabase = $null
    LocalServer = $null
    ProductionSite = $null
    OverallStatus = "UNKNOWN"
}

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $logEntry

    if (-not $ReturnStatus) {
        switch ($Level) {
            "ERROR"   { Write-Host $logEntry -ForegroundColor Red }
            "WARN"    { Write-Host $logEntry -ForegroundColor Yellow }
            "SUCCESS" { Write-Host $logEntry -ForegroundColor Green }
            "CHECK"   { Write-Host $logEntry -ForegroundColor Cyan }
            default   { Write-Host $logEntry }
        }
    }
}

function Test-HttpEndpoint {
    param(
        [string]$Url,
        [hashtable]$Headers = @{},
        [int]$TimeoutSec = $Timeout
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -Headers $Headers -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction Stop
        return @{
            Success = $true
            StatusCode = $response.StatusCode
            Content = $response.Content
        }
    } catch {
        return @{
            Success = $false
            Error = $_.Exception.Message
            StatusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.value__ } else { 0 }
        }
    }
}

function Show-WindowsNotification {
    param(
        [string]$Title,
        [string]$Message,
        [string]$Type = "Warning"  # Info, Warning, Error
    )

    try {
        Add-Type -AssemblyName System.Windows.Forms
        $notification = New-Object System.Windows.Forms.NotifyIcon
        $notification.Icon = [System.Drawing.SystemIcons]::Warning
        $notification.BalloonTipTitle = $Title
        $notification.BalloonTipText = $Message

        switch ($Type) {
            "Error"   { $notification.BalloonTipIcon = "Error" }
            "Warning" { $notification.BalloonTipIcon = "Warning" }
            default   { $notification.BalloonTipIcon = "Info" }
        }

        $notification.Visible = $true
        $notification.ShowBalloonTip(10000)

        # Clean up after 10 seconds
        Start-Sleep -Seconds 10
        $notification.Dispose()
    } catch {
        Write-Log "Could not show notification: $_" "WARN"
    }
}

# ============================================
# HEALTH CHECKS
# ============================================

Write-Log "========================================"
Write-Log "DR Électrique - Health Check"
Write-Log "========================================"
Write-Log "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Log ""

# 1. Test Supabase API connectivity
Write-Log "Testing Supabase API..." "CHECK"
$supabaseHeaders = @{
    "apikey" = $Config.SupabaseAnonKey
    "Authorization" = "Bearer $($Config.SupabaseAnonKey)"
}

$apiResult = Test-HttpEndpoint -Url "$($Config.SupabaseUrl)/rest/v1/" -Headers $supabaseHeaders
if ($apiResult.Success) {
    $Results.SupabaseApi = "PASS"
    Write-Log "Supabase API: OK (Status $($apiResult.StatusCode))" "SUCCESS"
} else {
    $Results.SupabaseApi = "FAIL"
    Write-Log "Supabase API: FAILED - $($apiResult.Error)" "ERROR"
}

# 2. Test Supabase Database (query rapports table)
Write-Log "Testing Supabase Database..." "CHECK"
$dbResult = Test-HttpEndpoint -Url "$($Config.SupabaseUrl)/rest/v1/rapports?select=id&limit=1" -Headers $supabaseHeaders
if ($dbResult.Success -and $dbResult.StatusCode -eq 200) {
    $Results.SupabaseDatabase = "PASS"
    Write-Log "Supabase Database: OK (rapports table accessible)" "SUCCESS"
} else {
    $Results.SupabaseDatabase = "FAIL"
    Write-Log "Supabase Database: FAILED - $($dbResult.Error)" "ERROR"
}

# 3. Test Supabase Storage
Write-Log "Testing Supabase Storage..." "CHECK"
$storageResult = Test-HttpEndpoint -Url "$($Config.SupabaseUrl)/storage/v1/bucket" -Headers $supabaseHeaders
if ($storageResult.Success) {
    $Results.SupabaseStorage = "PASS"

    # Check if photos bucket exists
    if ($storageResult.Content -match '"photos"') {
        Write-Log "Supabase Storage: OK (photos bucket exists)" "SUCCESS"
    } else {
        $Results.SupabaseStorage = "WARN"
        Write-Log "Supabase Storage: OK but photos bucket may not exist" "WARN"
    }
} else {
    $Results.SupabaseStorage = "FAIL"
    Write-Log "Supabase Storage: FAILED - $($storageResult.Error)" "ERROR"
}

# 4. Test Production Site
Write-Log "Testing Production Site..." "CHECK"
$prodResult = Test-HttpEndpoint -Url $Config.ProductionUrl
if ($prodResult.Success -and $prodResult.StatusCode -eq 200) {
    $Results.ProductionSite = "PASS"
    Write-Log "Production Site: OK ($($Config.ProductionUrl))" "SUCCESS"
} else {
    $Results.ProductionSite = "FAIL"
    Write-Log "Production Site: FAILED - $($prodResult.Error)" "ERROR"
}

# 5. Test Local Server (optional - may not be running)
Write-Log "Testing Local Server..." "CHECK"
$localResult = Test-HttpEndpoint -Url $Config.LocalServerUrl -TimeoutSec 3

if ($localResult.Success) {
    $Results.LocalServer = "PASS"
    Write-Log "Local Server: RUNNING at $($Config.LocalServerUrl)" "SUCCESS"
} else {
    $Results.LocalServer = "NOT_RUNNING"
    Write-Log "Local Server: Not running (this is OK if not developing)" "WARN"
}

# ============================================
# SUMMARY
# ============================================

Write-Log ""
Write-Log "========================================"
Write-Log "HEALTH CHECK SUMMARY"
Write-Log "========================================"

$failedChecks = @()
$passedChecks = 0

foreach ($check in $Results.Keys) {
    if ($check -eq "OverallStatus") { continue }

    $status = $Results[$check]
    if ($status -eq "PASS") {
        $passedChecks++
        Write-Log "  $check : PASS" "SUCCESS"
    } elseif ($status -eq "FAIL") {
        $failedChecks += $check
        Write-Log "  $check : FAIL" "ERROR"
    } elseif ($status -eq "WARN" -or $status -eq "NOT_RUNNING") {
        Write-Log "  $check : $status" "WARN"
    } else {
        Write-Log "  $check : $status"
    }
}

Write-Log ""

# Determine overall status
$criticalChecks = @("SupabaseApi", "SupabaseDatabase", "ProductionSite")
$criticalFailed = $failedChecks | Where-Object { $_ -in $criticalChecks }

if ($criticalFailed.Count -gt 0) {
    $Results.OverallStatus = "CRITICAL"
    Write-Log "OVERALL STATUS: CRITICAL - $($criticalFailed.Count) critical check(s) failed" "ERROR"

    if ($Alert) {
        Show-WindowsNotification -Title "DR Électrique - CRITICAL" -Message "Health check failed: $($criticalFailed -join ', ')" -Type "Error"
    }

    # Create recovery instructions
    Write-Log ""
    Write-Log "RECOVERY STEPS:"
    if ("SupabaseApi" -in $criticalFailed) {
        Write-Log "  1. Check Supabase status: https://status.supabase.com"
        Write-Log "  2. Verify API key in TASK.md is correct"
    }
    if ("SupabaseDatabase" -in $criticalFailed) {
        Write-Log "  1. Check RLS policies in Supabase Dashboard"
        Write-Log "  2. Verify rapports table exists"
    }
    if ("ProductionSite" -in $criticalFailed) {
        Write-Log "  1. Check Netlify status: https://www.netlifystatus.com"
        Write-Log "  2. Check GitHub Actions for deploy failures"
        Write-Log "  3. Try manual deploy: netlify deploy --prod"
    }

    exit 1
} elseif ($failedChecks.Count -gt 0) {
    $Results.OverallStatus = "DEGRADED"
    Write-Log "OVERALL STATUS: DEGRADED - Some non-critical checks failed" "WARN"

    if ($Alert) {
        Show-WindowsNotification -Title "DR Électrique - Warning" -Message "Some health checks failed" -Type "Warning"
    }

    exit 0  # Non-critical failures are acceptable
} else {
    $Results.OverallStatus = "HEALTHY"
    Write-Log "OVERALL STATUS: HEALTHY - All critical systems operational" "SUCCESS"
    exit 0
}
