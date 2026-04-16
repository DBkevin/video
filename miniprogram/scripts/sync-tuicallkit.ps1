$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$sourcePackage = Join-Path $root "node_modules\@trtc\calls-uikit-wx"
$targetKit = Join-Path $root "TUICallKit"
$sourceWasm = Join-Path $root "node_modules\@trtc\call-engine-lite-wx\dist\RTCCallEngine.wasm.br"
$targetStatic = Join-Path $root "static"
$builtLiteChat = Join-Path $root "miniprogram_npm\@tencentcloud\lite-chat"
$sourceBasicJs = Join-Path $root "node_modules\@tencentcloud\lite-chat\basic.js"

if (-not (Test-Path $sourcePackage)) {
  throw "未找到 @trtc/calls-uikit-wx。请先在 miniprogram 目录执行 npm install。"
}

Write-Host "同步 TUICallKit 源码目录..."
New-Item -ItemType Directory -Force -Path $targetKit | Out-Null
Copy-Item -Path (Join-Path $sourcePackage "*") -Destination $targetKit -Recurse -Force

if (Test-Path $sourceWasm) {
  Write-Host "同步 RTCCallEngine.wasm.br..."
  New-Item -ItemType Directory -Force -Path $targetStatic | Out-Null
  Copy-Item -Path $sourceWasm -Destination (Join-Path $targetStatic "RTCCallEngine.wasm.br") -Force
} else {
  Write-Warning "未找到 RTCCallEngine.wasm.br，请确认 @trtc/call-engine-lite-wx 依赖已安装。"
}

if ((Test-Path $builtLiteChat) -and (Test-Path $sourceBasicJs)) {
  Write-Host "修复 miniprogram_npm/@tencentcloud/lite-chat/basic.js..."
  Copy-Item -Path $sourceBasicJs -Destination (Join-Path $builtLiteChat "basic.js") -Force

  $builtIndexJs = Join-Path $builtLiteChat "index.js"
  if (Test-Path $builtIndexJs) {
    Remove-Item -LiteralPath $builtIndexJs -Force
  }
} else {
  Write-Host "提示：微信开发者工具完成“构建 npm”后，请再次运行本脚本，以修复 @tencentcloud/lite-chat/basic.js。"
}

Write-Host "TUICallKit 同步完成。接下来请打开微信开发者工具，执行“工具 -> 构建 npm”。"
