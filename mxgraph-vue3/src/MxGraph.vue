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
  registerFlexArrow(mx);
  registerGrapheditorShapes(mx);
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
  // 启用可连接与平移，提升拖拽连线与交互体验
  graph.setConnectable(true);
  graph.setPanning(true);
  graph.panningHandler.useLeftButtonForPanning = true;
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
 * 注册 FlexArrow 形状，使其在画布上正确按照 width/startWidth/endWidth 绘制厚箭头
 * @param {any} mxns mx 命名空间对象
 * @returns {void}
 */
function registerFlexArrow(mxns) {
  const { mxUtils, mxArrowConnector, mxCellRenderer } = mxns;

  /**
   * FlexArrowShape 构造函数
   * @constructor
   */
  function FlexArrowShape() {
    mxArrowConnector.call(this);
    this.spacing = 0;
  }

  mxUtils.extend(FlexArrowShape, mxArrowConnector);

  /**
   * 获取箭身基础宽度（厚度）
   * @returns {number}
   */
  FlexArrowShape.prototype.getEdgeWidth = function () {
    const base = mxUtils.getNumber(this.style, "width", 10);
    return base + Math.max(0, this.strokewidth - 1);
  };

  /**
   * 获取起始端箭头宽度
   * @returns {number}
   */
  FlexArrowShape.prototype.getStartArrowWidth = function () {
    const extra = mxUtils.getNumber(this.style, "startWidth", 20);
    return this.getEdgeWidth() + extra;
  };

  /**
   * 获取末端箭头宽度
   * @returns {number}
   */
  FlexArrowShape.prototype.getEndArrowWidth = function () {
    const extra = mxUtils.getNumber(this.style, "endWidth", 20);
    return this.getEdgeWidth() + extra;
  };

  /**
   * 注册形状到渲染器
   * @returns {void}
   */
  mxCellRenderer.registerShape("flexArrow", FlexArrowShape);

  // 自定义 EdgeHandler 的额外控制点：width、startWidth、endWidth；以及启用点击添加拐点
  const edgeCreateCustomHandles =
    mxns.mxEdgeHandler.prototype.createCustomHandles;
  mxns.mxEdgeHandler.prototype.createCustomHandles = function () {
    const handles = edgeCreateCustomHandles
      ? edgeCreateCustomHandles.apply(this, arguments)
      : null;
    const shapeName = this.state.style[mxns.mxConstants.STYLE_SHAPE] || "";
    if (shapeName !== "flexArrow") return handles;

    const graph = this.graph;
    const state = this.state;
    const s = graph.view.scale || 1;

    function makeRectHandle() {
      const sz = mxns.mxConstants.HANDLE_SIZE;
      return new mxns.mxRectangleShape(
        new mxns.mxRectangle(0, 0, sz, sz),
        mxns.mxConstants.HANDLE_FILLCOLOR,
        mxns.mxConstants.HANDLE_STROKECOLOR
      );
    }

    const pts = state.absolutePoints || [];
    const src = pts[0];
    const trg = pts[pts.length - 1];
    const mid = pts.length > 1 ? pts[Math.floor(pts.length / 2)] : src;

    function normalAt(a, b) {
      const dx = (b?.x || 0) - (a?.x || 0);
      const dy = (b?.y || 0) - (a?.y || 0);
      const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      return { nx: -dy / len, ny: dx / len };
    }

    const segA = pts.length > 1 ? normalAt(pts[0], pts[1]) : { nx: 0, ny: -1 };
    const segB =
      pts.length > 2
        ? normalAt(pts[pts.length - 2], pts[pts.length - 1])
        : { nx: 0, ny: -1 };

    // 计算法线方向（用于 width/端宽控制手柄的摆放）
    function makeHandle(baseKey, atPoint, nvec) {
      const shape = makeRectHandle();
      const handle = new mxns.mxHandle(state, "all-scroll", null, shape);
      let delta = 0;
      let base = parseFloat(
        state.style[baseKey] || (baseKey === "width" ? 10 : 20)
      );
      handle.redraw = function () {
        const off = 10 * s;
        const x =
          (atPoint?.x || state.getCenterX()) + (nvec ? nvec.nx * off : 0);
        const y =
          (atPoint?.y || state.getCenterY()) + (nvec ? nvec.ny * off : 0);
        this.shape.bounds.x = Math.floor(x - this.shape.bounds.width / 2);
        this.shape.bounds.y = Math.floor(y - this.shape.bounds.height / 2);
        this.shape.redraw();
      };
      handle.setVisible = function (v) {
        if (this.shape && this.shape.node)
          this.shape.node.style.display = v ? "" : "none";
      };
      handle.setPosition = function (bounds, pt) {
        const vx = pt.x - bounds.getCenterX();
        const vy = pt.y - bounds.getCenterY();
        delta = nvec
          ? (vx * nvec.nx + vy * nvec.ny) / s
          : Math.sqrt(vx * vx + vy * vy) / s;
      };
      handle.execute = function () {
        const val = Math.max(1, Math.round(base + delta));
        const model = graph.getModel();
        model.beginUpdate();
        try {
          graph.setCellStyles(baseKey, String(val), [state.cell]);
        } finally {
          model.endUpdate();
        }
        graph.refresh();
        graph.setSelectionCell(state.cell);
      };
      handle.reset = function () {
        delta = 0;
      };
      handle.positionChanged = function () {
        this.redraw();
      };
      return handle;
    }

    const startW = makeHandle("startWidth", src, segA);
    const endW = makeHandle("endWidth", trg, segB);
    const bodyW = makeHandle("width", mid, segB);

    return [startW, endW, bodyW];
  };

  // 启用虚拟拐点并采用 Grapheditor 的添加方式（Shift+点击添加）
  mxns.mxEdgeHandler.prototype.virtualBendsEnabled = true;
  mxns.mxEdgeHandler.prototype.isAddPointEvent = function (evt) {
    return mxns.mxEvent.isShiftDown(evt);
  };
}

