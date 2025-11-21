<template>
  <div ref="container" class="mxgraph-container"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch, provide } from "vue";
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
  graph.setEnabled(!props.readOnly);
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
  });
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
