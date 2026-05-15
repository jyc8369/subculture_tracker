param(
    [switch]$Clean,
    [switch]$NoUpx
)

Set-StrictMode -Version Latest

$root = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
Set-Location $root

$pythonExe = if (Test-Path .\.venv\Scripts\python.exe) {
    (Resolve-Path .\.venv\Scripts\python.exe).Path
} else {
    'python.exe'
}

if (-not (Get-Command $pythonExe -ErrorAction SilentlyContinue)) {
    Write-Error "Python executable not found: $pythonExe"
    exit 1
}

Write-Host "Using Python: $pythonExe"

& $pythonExe -m PyInstaller --version | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host 'PyInstaller not found. Installing into current Python environment...'
    & $pythonExe -m pip install pyinstaller
    if ($LASTEXITCODE -ne 0) {
        Write-Error 'Failed to install PyInstaller.'
        exit $LASTEXITCODE
    }
    & $pythonExe -m PyInstaller --version | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error 'PyInstaller installation succeeded, but the module is still unavailable.'
        exit $LASTEXITCODE
    }
}

$keepPath = Join-Path $root 'data\.keep'
if (-not (Test-Path $keepPath)) {
    Write-Host 'Creating placeholder file to preserve data folder in the bundle.'
    @"
# This placeholder file keeps the data directory structure in packaged builds.
# Real export files are written here at runtime and are not bundled into the executable.
"@ | Set-Content -Path $keepPath -Encoding UTF8
}

if ($Clean) {
    Write-Host 'Cleaning previous build artifacts...'
    if (Test-Path .\build) { Remove-Item .\build -Recurse -Force }
    if (Test-Path .\dist) { Remove-Item .\dist -Recurse -Force }
    if (Test-Path .\app.spec) { Write-Host 'Keep existing app.spec'; }
}

$pyinstallerArgs = @('app.spec')
if ($NoUpx) {
    $pyinstallerArgs += '--noupx'
}

Write-Host "Running PyInstaller with: $($pyinstallerArgs -join ' ')"
& $pythonExe -m PyInstaller @pyinstallerArgs

if ($LASTEXITCODE -ne 0) {
    Write-Error "PyInstaller failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host 'Build finished successfully.'
Write-Host 'Output directory: dist\app'
