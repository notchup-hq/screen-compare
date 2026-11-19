# Local helper for Windows PowerShell: .\dev.ps1 <command>. ASCII only (PowerShell 5.1 reads BOM-less files as ANSI).
# If scripts are blocked: powershell -ExecutionPolicy Bypass -File .\dev.ps1 help
# check and screenshot are bash-only: use ./dev in WSL.
[CmdletBinding()]
param(
  [Parameter(Position = 0)][string]$Command = 'help',
  [int]$Port = 0,
  [switch]$Open,
  [switch]$Watch
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Get-Usage {
@'
Usage: .\dev.ps1 <command> [options]

Commands:
  help                    Show this help.
  serve [-Port N] [-Open] Serve this folder at http://127.0.0.1:N/ (default 8080, or $env:PORT).
                          Uses Python (py -3, python, python3), else npx --yes serve.
  test [-Watch]           Run node --test on tests\*.test.js (-Watch needs Node 18.11+).

check and screenshot are bash-only: run ./dev check / ./dev screenshot in WSL.
'@
}

function Fail([string]$Message, [switch]$WithUsage) {
  [Console]::Error.WriteLine($Message)
  if ($WithUsage) { [Console]::Error.WriteLine(''); [Console]::Error.WriteLine((Get-Usage)) }
  exit 1
}

# Skips the Microsoft Store stub, which exists as "python" but only opens the Store.
function Find-Python {
  foreach ($c in @(@('py', '-3'), @('python'), @('python3'))) {
    if (-not (Get-Command $c[0] -ErrorAction SilentlyContinue)) { continue }
    $extra = @($c | Select-Object -Skip 1)
    try {
      & $c[0] @extra -c 'import http.server' 2>$null | Out-Null
      if ($LASTEXITCODE -eq 0) { return , $c }
    } catch { continue }
  }
  return $null
}

switch ($Command) {
  { $_ -in 'help', '-h', '--help' } { Get-Usage }

  'serve' {
    $p = $Port
    if ($p -eq 0 -and $env:PORT) { $p = [int]$env:PORT }
    if ($p -eq 0) { $p = 8080 }
    if ($p -lt 1 -or $p -gt 65535) { Fail "Invalid port: $p (use 1-65535)." -WithUsage }
    $url = "http://127.0.0.1:$p/"
    Write-Output "Serving $PSScriptRoot at $url (Ctrl-C to stop)"
    if ($Open) {
      Start-Job -ScriptBlock { param($u) Start-Sleep -Seconds 1; Start-Process $u } -ArgumentList $url | Out-Null
    }
    $py = Find-Python
    if ($py) {
      $extra = @($py | Select-Object -Skip 1)
      & $py[0] @extra -m http.server $p --bind 127.0.0.1
    } elseif (Get-Command npx -ErrorAction SilentlyContinue) {
      & npx --yes serve -l $p .
    } else {
      Fail 'Neither Python 3 nor npx found. Install Python 3 (or Node.js, which includes npx).'
    }
  }

  'test' {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail 'node not found. Install Node.js (18.11 or newer).' }
    $files = @(Get-ChildItem tests -Filter '*.test.js' | ForEach-Object { $_.FullName })
    if ($files.Count -eq 0) { Fail 'No tests found in tests\.' }
    $nodeArgs = @('--test')
    if ($Watch) { $nodeArgs += '--watch' }
    & node @nodeArgs @files
    exit $LASTEXITCODE
  }

  { $_ -in 'check', 'screenshot' } { Fail "'$Command' is bash-only. Run ./dev $Command in WSL." }

  default { Fail "Unknown command: $Command" -WithUsage }
}