/**
 * 注册 Grapheditor 中的其它自定义形状（link、manualInput、internalStorage、corner、crossbar、tee）
 * @param {any} mxns mx 命名空间对象
 * @returns {void}
 */
function registerGrapheditorShapes(mxns) {
  const {
    mxUtils,
    mxCellRenderer,
    mxArrowConnector,
    mxActor,
    mxRectangleShape,
    mxConstants
  } = mxns;

  /**
   * 开放端连线（Link）
   * @constructor
   */
  function LinkShape() {
    mxArrowConnector.call(this);
    this.spacing = 0;
  }
  mxUtils.extend(LinkShape, mxArrowConnector);
  /**
   * @returns {boolean}
   */
  LinkShape.prototype.isOpenEnded = function () {
    return true;
  };
  /**
   * @returns {number}
   */
  LinkShape.prototype.getEdgeWidth = function () {
    const base = mxUtils.getNumber(this.style, "width", 4);
    return base + Math.max(0, this.strokewidth - 1);
  };
  /**
   * @returns {boolean}
   */
  LinkShape.prototype.isArrowRounded = function () {
    return this.isRounded;
  };
  mxCellRenderer.registerShape("link", LinkShape);

  /**
   * 手动输入（ManualInput）
   * @constructor
   */
  function ManualInputShape() {
    mxActor.call(this);
  }
  mxUtils.extend(ManualInputShape, mxActor);
  /**
   * @returns {boolean}
   */
  ManualInputShape.prototype.isRoundable = function () {
    return true;
  };
  /**
   * @param {any} c
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @returns {void}
   */
  ManualInputShape.prototype.redrawPath = function (c, x, y, w, h) {
    const size = mxUtils.getNumber(this.style, "size", 30);
    const s = Math.min(h, size);
    const arcSize =
      mxUtils.getValue(
        this.style,
        mxConstants.STYLE_ARCSIZE,
        mxConstants.LINE_ARCSIZE
      ) / 2;
    this.addPoints(
      c,
      [
        new mxns.mxPoint(0, h),
        new mxns.mxPoint(0, s),
        new mxns.mxPoint(w, 0),
        new mxns.mxPoint(w, h)
      ],
      this.isRounded,
      arcSize,
      true
    );
    c.end();
  };
  mxCellRenderer.registerShape("manualInput", ManualInputShape);

  /**
   * 内部存储（InternalStorage）
   * @constructor
   */
  function InternalStorageShape() {
    mxRectangleShape.call(this);
  }
  mxUtils.extend(InternalStorageShape, mxRectangleShape);
  /**
   * @param {any} c
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @returns {void}
   */
  InternalStorageShape.prototype.paintForeground = function (c, x, y, w, h) {
    mxRectangleShape.prototype.paintForeground.apply(this, arguments);
    let inset = 0;
    if (this.isRounded) {
      const f =
        mxUtils.getValue(
          this.style,
          mxConstants.STYLE_ARCSIZE,
          mxConstants.RECTANGLE_ROUNDING_FACTOR * 100
        ) / 100;
      inset = Math.max(inset, Math.min(w * f, h * f));
    }
    const dx = Math.max(
      inset,
      Math.min(w, mxUtils.getNumber(this.style, "dx", 20))
    );
    const dy = Math.max(
      inset,
      Math.min(h, mxUtils.getNumber(this.style, "dy", 20))
    );
    c.begin();
    c.moveTo(x, y + dy);
    c.lineTo(x + w, y + dy);
    c.end();
    c.stroke();
    c.begin();
    c.moveTo(x + dx, y);
    c.lineTo(x + dx, y + h);
    c.end();
    c.stroke();
  };
  mxCellRenderer.registerShape("internalStorage", InternalStorageShape);

  /**
   * 转角（Corner）
   * @constructor
   */
  function CornerShape() {
    mxActor.call(this);
  }
  mxUtils.extend(CornerShape, mxActor);
  /**
   * @param {any} c
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @returns {void}
   */
  CornerShape.prototype.redrawPath = function (c, x, y, w, h) {
    const dx = Math.max(
      0,
      Math.min(w, mxUtils.getNumber(this.style, "dx", 20))
    );
    const dy = Math.max(
      0,
      Math.min(h, mxUtils.getNumber(this.style, "dy", 20))
    );
    const arcSize =
      mxUtils.getValue(
        this.style,
        mxConstants.STYLE_ARCSIZE,
        mxConstants.LINE_ARCSIZE
      ) / 2;
    this.addPoints(
      c,
      [
        new mxns.mxPoint(0, 0),
        new mxns.mxPoint(w, 0),
        new mxns.mxPoint(w, dy),
        new mxns.mxPoint(dx, dy),
        new mxns.mxPoint(dx, h),
        new mxns.mxPoint(0, h)
      ],
      this.isRounded,
      arcSize,
      true
    );
    c.end();
  };
  mxCellRenderer.registerShape("corner", CornerShape);

  /**
   * 横杆（Crossbar）
   * @constructor
   */
  function CrossbarShape() {
    mxActor.call(this);
  }
  mxUtils.extend(CrossbarShape, mxActor);
  /**
   * @param {any} c
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @returns {void}
   */
  CrossbarShape.prototype.redrawPath = function (c, x, y, w, h) {
    c.moveTo(0, 0);
    c.lineTo(0, h);
    c.end();
    c.moveTo(w, 0);
    c.lineTo(w, h);
    c.end();
    c.moveTo(0, h / 2);
    c.lineTo(w, h / 2);
    c.end();
  };
  mxCellRenderer.registerShape("crossbar", CrossbarShape);

  /**
   * T 形（Tee）
   * @constructor
   */
  function TeeShape() {
    mxActor.call(this);
  }
  mxUtils.extend(TeeShape, mxActor);
  /**
   * @param {any} c
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @returns {void}
   */
  TeeShape.prototype.redrawPath = function (c, x, y, w, h) {
    const dx = Math.max(
      0,
      Math.min(w, mxUtils.getNumber(this.style, "dx", 20))
    );
    const dy = Math.max(
      0,
      Math.min(h, mxUtils.getNumber(this.style, "dy", 20))
    );
    const arcSize =
      mxUtils.getValue(
        this.style,
        mxConstants.STYLE_ARCSIZE,
        mxConstants.LINE_ARCSIZE
      ) / 2;
    this.addPoints(
      c,
      [
        new mxns.mxPoint(0, 0),
        new mxns.mxPoint(w, 0),
        new mxns.mxPoint(w, dy),
        new mxns.mxPoint((w + dx) / 2, dy),
        new mxns.mxPoint((w + dx) / 2, h),
        new mxns.mxPoint((w - dx) / 2, h),
        new mxns.mxPoint((w - dx) / 2, dy),
        new mxns.mxPoint(0, dy)
      ],
      this.isRounded,
      arcSize,
      true
    );
    c.end();
  };
  mxCellRenderer.registerShape("tee", TeeShape);
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
