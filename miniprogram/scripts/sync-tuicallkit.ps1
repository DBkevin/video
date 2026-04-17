$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$fixPackageScript = Join-Path $PSScriptRoot "fix-tuicallkit-package.js"
$fixWasmScript = Join-Path $PSScriptRoot "fix-call-engine-wasm.js"
$sourcePackage = Join-Path $root "node_modules\@trtc\calls-uikit-wx"
$targetKit = Join-Path $root "TUICallKit"
$targetStatic = Join-Path $root "static"
$builtLiteChat = Join-Path $root "miniprogram_npm\@tencentcloud\lite-chat"
$sourceBasicJs = Join-Path $root "node_modules\@tencentcloud\lite-chat\basic.js"
$targetDebug = Join-Path $root "TUICallKit\debug"

if (-not (Test-Path $sourcePackage)) {
  throw "@trtc/calls-uikit-wx not found. Please run npm install in miniprogram directory first."
}

if (Test-Path $fixPackageScript) {
  Write-Host "Patching @trtc/calls-uikit-wx package entry..."
  node $fixPackageScript
}

if (Test-Path $fixWasmScript) {
  Write-Host "Patching @trtc/call-engine-lite-wx wasm assets..."
  node $fixWasmScript
}

Write-Host "Syncing TUICallKit source code..."
New-Item -ItemType Directory -Force -Path $targetKit | Out-Null
Copy-Item -Path (Join-Path $sourcePackage "*") -Destination $targetKit -Recurse -Force

if ((Test-Path $builtLiteChat) -and (Test-Path $sourceBasicJs)) {
  Write-Host "Fixing miniprogram_npm/@tencentcloud/lite-chat/basic.js..."
  Copy-Item -Path $sourceBasicJs -Destination (Join-Path $builtLiteChat "basic.js") -Force

  # Only basic.js is required for the current mini program call flow.
  # Removing the standard/professional bundles keeps the upload package small.
  $redundantFiles = @(
    "index.js",
    "basic.es.js",
    "standard.js",
    "standard.es.js",
    "professional.js",
    "professional.es.js",
    "README.md",
    "package.json",
    "index.d.ts",
    "basic.d.ts",
    "professional.d.ts"
  )

  foreach ($relativePath in $redundantFiles) {
    $targetFile = Join-Path $builtLiteChat $relativePath
    if (Test-Path $targetFile) {
      Remove-Item -LiteralPath $targetFile -Force
    }
  }

  $pluginsFolder = Join-Path $builtLiteChat "plugins"
  if (Test-Path $pluginsFolder) {
    Remove-Item -LiteralPath $pluginsFolder -Recurse -Force
  }

  Get-ChildItem -Path $builtLiteChat -Recurse -File -Include *.map,*.d.ts | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force
  }
}

if (Test-Path $targetDebug) {
  # Debug helpers are not needed in preview/upload packages.
  Remove-Item -LiteralPath $targetDebug -Recurse -Force
}

$builtNpmRoot = Join-Path $root "miniprogram_npm"
if (Test-Path $builtNpmRoot) {
  Get-ChildItem -Path $builtNpmRoot -Recurse -File -Include *.map,*.d.ts | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force
  }
} else {
  Write-Host "Tip: After building npm in WeChat DevTools, run this script again to fix @tencentcloud/lite-chat/basic.js."
}

Write-Host "TUICallKit sync completed. Next, open WeChat DevTools and run 'Tools -> Build npm'."
