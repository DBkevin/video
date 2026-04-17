$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$DistRoot = Join-Path $Root "dist"
$ReleaseDir = Join-Path $DistRoot "video-consult-mvp-linux-amd64"
$BinaryName = "video-consult-mvp"
$ZipPath = Join-Path $DistRoot "video-consult-mvp-linux-amd64.zip"

Push-Location $Root
try {
  if (Test-Path $ReleaseDir) {
    Remove-Item -Recurse -Force $ReleaseDir
  }

  if (Test-Path $ZipPath) {
    Remove-Item -Force $ZipPath
  }

  New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $ReleaseDir "deploy") | Out-Null
  New-Item -ItemType Directory -Force -Path (Join-Path $ReleaseDir "docs") | Out-Null

  $env:GOOS = "linux"
  $env:GOARCH = "amd64"
  $env:CGO_ENABLED = "0"

  Write-Host "Building linux/amd64 binary..."
  go build -trimpath -ldflags "-s -w" -o (Join-Path $ReleaseDir $BinaryName) ./cmd/server

  Copy-Item README.md (Join-Path $ReleaseDir "README.md")
  Copy-Item docs\schema.sql (Join-Path $ReleaseDir "docs\schema.sql")
  Copy-Item deploy\.env.production.example (Join-Path $ReleaseDir ".env.example")
  Copy-Item deploy\systemd\video-consult-mvp.service (Join-Path $ReleaseDir "deploy\video-consult-mvp.service")
  Copy-Item deploy\nginx\hxtest.xmmylike.com.conf (Join-Path $ReleaseDir "deploy\hxtest.xmmylike.com.conf")

  Write-Host "Creating zip package..."
  Compress-Archive -Path (Join-Path $ReleaseDir "*") -DestinationPath $ZipPath -Force

  Write-Host "Done: $ZipPath"
}
finally {
  Pop-Location
}
