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

    // 缺省开箱即用路径（当前仓库内）
    const defaultBase = '/@fs/Users/alex/temp/mxgraph/javascript/src'
    const url = mxClientUrl || `${defaultBase}/js/mxClient.js`
    if (!window.mxBasePath) window.mxBasePath = mxBasePath || defaultBase
    if (!window.mxImageBasePath) window.mxImageBasePath = mxImageBasePath || `${defaultBase}/images`
    if (window.mxLoadResources == null) window.mxLoadResources = false

    const s = document.createElement('script')
    s.src = url
    s.async = true
    s.onload = () => resolve()
    s.onerror = (e) => reject(new Error('Failed to load mxClient.js'))
    document.head.appendChild(s)
  })
}

