<template>
  <div ref="container" class="mxgraph-container"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch, provide } from "vue";
import { registerCustomShapes } from "./shapes.js";
import mxgraph from "mxgraph";

/**
 * 组件入参：尺寸、资源路径、初始元素、只读、橡皮筋选择
 */
const props = defineProps({
  width: { type: [String, Number], default: "100%" },
  height: { type: [String, Number], default: 400 },
  basePath: { type: String, default: "mxgraph/javascript/src" },
  imageBasePath: { type: String, default: "mxgraph/javascript/src/images" },
  cells: { type: Array, default: () => [] },
  readOnly: { type: Boolean, default: false },
  rubberband: { type: Boolean, default: true }
});

/**
 * 组件事件：ready、click、change
 */
const emit = defineEmits(["ready", "click", "change"]);

const container = ref(null);
let graph = null;
const graphRef = ref(null);
let mx = null;
let undoMgr = null;

/**
 * 初始化 mxgraph 运行时所需路径与对象
 * @returns {void}
 */
function initMx() {
  const ctx = typeof window !== "undefined" ? window : globalThis;
  mx = mxgraph.call(ctx, {
    mxBasePath: props.basePath,
    mxImageBasePath: props.imageBasePath,
    mxLoadResources: true,
    mxLoadStylesheets: true,
    mxForceIncludes: false,
    mxResourceExtension: ".txt"
  });
  registerCustomShapes(mx);

  /**
   * 启用并配置旋转控制点，位置与图标对齐 Grapheditor 示例
   * @param {any} mxns mx 命名空间对象
   * @returns {void}
   */
  function setupRotation(mxns) {
    const { mxVertexHandler, mxGraphHandler, mxEvent, mxPoint, mxImage, mxUtils, mxConstants } = mxns;

    // 旋转与实时预览能力
    mxVertexHandler.prototype.rotationEnabled = true;
    mxVertexHandler.prototype.manageSizers = true;
    mxVertexHandler.prototype.livePreview = true;
    mxGraphHandler.prototype.maxLivePreview = 16;

    // 手柄位置（右上角），与 Grapheditor 保持一致
    mxVertexHandler.prototype.rotationHandleVSpacing = -12;

    /**
     * 计算旋转手柄位置（右上角偏移）
     * @returns {any}
     */
    mxVertexHandler.prototype.getRotationHandlePosition = function () {
      const padding = this.getHandlePadding();
      return new mxPoint(
        this.bounds.x + this.bounds.width - this.rotationHandleVSpacing + padding.x / 2,
        this.bounds.y + this.rotationHandleVSpacing - padding.y / 2
      );
    };

    // 使用与示例一致的旋转图标（SVG dataURI，不依赖外部资源）
    const rotationSvg =
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">' +
          '<path stroke="#007bff" fill="#007bff" d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z"/>' +
        '</svg>'
      );
    const rotationHandleImg = new mxImage(rotationSvg, 16, 16);

    const origCreateSizerShape = mxVertexHandler.prototype.createSizerShape;

    /**
     * 创建控制点图形：为旋转手柄设置自定义图标
     * @param {any} bounds
     * @param {number} index
     * @param {string} fillColor
     * @returns {any}
     */
    mxVertexHandler.prototype.createSizerShape = function (bounds, index, fillColor) {
      if (index === mxEvent.ROTATION_HANDLE) {
        this.handleImage = rotationHandleImg;
      }
      return origCreateSizerShape.apply(this, arguments);
    };

    /**
     * 单击旋转手柄时：按 90° 递增旋转（与 Grapheditor 行为保持一致）
     * @returns {void}
     */
    mxVertexHandler.prototype.rotateClick = function () {
      const stroke = mxUtils.getValue(this.state.style, mxConstants.STYLE_STROKECOLOR, mxConstants.NONE);
      const fill = mxUtils.getValue(this.state.style, mxConstants.STYLE_FILLCOLOR, mxConstants.NONE);

      if (this.state.view.graph.model.isVertex(this.state.cell) && stroke === mxConstants.NONE && fill === mxConstants.NONE) {
        const angle = mxUtils.mod(mxUtils.getValue(this.state.style, mxConstants.STYLE_ROTATION, 0) + 90, 360);
        this.state.view.graph.setCellStyles(mxConstants.STYLE_ROTATION, angle, [this.state.cell]);
      } else {
        this.state.view.graph.turnShapes([this.state.cell]);
      }
    };

    const origMouseMove = mxVertexHandler.prototype.mouseMove;

    /**
     * 拖拽时隐藏旋转手柄，避免遮挡
     * @param {any} sender
     * @param {any} me
     * @returns {void}
     */
    mxVertexHandler.prototype.mouseMove = function (sender, me) {
      origMouseMove.apply(this, arguments);
      if (this.graph.graphHandler.first != null) {
        if (this.rotationShape != null && this.rotationShape.node != null) {
          this.rotationShape.node.style.display = 'none';
        }
      }
    };

    const origMouseUp = mxVertexHandler.prototype.mouseUp;

    /**
     * 手势结束时仅在单选顶点时显示旋转手柄
     * @param {any} sender
     * @param {any} me
     * @returns {void}
     */
    mxVertexHandler.prototype.mouseUp = function (sender, me) {
      origMouseUp.apply(this, arguments);
      if (this.rotationShape != null && this.rotationShape.node != null) {
        this.rotationShape.node.style.display = this.graph.getSelectionCount() === 1 ? '' : 'none';
      }
    };
  }

  setupRotation(mx);
}

