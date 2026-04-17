const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const packageJsonPath = path.join(root, 'node_modules', '@trtc', 'calls-uikit-wx', 'package.json')

if (!fs.existsSync(packageJsonPath)) {
  console.log('@trtc/calls-uikit-wx package.json not found, skipping patch.')
  process.exit(0)
}

const rawPackageJson = fs.readFileSync(packageJsonPath, 'utf8').replace(/^\uFEFF/, '')
const packageJson = JSON.parse(rawPackageJson)
const packageDir = path.dirname(packageJsonPath)
const expectedMain = './index.js'
const expectedTypes = './index.d.ts'

function resolveEntry(entry) {
  if (!entry) {
    return ''
  }

  return path.join(packageDir, entry.replace(/^[./\\]+/, ''))
}

const mainNeedsPatch = !packageJson.main || !fs.existsSync(resolveEntry(packageJson.main))
const moduleNeedsPatch = !packageJson.module || !fs.existsSync(resolveEntry(packageJson.module))
const typesNeedsPatch = !packageJson.types || !fs.existsSync(resolveEntry(packageJson.types))

if (!mainNeedsPatch && !moduleNeedsPatch && !typesNeedsPatch) {
  console.log('@trtc/calls-uikit-wx package entry already patched.')
  process.exit(0)
}

// 关键原因：
// 官方包当前版本的 package.json main 指向了不存在的 tuicall-uikit-vue.umd.js，
// 微信开发者工具在“构建 npm”时会直接报 entry file not found。
// 这里改成包里真实存在的 index.js，保证 DevTools 正常构建。
packageJson.main = expectedMain
packageJson.module = expectedMain
packageJson.types = expectedTypes

fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8')
console.log('Patched @trtc/calls-uikit-wx package entry to ./index.js')
