import MxGraphCanvas from "./src/MxGraphCanvas.vue";
import MxStencilSidebar from "./src/MxStencilSidebar.vue";
import MxEditDialog from "./src/MxEditDialog.vue";
import MxStyleEditor from "./src/MxStyleEditor.vue";
/**
 * ensureCssInjected
 * 在浏览器环境下自动注入库的样式文件，确保开箱即用
 */
function ensureCssInjected() {
  if (typeof document === "undefined") return;
  const markerId = "mxgraph-vue-style";
  if (document.getElementById(markerId)) return;
  try {
    const href = new URL("./index.css", import.meta.url).href;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.id = markerId;
    document.head.appendChild(link);
  } catch (e) {}
}
ensureCssInjected();

export {
  MxGraphCanvas,
  MxStencilSidebar,
  MxEditDialog,
  MxStyleEditor,
};

export default {
  install(app) {
    ensureCssInjected();
    app.component("MxGraphCanvas", MxGraphCanvas);
    app.component("MxStencilSidebar", MxStencilSidebar);
    app.component("MxEditDialog", MxEditDialog);
    app.component("MxStyleEditor", MxStyleEditor);
  },
};