/**
 * 设置容器尺寸样式
 * @returns {void}
 */
function setSize() {
  const el = container.value;
  if (!el) return;
  el.style.width =
    typeof props.width === "number" ? `${props.width}px` : props.width;
  el.style.height =
    typeof props.height === "number" ? `${props.height}px` : props.height;
}

/**
 * 将 props.cells 渲染到图上
 * @returns {void}
 */
function renderCells() {
  const { mxGraph } = mx;
  if (!graph || !mxGraph) return;
  const parent = graph.getDefaultParent();
  const createdVertices = new Map();
  graph.getModel().beginUpdate();
  try {
    props.cells.forEach(cell => {
      if (cell.type === "vertex") {
        const v = graph.insertVertex(
          parent,
          cell.id,
          cell.label ?? "",
          cell.x ?? 0,
          cell.y ?? 0,
          cell.w ?? 80,
          cell.h ?? 30,
          cell.style
        );
        createdVertices.set(cell.id, v);
      }
    });
    props.cells.forEach(cell => {
      if (cell.type === "edge") {
        const vSource = createdVertices.get(cell.source);
        const vTarget = createdVertices.get(cell.target);
        if (vSource && vTarget) {
          graph.insertEdge(
            parent,
            cell.id,
            cell.label ?? "",
            vSource,
            vTarget,
            cell.style
          );
        }
      }
    });
  } finally {
    graph.getModel().endUpdate();
  }
}

/**
 * 初始化图与交互，并绑定基础事件
 * @returns {void}
 */
