const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const root = path.resolve(__dirname, '..')
const sourceDir = path.join(root, 'node_modules', '@trtc', 'call-engine-lite-wx')
const sourceBrotliPath = path.join(sourceDir, 'RTCCallEngine.wasm.br')
const sourceWasmPath = path.join(sourceDir, 'RTCCallEngine.wasm')
const builtDir = path.join(root, 'miniprogram_npm', '@trtc', 'call-engine-lite-wx')
const builtWasmPath = path.join(builtDir, 'RTCCallEngine.wasm')

if (!fs.existsSync(sourceBrotliPath)) {
  console.log('@trtc/call-engine-lite-wx RTCCallEngine.wasm.br not found, skipping wasm patch.')
  process.exit(0)
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function isValidWasm(filePath) {
  if (!fs.existsSync(filePath)) {
    return false
  }

  const header = fs.readFileSync(filePath).subarray(0, 4)
  return header.length === 4
    && header[0] === 0x00
    && header[1] === 0x61
    && header[2] === 0x73
    && header[3] === 0x6d
}

function ensureWasmFromBrotli() {
  if (isValidWasm(sourceWasmPath)) {
    console.log('RTCCallEngine.wasm already exists in node_modules.')
    return
  }

  const compressedBuffer = fs.readFileSync(sourceBrotliPath)
  const wasmBuffer = zlib.brotliDecompressSync(compressedBuffer)
  fs.writeFileSync(sourceWasmPath, wasmBuffer)
  console.log('Decompressed RTCCallEngine.wasm from RTCCallEngine.wasm.br')
}

function syncBuiltWasm() {
  if (!fs.existsSync(builtDir)) {
    console.log('miniprogram_npm/@trtc/call-engine-lite-wx not found yet, skip built wasm sync.')
    return
  }

  ensureDir(builtDir)
  fs.copyFileSync(sourceWasmPath, builtWasmPath)
  console.log('Synced RTCCallEngine.wasm into miniprogram_npm/@trtc/call-engine-lite-wx')
}

ensureWasmFromBrotli()
syncBuiltWasm()
