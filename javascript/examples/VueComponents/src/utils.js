/**
 * ensureMxClient
 * 动态加载 mxClient.js，并在必要时设置 mxBasePath 与 mxImageBasePath
 */
export function ensureMxClient({
  mxClientUrl,
  mxBasePath,
  mxImageBasePath,
} = {}) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();

    // 已存在则只需补充路径设置
    if (window.mxClient) {
      if (mxBasePath && !window.mxBasePath) window.mxBasePath = mxBasePath;
      if (mxImageBasePath && !window.mxImageBasePath)
        window.mxImageBasePath = mxImageBasePath;
      /**
       * loadGeIfNeeded
       * 在 mxClient 已存在时，确保 Grapheditor 扩展 Shapes.js 也已加载
       */
      function loadGeIfNeeded() {
        if (
          window.Graph &&
          (window.Graph.handleFactory || window.Graph.createHandle)
        )
          return resolve();
        const geRel = new URL("../vendor/ge/Shapes.js", import.meta.url).href;
        const geCandidates = [geRel];
        // 仅在 Graph 已存在时尝试加载 Grapheditor 的扩展；避免创建空 Graph 导致脚本假定其完整实现
        const tryLoad = i => {
          if (i >= geCandidates.length) return resolve();
          const ss = document.createElement("script");
          ss.src = geCandidates[i];
          ss.async = true;
          ss.onload = () => resolve();
          ss.onerror = () => {
            try {
              document.head.removeChild(ss);
            } catch (e) {}
            tryLoad(i + 1);
          };
          document.head.appendChild(ss);
        };
        tryLoad(0);
      }
      return loadGeIfNeeded();
    }

    // 缺省开箱即用路径（组件内置 vendor），以具体文件定位避免目录解析报错
    const mxClientRel = new URL(
      "../vendor/mxgraph/js/mxClient.js",
      import.meta.url
    ).href;
    // 备用：通过自动注入的样式链接反推出包根路径，构造 vendor 的绝对地址
    let styleHref = null;
    const styleEl = document.getElementById("mxgraph-vue-style");
    if (styleEl && typeof styleEl.href === "string") styleHref = styleEl.href;
    let pkgRoot = null;
    if (styleHref) {
      pkgRoot = styleHref.replace(/\/?dist\/index\.css.*$/, "");
    }
    const mxClientFromStyle = pkgRoot
      ? pkgRoot + "/vendor/mxgraph/js/mxClient.js"
      : null;
    const tryUrls = [mxClientUrl, mxClientRel, mxClientFromStyle]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);

    const loadWithIndex = idx => {
      if (idx >= tryUrls.length) {
        return reject(new Error("Failed to load mxClient.js from all candidates"));
      }
      const url = tryUrls[idx];
      const base = url.replace(/\/js\/mxClient\.js$/, "");
      if (!window.mxBasePath) window.mxBasePath = base;
      if (!window.mxImageBasePath)
        window.mxImageBasePath = mxImageBasePath || `${base}/images`;
      if (window.mxLoadResources == null) window.mxLoadResources = false;

      const s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.onload = () => {
        // 加载 Grapheditor 扩展形状（可选）
        const geRel = new URL("../vendor/ge/Shapes.js", import.meta.url).href;
        const geCandidates = [geRel];
        const loadGe = i => {
          if (i >= geCandidates.length) return resolve();
          // 只有在已有 Graph 环境时才加载 Grapheditor 扩展脚本
          if (typeof window === "undefined" || !window.Graph) return resolve();
          const ss = document.createElement("script");
          ss.src = geCandidates[i];
          ss.async = true;
          ss.onload = () => resolve();
          ss.onerror = () => {
            try {
              document.head.removeChild(ss);
            } catch (e) {}
            loadGe(i + 1);
          };
          document.head.appendChild(ss);
        };
        loadGe(0);
      };
      s.onerror = () => {
        document.head.removeChild(s);
        loadWithIndex(idx + 1);
      };
      document.head.appendChild(s);
    };

    loadWithIndex(0);
  });
}