function initGraph() {
  const { mxGraph, mxRubberband, mxEvent } = mx;
  graph = new mxGraph(container.value);
  graph.setHtmlLabels(true);
  graph.resetEdgesOnConnect = false;
  graph.setEnabled(!props.readOnly);
  // 启用可连接与平移，提升拖拽连线与交互体验
  graph.setConnectable(true);
  graph.setPanning(true);
  graph.panningHandler.useLeftButtonForPanning = true;
  if (graph.graphHandler) {
    graph.graphHandler.guidesEnabled = true;
  }
  if (props.rubberband) new mxRubberband(graph);

  renderCells();

  emit("ready", { graph, mx });

  graphRef.value = graph;
  provide("getGraph", getGraph);
  provide("mxGraph", graphRef);
  provide("mx", mx);

  graph.addListener(mxEvent.CLICK, (sender, evt) => {
    const cell = evt.getProperty("cell");
    emit("click", { cell, evt });
  });

  graph.getModel().addListener(mxEvent.CHANGE, () => {
    emit("change", graph.getModel());
    updatePlaceholders();
  });

  // 撤销管理：捕获模型与视图的可撤销编辑
  undoMgr = new mx.mxUndoManager();
  const undoListener = (sender, evt) => {
    const edit = evt.getProperty("edit");
    if (edit) undoMgr.undoableEditHappened(edit);
  };
  graph.getModel().addListener(mx.mxEvent.UNDO, undoListener);
  graph.getView().addListener(mx.mxEvent.UNDO, undoListener);

  // 占位符渲染：%name%、%date{...}%
  const origGetLabel = graph.getLabel.bind(graph);
  graph.getLabel = function (cell) {
    let res = origGetLabel(cell);
    try {
      const v = cell?.value;
      if (v && typeof v === "object" && v.getAttribute && v.getAttribute("placeholders") === "1") {
        res = replacePlaceholders(res, v);
      }
    } catch (e) {}
    return res;
  };
  function replacePlaceholders(text, node) {
    if (typeof text !== "string") return text;
    let out = text;
    // %name%
    const name = node.getAttribute("name") || "";
    out = out.replace(/%name%/g, name);
    // %date{...}% 简化：使用本地时间字符串
    out = out.replace(/%date\{[^}]*\}%/g, () => new Date().toLocaleString());
    return out;
  }

  // 更新占位符相关单元的视图
  function updatePlaceholders() {
    const model = graph.getModel();
    let validate = false;
    const cells = model.cells || {};
    for (const key in cells) {
      const cell = cells[key];
      const v = cell?.value;
      if (v && typeof v === "object" && v.getAttribute && v.getAttribute("placeholders") === "1") {
        graph.view.invalidate(cell, false, false);
        validate = true;
      }
    }
    if (validate) graph.view.validate();
  }
}

/**
 * 获取 graph 实例
 * @returns {any}
 */
function getGraph() {
  return graph;
}

/**
 * 获取 mx 命名空间对象
 * @returns {any}
 */
function getMx() {
  return mx;
}

/**
 * 注册 FlexArrow 形状，使其在画布上正确按照 width/startWidth/endWidth 绘制厚箭头
 * @param {any} mxns mx 命名空间对象
 * @returns {void}
 */


/**
 * 注册 Grapheditor 中的其它自定义形状（link、manualInput、internalStorage、corner、crossbar、tee）
 * @param {any} mxns mx 命名空间对象
 * @returns {void}
 */


/**
 * 触发打开文件对话框
 * @returns {void}
 */
function triggerOpen() {
  if (fileInput.value) fileInput.value.click();
}

/**
 * 文件选择变更事件处理，读取并加载 JSON
 * @param {Event} e
 * @returns {Promise<void>}
 */
async function onFileChange(e) {
  const input = e.target;
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const text = await file.text();
  let data = [];
  try {
    data = JSON.parse(text);
  } catch (err) {
    console.error(err);
    return;
  }
  loadCellsFromJSON(data);
  input.value = "";
}

/**
 * 新建图：清空当前模型
 * @returns {void}
 */
function newGraph() {
  if (!graph) return;
  graph.getModel().beginUpdate();
  try {
    graph.removeCells(graph.getChildVertices(graph.getDefaultParent()));
  } finally {
    graph.getModel().endUpdate();
  }
}

/**
 * 保存图为 JSON（顶点与边）并触发下载
 * @returns {void}
 */
