# continue-work.ps1
# Auto-continuation script for DR Électrique Rapport development
# Can be triggered by Windows Task Scheduler to resume AI-assisted development
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/continue-work.ps1
#
# Task Scheduler Setup:
#   1. Open Task Scheduler (taskschd.msc)
#   2. Create Task > Name: "DR-Electrique-Continue-Work"
#   3. Triggers > On a schedule (or after system idle)
#   4. Actions > Start a program: powershell.exe
#   5. Arguments: -ExecutionPolicy Bypass -File "D:\dev\dr-electrique-rapport\scripts\continue-work.ps1"
#   6. Conditions > Wake to run this task

param(
    [switch]$UseCursor,    # Use Cursor instead of Claude Code
    [switch]$DryRun,       # Just show what would happen
    [switch]$Force         # Force run even if health check passes
)

$ErrorActionPreference = "Stop"

# Configuration
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$TaskFile = Join-Path $ProjectRoot "TASK.md"
$LogDir = Join-Path $PSScriptRoot "logs"
$LogFile = Join-Path $LogDir "continue-work.log"
$HealthCheckScript = Join-Path $PSScriptRoot "health-check.ps1"

# Ensure log directory exists
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LogFile -Value $logEntry

    switch ($Level) {
        "ERROR" { Write-Host $logEntry -ForegroundColor Red }
        "WARN"  { Write-Host $logEntry -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logEntry -ForegroundColor Green }
        default { Write-Host $logEntry }
    }
}

function Test-ToolAvailable {
    param([string]$ToolName)
    $null -ne (Get-Command $ToolName -ErrorAction SilentlyContinue)
}

function Get-TaskContext {
    # Read TASK.md and extract key information for the AI
    if (Test-Path $TaskFile) {
        $content = Get-Content $TaskFile -Raw

        # Extract status
        if ($content -match "Status:\s*(.+)") {
            $status = $Matches[1].Trim()
        } else {
            $status = "Unknown"
        }

        # Extract pending tasks (look for unchecked items)
        $pendingTasks = @()
        $content -split "`n" | ForEach-Object {
            if ($_ -match "^\s*-\s*\[\s*\]") {
                $pendingTasks += $_.Trim()
            }
        }

        return @{
            Status = $status
            PendingTasks = $pendingTasks
            FullContent = $content
        }
    }
    return $null
}

function Start-ClaudeCode {
    param([string]$InitialPrompt)

    Write-Log "Launching Claude Code with project context..."

    # Change to project directory
    Set-Location $ProjectRoot

    if ($DryRun) {
        Write-Log "[DRY RUN] Would execute: claude --print `"$InitialPrompt`"" "WARN"
        return
    }

    # Check if Claude Code is installed
    if (-not (Test-ToolAvailable "claude")) {
        Write-Log "Claude Code CLI not found. Trying to find alternative..." "WARN"

        # Try common installation paths
        $claudePaths = @(
            "$env:LOCALAPPDATA\Programs\Claude\claude.exe",
            "$env:APPDATA\Claude\claude.exe",
            "C:\Program Files\Claude\claude.exe"
        )

        $claudePath = $claudePaths | Where-Object { Test-Path $_ } | Select-Object -First 1

        if ($claudePath) {
            Write-Log "Found Claude at: $claudePath"
            & $claudePath $InitialPrompt
        } else {
            Write-Log "Claude Code not installed. Please install from https://claude.ai/download" "ERROR"

            # Fallback: Open VS Code or Cursor with TASK.md
            if ($UseCursor -and (Test-ToolAvailable "cursor")) {
                Write-Log "Falling back to Cursor..." "WARN"
                & cursor $ProjectRoot
            } elseif (Test-ToolAvailable "code") {
                Write-Log "Falling back to VS Code..." "WARN"
                & code $ProjectRoot
            } else {
                Write-Log "No supported IDE found. Opening TASK.md in default editor..." "WARN"
                Start-Process $TaskFile
            }
        }
        return
    }

    # Launch Claude Code with the prompt
    try {
        # Open in interactive mode with initial context
        Start-Process -FilePath "claude" -ArgumentList @(
            "--print",
            "`"Read TASK.md for full context. Run health-check.ps1 first, then continue implementing the photo upload fix. Status: $($context.Status)`""
        ) -WorkingDirectory $ProjectRoot -NoNewWindow

        Write-Log "Claude Code launched successfully" "SUCCESS"
    } catch {
        Write-Log "Failed to launch Claude Code: $_" "ERROR"
    }
}

function Start-Cursor {
    param([string]$InitialPrompt)

    Write-Log "Launching Cursor with project context..."

    if ($DryRun) {
        Write-Log "[DRY RUN] Would open Cursor at: $ProjectRoot" "WARN"
        return
    }

    if (-not (Test-ToolAvailable "cursor")) {
        Write-Log "Cursor not found. Trying VS Code instead..." "WARN"

        if (Test-ToolAvailable "code") {
            & code $ProjectRoot
            Write-Log "VS Code opened. TASK.md contains all context for AI assistant." "SUCCESS"
        } else {
            Write-Log "No IDE found. Please open project manually: $ProjectRoot" "ERROR"
        }
        return
    }

    try {
        # Open project in Cursor
        & cursor $ProjectRoot

        # Create a prompt file for Cursor's AI
        $promptFile = Join-Path $ProjectRoot ".cursor-prompt.md"
        $prompt = @"
# AI Instructions

Read TASK.md for complete project context.

## Immediate Tasks:
1. Run `powershell -File scripts/health-check.ps1` to check system status
2. If health check fails, fix connectivity issues
3. If health check passes, continue with photo upload implementation

## Current Status
$($context.Status)

## Pending Items
$($context.PendingTasks -join "`n")
"@
        Set-Content -Path $promptFile -Value $prompt

        Write-Log "Cursor launched. AI context written to .cursor-prompt.md" "SUCCESS"
    } catch {
        Write-Log "Failed to launch Cursor: $_" "ERROR"
    }
}

# Main execution
Write-Log "========================================"
Write-Log "DR Électrique - Continue Work Script"
Write-Log "========================================"

# Step 1: Run health check first
Write-Log "Running health check..."

if (Test-Path $HealthCheckScript) {
    try {
        $healthResult = & powershell -ExecutionPolicy Bypass -File $HealthCheckScript -ReturnStatus
        $healthPassed = $LASTEXITCODE -eq 0
    } catch {
        Write-Log "Health check script failed: $_" "WARN"
        $healthPassed = $false
    }
} else {
    Write-Log "Health check script not found at: $HealthCheckScript" "WARN"
    $healthPassed = $false
}

if ($healthPassed -and -not $Force) {
    Write-Log "Health check passed - system is operational" "SUCCESS"
    Write-Log "Use -Force to continue work anyway"

    # Still read task context
    $context = Get-TaskContext
    if ($context.PendingTasks.Count -eq 0) {
        Write-Log "No pending tasks found in TASK.md. All done!" "SUCCESS"
        exit 0
    }
}

# Step 2: Get task context
$context = Get-TaskContext
if (-not $context) {
    Write-Log "Could not read TASK.md - file missing or unreadable" "ERROR"
    exit 1
}

Write-Log "Project Status: $($context.Status)"
Write-Log "Pending Tasks: $($context.PendingTasks.Count)"

# Step 3: Launch appropriate IDE/tool
if ($UseCursor) {
    Start-Cursor -InitialPrompt "Continue photo upload implementation"
} else {
    Start-ClaudeCode -InitialPrompt "Continue photo upload implementation"
}

Write-Log "Continue-work script completed"
exit 0
