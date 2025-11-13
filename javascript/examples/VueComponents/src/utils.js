/**
 * ensureMxClient
 * 动态加载 mxClient.js，并在必要时设置 mxBasePath 与 mxImageBasePath
 */
export function ensureMxClient({ mxClientUrl, mxBasePath, mxImageBasePath } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve()

    // 已存在则只需补充路径设置
    if (window.mxClient) {
      if (mxBasePath && !window.mxBasePath) window.mxBasePath = mxBasePath
      if (mxImageBasePath && !window.mxImageBasePath) window.mxImageBasePath = mxImageBasePath
      return resolve()
    }

    // 缺省开箱即用路径（组件内置 vendor），并提供绝对路径兜底（/@fs/...）
    const vendorRel = new URL('../vendor/mxgraph/', import.meta.url).href.replace(/\/$/, '')
    const vendorAbs = '/@fs/Users/alex/temp/mxgraph/javascript/examples/VueComponents/vendor/mxgraph'
    const tryBases = [mxBasePath, vendorRel, vendorAbs].filter(Boolean)

    const loadWithBase = (baseIdx) => {
      if (baseIdx >= tryBases.length) {
        return reject(new Error('Failed to load mxClient.js from all bases'))
      }
      const base = tryBases[baseIdx].replace(/\/$/, '')
      const url = mxClientUrl || `${base}/js/mxClient.js`
      if (!window.mxBasePath) window.mxBasePath = base
      if (!window.mxImageBasePath) window.mxImageBasePath = (mxImageBasePath || `${base}/images`)
      if (window.mxLoadResources == null) window.mxLoadResources = false

      const s = document.createElement('script')
      s.src = url
      s.async = true
      s.onload = () => {
        // 加载 Grapheditor 扩展形状（可选）
        const geRel = new URL('../vendor/ge/Shapes.js', import.meta.url).href
        const geAbs = '/@fs/Users/alex/temp/mxgraph/javascript/examples/VueComponents/vendor/ge/Shapes.js'
        const geCandidates = [geRel, geAbs]
        const loadGe = (i) => {
          if (i >= geCandidates.length) return resolve()
          if (typeof window !== 'undefined' && !window.Graph) {
            window.Graph = {}
          }
          const ss = document.createElement('script')
          ss.src = geCandidates[i]
          ss.async = true
          ss.onload = () => resolve()
          ss.onerror = () => { try { document.head.removeChild(ss) } catch (e) {} ; loadGe(i+1) }
          document.head.appendChild(ss)
        }
        loadGe(0)
      }
      s.onerror = () => {
        // 尝试下一个 base
        document.head.removeChild(s)
        loadWithBase(baseIdx + 1)
      }
      document.head.appendChild(s)
    }

    loadWithBase(0)
  })
}
