import { cpSync, rmSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../../../..')
const componentsDir = path.resolve(__dirname, '..')

// 源路径
const mxSrcDir = path.resolve(root, 'javascript/src')
const stencilsSrcDir = path.resolve(root, 'javascript/examples/grapheditor/www/stencils')

// 目标路径
const vendorDir = path.resolve(componentsDir, 'vendor/mxgraph')
const stencilsDir = path.resolve(componentsDir, 'stencils')

function ensureDir(p) { if (!existsSync(p)) mkdirSync(p, { recursive: true }) }

/**
 * 复制 mxGraph 运行时（js/* 与 images/*）到 vendor
 */
function copyMxRuntime() {
  ensureDir(vendorDir)
  // 清理旧内容
  rmSync(vendorDir, { recursive: true, force: true })
  ensureDir(vendorDir)
  // 拷贝 js 与 images 目录
  cpSync(path.join(mxSrcDir, 'js'), path.join(vendorDir, 'js'), { recursive: true })
  cpSync(path.join(mxSrcDir, 'images'), path.join(vendorDir, 'images'), { recursive: true })
}

/**
 * 复制示例 stencils 到组件目录
 */
function copyStencils() {
  ensureDir(stencilsDir)
  for (const name of ['basic.xml', 'flowchart.xml', 'arrows.xml', 'bpmn.xml']) {
    cpSync(path.join(stencilsSrcDir, name), path.join(stencilsDir, name))
  }
}

copyMxRuntime()
copyStencils()
console.log('Assets prepared into VueComponents/vendor and VueComponents/stencils')
