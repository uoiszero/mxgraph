'use strict'

const http = require('http')
const fs = require('fs')
const path = require('path')

// 简易 MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
}

// 函数：解析命令行参数，支持 --port 与 --root，含环境变量回退
function parseArgs(argv) {
  const get = (key) => {
    const idx = argv.indexOf(key)
    return idx >= 0 ? argv[idx + 1] : undefined
  }

  const portStr = get('--port') || process.env.PORT || '8000'
  const rootArg = get('--root') || process.env.ROOT || __dirname

  const port = Number(portStr)
  const root = path.resolve(rootArg)

  return { port: Number.isFinite(port) ? port : 8000, root }
}

// 函数：根据扩展名获取 MIME 类型
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

// 函数：统一发送错误响应
function sendError(res, code, message) {
  res.statusCode = code
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(message)
}

// 函数：从 URL 解析得到受保护的本地物理路径（抵御目录穿越）
function resolvePathFromUrl(urlPath, root) {
  const pathNoQuery = decodeURIComponent(urlPath.split('?')[0] || '/')
  let rel = path.posix.normalize(pathNoQuery)
  if (rel === '/' || rel === '') rel = '/index.html'
  rel = rel.replace(/^\/+/, '')

  const joined = path.join(root, rel)
  const resolved = path.resolve(joined)

  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return null
  }
  return resolved
}

// 函数：读取并输出文件内容
function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) return sendError(res, 500, 'Server Error')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Content-Type', getMimeType(filePath))
    res.end(data)
  })
}

// 函数：HTTP 请求处理器（静态资源服务 + 目录索引为 index.html）
function requestHandler(root) {
  return (req, res) => {
    try {
      const resolved = resolvePathFromUrl(req.url || '/', root)
      if (!resolved) return sendError(res, 403, 'Forbidden')

      fs.stat(resolved, (err, stat) => {
        if (err) return sendError(res, 404, 'Not Found')

        const target = stat.isDirectory()
          ? path.join(resolved, 'index.html')
          : resolved

        fs.stat(target, (err2) => {
          if (err2) return sendError(res, 404, 'Not Found')
          serveFile(target, res)
        })
      })
    } catch (e) {
      sendError(res, 500, 'Server Error')
    }
  }
}

// 启动入口
const { port, root } = parseArgs(process.argv.slice(2))
const server = http.createServer(requestHandler(root))
server.listen(port, () => {
  console.log(`Serving ${root} on http://localhost:${port}/`)
})