function saveGraph() {
  if (!graph) return;
  const parent = graph.getDefaultParent();
  const model = graph.getModel();
  const cells = [];
  const verts = graph.getChildVertices(parent);
  for (const v of verts) {
    const geo = v.geometry;
    cells.push({
      type: "vertex",
      id: v.id || null,
      label: model.getValue(v) || "",
      x: geo?.x ?? 0,
      y: geo?.y ?? 0,
      w: geo?.width ?? 80,
      h: geo?.height ?? 30,
      style: model.getStyle(v) || ""
    });
  }
  const edges = graph.getChildEdges(parent);
  for (const e of edges) {
    const src = model.getTerminal(e, true);
    const trg = model.getTerminal(e, false);
    cells.push({
      type: "edge",
      id: e.id || null,
      label: model.getValue(e) || "",
      source: src?.id || null,
      target: trg?.id || null,
      style: model.getStyle(e) || ""
    });
  }
  const blob = new Blob([JSON.stringify(cells, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "graph.json";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 从 JSON 加载顶点与边
 * @param {Array} data
 * @returns {void}
 */
function loadCellsFromJSON(data) {
  if (!graph) return;
  const parent = graph.getDefaultParent();
  const created = new Map();
  graph.getModel().beginUpdate();
  try {
    for (const c of data || []) {
      if (c.type === "vertex") {
        const v = graph.insertVertex(
          parent,
          c.id || null,
          c.label || "",
          c.x || 0,
          c.y || 0,
          c.w || 80,
          c.h || 30,
          c.style || null
        );
        created.set(c.id, v);
      }
    }
    for (const c of data || []) {
      if (c.type === "edge") {
        const s = created.get(c.source);
        const t = created.get(c.target);
        if (s && t)
          graph.insertEdge(
            parent,
            c.id || null,
            c.label || "",
            s,
            t,
            c.style || null
          );
      }
    }
  } finally {
    graph.getModel().endUpdate();
  }
}

/**
 * 删除当前选中单元
 * @returns {void}
 */
function deleteSelection() {
  if (!graph) return;
  const cells = graph.getSelectionCells();
  if (cells && cells.length) graph.removeCells(cells);
}

/**
 * 撤销操作
 * @returns {void}
 */
function undo() {
  if (undoMgr) undoMgr.undo();
}

/**
 * 重做操作
 * @returns {void}
 */
function redo() {
  if (undoMgr) undoMgr.redo();
}

/**
 * 视图放大
 * @returns {void}
 */
function zoomIn() {
  if (!graph) return;
  graph.zoomIn();
}

/**
 * 视图缩小
 * @returns {void}
 */
function zoomOut() {
  if (!graph) return;
  graph.zoomOut();
}

/**
 * 适配到容器
 * @returns {void}
 */
function fit() {
  if (!graph) return;
  graph.fit();
}

/**
 * 恢复原始比例
 * @returns {void}
 */
function actualSize() {
  if (!graph) return;
  graph.zoomActual();
}

onMounted(() => {
  initMx();
  setSize();
  initGraph();
  const keyHandler = (e) => {
    const meta = e.metaKey || e.ctrlKey;
    if (meta && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    } else if (meta && (e.key.toLowerCase() === "y")) {
      e.preventDefault();
      redo();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if (!props.readOnly) {
        e.preventDefault();
        deleteSelection();
      }
    }
  };
  window.addEventListener("keydown", keyHandler);
  // 保存以便卸载时清理
  (window.__mxKeyHandler = window.__mxKeyHandler || []).push(keyHandler);
});

watch(
  () => [props.width, props.height],
  () => setSize()
);

onBeforeUnmount(() => {
  if (graph) {
    graph.destroy();
    graph = null;
  }
  if (window.__mxKeyHandler && window.__mxKeyHandler.length) {
    const fns = window.__mxKeyHandler.splice(0);
    fns.forEach(fn => {
      try { window.removeEventListener("keydown", fn); } catch (e) {}
    });
  }
});

defineExpose({ getGraph, getMx });
</script>

<style scoped>
.mxgraph-container {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  min-height: 300px;
}
</style>
