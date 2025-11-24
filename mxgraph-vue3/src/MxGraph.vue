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
  graph.resetEdgesOnConnect = false;
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
  const { mxUtils, mxArrowConnector, mxCellRenderer, mxConstants } = mxns;

  /**
   * FlexArrowShape 构造函数（对应 Grapheditor 中的通用厚箭头）
   * @constructor
   */
  function FlexArrowShape() {
    mxArrowConnector.call(this);
    this.spacing = 0;
  }

  mxUtils.extend(FlexArrowShape, mxArrowConnector);
  FlexArrowShape.prototype.defaultWidth = 10;
  FlexArrowShape.prototype.defaultArrowWidth = 20;

  /**
   * 获取起始端箭头宽度
   * @returns {number}
   */
  FlexArrowShape.prototype.getStartArrowWidth = function () {
    return (
      this.getEdgeWidth() +
      mxUtils.getNumber(this.style, "startWidth", this.defaultArrowWidth)
    );
  };

  /**
   * 获取末端箭头宽度
   * @returns {number}
   */
  FlexArrowShape.prototype.getEndArrowWidth = function () {
    return (
      this.getEdgeWidth() +
      mxUtils.getNumber(this.style, "endWidth", this.defaultArrowWidth)
    );
  };

  /**
   * 获取箭身基础宽度（厚度）
   * @returns {number}
   */
  FlexArrowShape.prototype.getEdgeWidth = function () {
    return (
      mxUtils.getNumber(this.style, "width", this.defaultWidth) +
      Math.max(0, this.strokewidth - 1)
    );
  };

  /**
   * 注册形状到渲染器
   * @returns {void}
   */
  mxCellRenderer.registerShape("flexArrow", FlexArrowShape);

  /**
   * 创建自定义拖拽句柄（精确复刻 Grapheditor 的 createHandle 行为）
   * @param {any} state
   * @param {string[]} keys
   * @param {Function} getPositionFn
   * @param {Function} setPositionFn
   * @param {boolean} [ignoreGrid=true]
   * @param {boolean} [redrawEdges=false]
   * @param {Function} [executeFn]
   * @returns {any}
   */
  function createHandle(
    state,
    keys,
    getPositionFn,
    setPositionFn,
    ignoreGrid,
    redrawEdges,
    executeFn
  ) {
    const handle = new mxns.mxHandle(
      state,
      null,
      mxns.mxVertexHandler.prototype.secondaryHandleImage
    );

    handle.execute = function (me) {
      for (let i = 0; i < keys.length; i++) {
        this.copyStyle(keys[i]);
      }

      if (executeFn) {
        executeFn(me);
      }
    };

    handle.getPosition = getPositionFn;
    handle.setPosition = setPositionFn;
    handle.ignoreGrid = ignoreGrid != null ? ignoreGrid : true;

    if (redrawEdges) {
      const positionChanged = handle.positionChanged;
      handle.positionChanged = function () {
        positionChanged.apply(this, arguments);
        state.view.invalidate(this.state.cell);
        state.view.validate();
      };
    }

    return handle;
  }

  /**
   * 针对边的句柄定位/赋值封装（复刻 Grapheditor createEdgeHandle）
   * @param {any} state
   * @param {string[]} keys
   * @param {boolean} start 是否为起点侧
   * @param {Function} getPosition
   * @param {Function} setPosition
   * @returns {any}
   */
  /**
   * 针对边的句柄封装，启用拖动过程与释放后的强制重绘
   * @param {any} state
   * @param {string[]} keys
   * @param {boolean} start 是否为起点侧
   * @param {Function} getPosition
   * @param {Function} setPosition
   * @returns {any}
   */
  function createEdgeHandle(state, keys, start, getPosition, setPosition) {
    return createHandle(
      state,
      keys,
      function (bounds) {
        const pts = state.absolutePoints;
        const n = pts.length - 1;
        const tr = state.view.translate;
        const s = state.view.scale;
        const p0 = start ? pts[0] : pts[n];
        const p1 = start ? pts[1] : pts[n - 1];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const pt = getPosition.call(this, dist, dx / dist, dy / dist, p0, p1);
        return new mxns.mxPoint(pt.x / s - tr.x, pt.y / s - tr.y);
      },
      function (bounds, pt, me) {
        const pts = state.absolutePoints;
        const n = pts.length - 1;
        const tr = state.view.translate;
        const s = state.view.scale;
        const p0 = start ? pts[0] : pts[n];
        const p1 = start ? pts[1] : pts[n - 1];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        pt.x = (pt.x + tr.x) * s;
        pt.y = (pt.y + tr.y) * s;
        setPosition.call(this, dist, dx / dist, dy / dist, p0, p1, pt, me);
      },
      true,
      true,
      function () {
        state.view.invalidate(state.cell);
        state.view.validate();
      }
    );
  }

  /**
   * 为 flexArrow 形状创建控制句柄（宽度、起止箭头宽度与长度），含 Ctrl/Alt 交互
   * @param {any} state
   * @returns {any[]}
   */
  function flexArrowHandles(state) {
    const tol = state.view.graph.gridSize / state.view.scale;
    const handles = [];

    if (
      mxUtils.getValue(
        state.style,
        mxConstants.STYLE_STARTARROW,
        mxConstants.NONE
      ) != mxConstants.NONE
    ) {
      handles.push(
        createEdgeHandle(
          state,
          ["width", mxConstants.STYLE_STARTSIZE, mxConstants.STYLE_ENDSIZE],
          true,
          function (dist, nx, ny, p0, p1) {
            const w =
              (state.shape.getEdgeWidth() - state.shape.strokewidth) *
              state.view.scale;
            const l =
              mxUtils.getNumber(
                state.style,
                mxConstants.STYLE_STARTSIZE,
                mxConstants.ARROW_SIZE / 5
              ) *
              3 *
              state.view.scale;
            return new mxns.mxPoint(
              p0.x +
                nx * (l + state.shape.strokewidth * state.view.scale) +
                (ny * w) / 2,
              p0.y +
                ny * (l + state.shape.strokewidth * state.view.scale) -
                (nx * w) / 2
            );
          },
          function (dist, nx, ny, p0, p1, pt, me) {
            const w = Math.sqrt(
              mxUtils.ptSegDistSq(p0.x, p0.y, p1.x, p1.y, pt.x, pt.y)
            );
            const l = mxUtils.ptLineDist(
              p0.x,
              p0.y,
              p0.x + ny,
              p0.y - nx,
              pt.x,
              pt.y
            );
            state.style[mxConstants.STYLE_STARTSIZE] =
              Math.round(((l - state.shape.strokewidth) * 100) / 3) /
              100 /
              state.view.scale;
            state.style["width"] = Math.round(w * 2) / state.view.scale;
            if (mxns.mxEvent.isControlDown(me.getEvent())) {
              state.style[mxConstants.STYLE_ENDSIZE] =
                state.style[mxConstants.STYLE_STARTSIZE];
            }
            if (!mxns.mxEvent.isAltDown(me.getEvent())) {
              if (
                Math.abs(
                  parseFloat(state.style[mxConstants.STYLE_STARTSIZE]) -
                    parseFloat(state.style[mxConstants.STYLE_ENDSIZE])
                ) <
                tol / 6
              ) {
                state.style[mxConstants.STYLE_STARTSIZE] =
                  state.style[mxConstants.STYLE_ENDSIZE];
              }
            }
          }
        )
      );

      handles.push(
        createEdgeHandle(
          state,
          [
            "startWidth",
            "endWidth",
            mxConstants.STYLE_STARTSIZE,
            mxConstants.STYLE_ENDSIZE
          ],
          true,
          function (dist, nx, ny, p0, p1) {
            const w =
              (state.shape.getStartArrowWidth() - state.shape.strokewidth) *
              state.view.scale;
            const l =
              mxUtils.getNumber(
                state.style,
                mxConstants.STYLE_STARTSIZE,
                mxConstants.ARROW_SIZE / 5
              ) *
              3 *
              state.view.scale;
            return new mxns.mxPoint(
              p0.x +
                nx * (l + state.shape.strokewidth * state.view.scale) +
                (ny * w) / 2,
              p0.y +
                ny * (l + state.shape.strokewidth * state.view.scale) -
                (nx * w) / 2
            );
          },
          function (dist, nx, ny, p0, p1, pt, me) {
            const w = Math.sqrt(
              mxUtils.ptSegDistSq(p0.x, p0.y, p1.x, p1.y, pt.x, pt.y)
            );
            const l = mxUtils.ptLineDist(
              p0.x,
              p0.y,
              p0.x + ny,
              p0.y - nx,
              pt.x,
              pt.y
            );
            state.style[mxConstants.STYLE_STARTSIZE] =
              Math.round(((l - state.shape.strokewidth) * 100) / 3) /
              100 /
              state.view.scale;
            state.style["startWidth"] =
              Math.max(0, Math.round(w * 2) - state.shape.getEdgeWidth()) /
              state.view.scale;
            if (mxns.mxEvent.isControlDown(me.getEvent())) {
              state.style[mxConstants.STYLE_ENDSIZE] =
                state.style[mxConstants.STYLE_STARTSIZE];
              state.style["endWidth"] = state.style["startWidth"];
            }
            if (!mxns.mxEvent.isAltDown(me.getEvent())) {
              if (
                Math.abs(
                  parseFloat(state.style[mxConstants.STYLE_STARTSIZE]) -
                    parseFloat(state.style[mxConstants.STYLE_ENDSIZE])
                ) <
                tol / 6
              ) {
                state.style[mxConstants.STYLE_STARTSIZE] =
                  state.style[mxConstants.STYLE_ENDSIZE];
              }
              if (
                Math.abs(
                  parseFloat(state.style["startWidth"]) -
                    parseFloat(state.style["endWidth"])
                ) < tol
              ) {
                state.style["startWidth"] = state.style["endWidth"];
              }
            }
          }
        )
      );
    }

    if (
      mxUtils.getValue(
        state.style,
        mxConstants.STYLE_ENDARROW,
        mxConstants.NONE
      ) != mxConstants.NONE
    ) {
      handles.push(
        createEdgeHandle(
          state,
          ["width", mxConstants.STYLE_STARTSIZE, mxConstants.STYLE_ENDSIZE],
          false,
          function (dist, nx, ny, p0, p1) {
            const w =
              (state.shape.getEdgeWidth() - state.shape.strokewidth) *
              state.view.scale;
            const l =
              mxUtils.getNumber(
                state.style,
                mxConstants.STYLE_ENDSIZE,
                mxConstants.ARROW_SIZE / 5
              ) *
              3 *
              state.view.scale;
            return new mxns.mxPoint(
              p0.x +
                nx * (l + state.shape.strokewidth * state.view.scale) -
                (ny * w) / 2,
              p0.y +
                ny * (l + state.shape.strokewidth * state.view.scale) +
                (nx * w) / 2
            );
          },
          function (dist, nx, ny, p0, p1, pt, me) {
            const w = Math.sqrt(
              mxUtils.ptSegDistSq(p0.x, p0.y, p1.x, p1.y, pt.x, pt.y)
            );
            const l = mxUtils.ptLineDist(
              p0.x,
              p0.y,
              p0.x + ny,
              p0.y - nx,
              pt.x,
              pt.y
            );
            state.style[mxConstants.STYLE_ENDSIZE] =
              Math.round(((l - state.shape.strokewidth) * 100) / 3) /
              100 /
              state.view.scale;
            state.style["width"] = Math.round(w * 2) / state.view.scale;
            if (mxns.mxEvent.isControlDown(me.getEvent())) {
              state.style[mxConstants.STYLE_STARTSIZE] =
                state.style[mxConstants.STYLE_ENDSIZE];
            }
            if (!mxns.mxEvent.isAltDown(me.getEvent())) {
              if (
                Math.abs(
                  parseFloat(state.style[mxConstants.STYLE_ENDSIZE]) -
                    parseFloat(state.style[mxConstants.STYLE_STARTSIZE])
                ) <
                tol / 6
              ) {
                state.style[mxConstants.STYLE_ENDSIZE] =
                  state.style[mxConstants.STYLE_STARTSIZE];
              }
            }
          }
        )
      );

      handles.push(
        createEdgeHandle(
          state,
          [
            "startWidth",
            "endWidth",
            mxConstants.STYLE_STARTSIZE,
            mxConstants.STYLE_ENDSIZE
          ],
          false,
          function (dist, nx, ny, p0, p1) {
            const w =
              (state.shape.getEndArrowWidth() - state.shape.strokewidth) *
              state.view.scale;
            const l =
              mxUtils.getNumber(
                state.style,
                mxConstants.STYLE_ENDSIZE,
                mxConstants.ARROW_SIZE / 5
              ) *
              3 *
              state.view.scale;
            return new mxns.mxPoint(
              p0.x +
                nx * (l + state.shape.strokewidth * state.view.scale) -
                (ny * w) / 2,
              p0.y +
                ny * (l + state.shape.strokewidth * state.view.scale) +
                (nx * w) / 2
            );
          },
          function (dist, nx, ny, p0, p1, pt, me) {
            const w = Math.sqrt(
              mxUtils.ptSegDistSq(p0.x, p0.y, p1.x, p1.y, pt.x, pt.y)
            );
            const l = mxUtils.ptLineDist(
              p0.x,
              p0.y,
              p0.x + ny,
              p0.y - nx,
              pt.x,
              pt.y
            );
            state.style[mxConstants.STYLE_ENDSIZE] =
              Math.round(((l - state.shape.strokewidth) * 100) / 3) /
              100 /
              state.view.scale;
            state.style["endWidth"] =
              Math.max(0, Math.round(w * 2) - state.shape.getEdgeWidth()) /
              state.view.scale;
            if (mxns.mxEvent.isControlDown(me.getEvent())) {
              state.style[mxConstants.STYLE_STARTSIZE] =
                state.style[mxConstants.STYLE_ENDSIZE];
              state.style["startWidth"] = state.style["endWidth"];
            }
            if (!mxns.mxEvent.isAltDown(me.getEvent())) {
              if (
                Math.abs(
                  parseFloat(state.style[mxConstants.STYLE_ENDSIZE]) -
                    parseFloat(state.style[mxConstants.STYLE_STARTSIZE])
                ) <
                tol / 6
              ) {
                state.style[mxConstants.STYLE_ENDSIZE] =
                  state.style[mxConstants.STYLE_STARTSIZE];
              }
              if (
                Math.abs(
                  parseFloat(state.style["endWidth"]) -
                    parseFloat(state.style["startWidth"])
                ) < tol
              ) {
                state.style["endWidth"] = state.style["startWidth"];
              }
            }
          }
        )
      );
    }

    return handles;
  }

  /**
   * 挂载到 EdgeHandler：根据形状返回对应自定义句柄集合
   * @returns {any[]|null}
   */
  const edgeCreateCustomHandles =
    mxns.mxEdgeHandler.prototype.createCustomHandles;
  mxns.mxEdgeHandler.prototype.createCustomHandles = function () {
    const prev = edgeCreateCustomHandles
      ? edgeCreateCustomHandles.apply(this, arguments)
      : null;
    const name = this.state.style["shape"];
    if (name === "flexArrow") return flexArrowHandles(this.state);
    return prev;
  };

  /**
   * 开启虚拟拐点并使用 Shift+点击 添加拐点
   * @returns {boolean}
   */
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

  function CubeShape() { mxns.mxCylinder.call(this); }
  mxUtils.extend(CubeShape, mxns.mxCylinder);
  CubeShape.prototype.size = 20;
  CubeShape.prototype.darkOpacity = 0;
  CubeShape.prototype.darkOpacity2 = 0;
  CubeShape.prototype.paintVertexShape = function (c, x, y, w, h) {
    var s = Math.max(0, Math.min(w, Math.min(h, parseFloat(mxUtils.getValue(this.style, "size", this.size)))));
    var op = Math.max(-1, Math.min(1, parseFloat(mxUtils.getValue(this.style, "darkOpacity", this.darkOpacity))));
    var op2 = Math.max(-1, Math.min(1, parseFloat(mxUtils.getValue(this.style, "darkOpacity2", this.darkOpacity2))));
    c.translate(x, y);
    c.begin();
    c.moveTo(0, 0);
    c.lineTo(w - s, 0);
    c.lineTo(w, s);
    c.lineTo(w, h);
    c.lineTo(s, h);
    c.lineTo(0, h - s);
    c.lineTo(0, 0);
    c.close();
    c.end();
    c.fillAndStroke();
    if (!this.outline) {
      c.setShadow(false);
      if (op != 0) {
        c.setFillAlpha(Math.abs(op));
        c.setFillColor(op < 0 ? "#FFFFFF" : "#000000");
        c.begin();
        c.moveTo(0, 0);
        c.lineTo(w - s, 0);
        c.lineTo(w, s);
        c.lineTo(s, s);
        c.close();
        c.fill();
      }
      if (op2 != 0) {
        c.setFillAlpha(Math.abs(op2));
        c.setFillColor(op2 < 0 ? "#FFFFFF" : "#000000");
        c.begin();
        c.moveTo(0, 0);
        c.lineTo(s, s);
        c.lineTo(s, h);
        c.lineTo(0, h - s);
        c.close();
        c.fill();
      }
      c.begin();
      c.moveTo(s, h);
      c.lineTo(s, s);
      c.lineTo(0, 0);
      c.moveTo(s, s);
      c.lineTo(w, s);
      c.end();
      c.stroke();
    }
  };
  CubeShape.prototype.getLabelMargins = function (rect) {
    if (mxUtils.getValue(this.style, "boundedLbl", false)) {
      var s = parseFloat(mxUtils.getValue(this.style, "size", this.size)) * this.scale;
      return new mxns.mxRectangle(s, s, 0, 0);
    }
    return null;
  };
  mxCellRenderer.registerShape("cube", CubeShape);

  function DataStoreShape() { mxns.mxCylinder.call(this); }
  mxUtils.extend(DataStoreShape, mxns.mxCylinder);
  DataStoreShape.prototype.redrawPath = function (c, x, y, w, h, isForeground) {
    var dy = Math.min(h / 2, Math.round(h / 8) + this.strokewidth - 1);
    if ((isForeground && this.fill != null) || (!isForeground && this.fill == null)) {
      c.moveTo(0, dy);
      c.curveTo(0, 2 * dy, w, 2 * dy, w, dy);
      if (!isForeground) { c.stroke(); c.begin(); }
      c.translate(0, dy / 2);
      c.moveTo(0, dy);
      c.curveTo(0, 2 * dy, w, 2 * dy, w, dy);
      if (!isForeground) { c.stroke(); c.begin(); }
      c.translate(0, dy / 2);
      c.moveTo(0, dy);
      c.curveTo(0, 2 * dy, w, 2 * dy, w, dy);
      if (!isForeground) { c.stroke(); c.begin(); }
      c.translate(0, -dy);
    }
    if (!isForeground) {
      c.moveTo(0, dy);
      c.curveTo(0, -dy / 3, w, -dy / 3, w, dy);
      c.lineTo(w, h - dy);
      c.curveTo(w, h + dy / 3, 0, h + dy / 3, 0, h - dy);
      c.close();
    }
  };
  DataStoreShape.prototype.getLabelMargins = function (rect) {
    return new mxns.mxRectangle(0, 2.5 * Math.min(rect.height / 2, Math.round(rect.height / 8) + this.strokewidth - 1), 0, 0);
  };
  mxCellRenderer.registerShape("datastore", DataStoreShape);

  function NoteShape() { mxns.mxCylinder.call(this); }
  mxUtils.extend(NoteShape, mxns.mxCylinder);
  NoteShape.prototype.size = 30;
  NoteShape.prototype.darkOpacity = 0;
  NoteShape.prototype.paintVertexShape = function (c, x, y, w, h) {
    var s = Math.max(0, Math.min(w, Math.min(h, parseFloat(mxUtils.getValue(this.style, "size", this.size)))));
    var op = Math.max(-1, Math.min(1, parseFloat(mxUtils.getValue(this.style, "darkOpacity", this.darkOpacity))));
    c.translate(x, y);
    c.begin();
    c.moveTo(0, 0);
    c.lineTo(w - s, 0);
    c.lineTo(w, s);
    c.lineTo(w, h);
    c.lineTo(0, h);
    c.lineTo(0, 0);
    c.close();
    c.end();
    c.fillAndStroke();
    if (!this.outline) {
      c.setShadow(false);
      if (op != 0) {
        c.setFillAlpha(Math.abs(op));
        c.setFillColor(op < 0 ? "#FFFFFF" : "#000000");
        c.begin();
        c.moveTo(w - s, 0);
        c.lineTo(w - s, s);
        c.lineTo(w, s);
        c.close();
        c.fill();
      }
      c.begin();
      c.moveTo(w - s, 0);
      c.lineTo(w - s, s);
      c.lineTo(w, s);
      c.end();
      c.stroke();
    }
  };
  mxCellRenderer.registerShape("note", NoteShape);

  function CardShape() { mxns.mxActor.call(this); }
  mxUtils.extend(CardShape, mxns.mxActor);
  CardShape.prototype.size = 30;
  CardShape.prototype.isRoundable = function () { return true; };
  CardShape.prototype.redrawPath = function (c, x, y, w, h) {
    var s = Math.max(0, Math.min(w, Math.min(h, parseFloat(mxUtils.getValue(this.style, "size", this.size)))));
    var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2;
    this.addPoints(c, [new mxns.mxPoint(s, 0), new mxns.mxPoint(w, 0), new mxns.mxPoint(w, h), new mxns.mxPoint(0, h), new mxns.mxPoint(0, s)], this.isRounded, arcSize, true);
    c.end();
  };
  mxCellRenderer.registerShape("card", CardShape);

  function TapeShape() { mxns.mxActor.call(this); }
  mxUtils.extend(TapeShape, mxns.mxActor);
  TapeShape.prototype.size = 0.4;
  TapeShape.prototype.redrawPath = function (c, x, y, w, h) {
    var dy = h * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, "size", this.size))));
    var fy = 1.4;
    c.moveTo(0, dy / 2);
    c.quadTo(w / 4, dy * fy, w / 2, dy / 2);
    c.quadTo(w * 3 / 4, dy * (1 - fy), w, dy / 2);
    c.lineTo(w, h - dy / 2);
    c.quadTo(w * 3 / 4, h - dy * fy, w / 2, h - dy / 2);
    c.quadTo(w / 4, h - dy * (1 - fy), 0, h - dy / 2);
    c.lineTo(0, dy / 2);
    c.close();
    c.end();
  };
  TapeShape.prototype.getLabelBounds = function (rect) {
    if (mxUtils.getValue(this.style, "boundedLbl", false)) {
      var size = mxUtils.getValue(this.style, "size", this.size);
      var w = rect.width;
      var h = rect.height;
      if (this.direction == null || this.direction == mxConstants.DIRECTION_EAST || this.direction == mxConstants.DIRECTION_WEST) {
        var dy = h * size;
        return new mxns.mxRectangle(rect.x, rect.y + dy, w, h - 2 * dy);
      } else {
        var dx = w * size;
        return new mxns.mxRectangle(rect.x + dx, rect.y, w - 2 * dx, h);
      }
    }
    return rect;
  };
  mxCellRenderer.registerShape("tape", TapeShape);

  function DocumentShape() { mxns.mxActor.call(this); }
  mxUtils.extend(DocumentShape, mxns.mxActor);
  DocumentShape.prototype.size = 0.3;
  DocumentShape.prototype.getLabelMargins = function (rect) {
    if (mxUtils.getValue(this.style, "boundedLbl", false)) {
      return new mxns.mxRectangle(0, 0, 0, parseFloat(mxUtils.getValue(this.style, "size", this.size)) * rect.height);
    }
    return null;
  };
  DocumentShape.prototype.redrawPath = function (c, x, y, w, h) {
    var dy = h * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, "size", this.size))));
    var fy = 1.4;
    c.moveTo(0, 0);
    c.lineTo(w, 0);
    c.lineTo(w, h - dy / 2);
    c.quadTo(w * 3 / 4, h - dy * fy, w / 2, h - dy / 2);
    c.quadTo(w / 4, h - dy * (1 - fy), 0, h - dy / 2);
    c.lineTo(0, dy / 2);
    c.close();
    c.end();
  };
  mxCellRenderer.registerShape("document", DocumentShape);

  function ParallelogramShape() { mxns.mxActor.call(this); }
  mxUtils.extend(ParallelogramShape, mxns.mxActor);
  ParallelogramShape.prototype.size = 0.2;
  ParallelogramShape.prototype.fixedSize = 20;
  ParallelogramShape.prototype.isRoundable = function () { return true; };
  ParallelogramShape.prototype.redrawPath = function (c, x, y, w, h) {
    var fixed = mxUtils.getValue(this.style, "fixedSize", "0") != "0";
    var dx = fixed ? Math.max(0, Math.min(w, parseFloat(mxUtils.getValue(this.style, "size", this.fixedSize)))) : w * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, "size", this.size))));
    var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2;
    this.addPoints(c, [new mxns.mxPoint(0, h), new mxns.mxPoint(dx, 0), new mxns.mxPoint(w, 0), new mxns.mxPoint(w - dx, h)], this.isRounded, arcSize, true);
    c.end();
  };
  mxCellRenderer.registerShape("parallelogram", ParallelogramShape);

  function TrapezoidShape() { mxns.mxActor.call(this); }
  mxUtils.extend(TrapezoidShape, mxns.mxActor);
  TrapezoidShape.prototype.size = 0.2;
  TrapezoidShape.prototype.fixedSize = 20;
  TrapezoidShape.prototype.isRoundable = function () { return true; };
  TrapezoidShape.prototype.redrawPath = function (c, x, y, w, h) {
    var fixed = mxUtils.getValue(this.style, "fixedSize", "0") != "0";
    var dx = fixed ? Math.max(0, Math.min(w * 0.5, parseFloat(mxUtils.getValue(this.style, "size", this.fixedSize)))) : w * Math.max(0, Math.min(0.5, parseFloat(mxUtils.getValue(this.style, "size", this.size))));
    var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2;
    this.addPoints(c, [new mxns.mxPoint(0, h), new mxns.mxPoint(dx, 0), new mxns.mxPoint(w - dx, 0), new mxns.mxPoint(w, h)], this.isRounded, arcSize, true);
  };
  mxCellRenderer.registerShape("trapezoid", TrapezoidShape);

  function SingleArrowShape() { mxns.mxActor.call(this); }
  mxUtils.extend(SingleArrowShape, mxns.mxActor);
  SingleArrowShape.prototype.arrowWidth = 0.3;
  SingleArrowShape.prototype.arrowSize = 0.2;
  SingleArrowShape.prototype.redrawPath = function (c, x, y, w, h) {
    var aw = h * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, "arrowWidth", this.arrowWidth))));
    var as = w * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, "arrowSize", this.arrowSize))));
    var at = (h - aw) / 2;
    var ab = at + aw;
    var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2;
    this.addPoints(c, [new mxns.mxPoint(0, at), new mxns.mxPoint(w - as, at), new mxns.mxPoint(w - as, 0), new mxns.mxPoint(w, h / 2), new mxns.mxPoint(w - as, h), new mxns.mxPoint(w - as, ab), new mxns.mxPoint(0, ab)], this.isRounded, arcSize, true);
    c.end();
  };
  mxCellRenderer.registerShape("singleArrow", SingleArrowShape);

  function DoubleArrowShape() { mxns.mxActor.call(this); }
  mxUtils.extend(DoubleArrowShape, mxns.mxActor);
  DoubleArrowShape.prototype.redrawPath = function (c, x, y, w, h) {
    var aw = h * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, "arrowWidth", SingleArrowShape.prototype.arrowWidth))));
    var as = w * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, "arrowSize", SingleArrowShape.prototype.arrowSize))));
    var at = (h - aw) / 2;
    var ab = at + aw;
    var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2;
    this.addPoints(c, [new mxns.mxPoint(0, h / 2), new mxns.mxPoint(as, 0), new mxns.mxPoint(as, at), new mxns.mxPoint(w - as, at), new mxns.mxPoint(w - as, 0), new mxns.mxPoint(w, h / 2), new mxns.mxPoint(w - as, h), new mxns.mxPoint(w - as, ab), new mxns.mxPoint(as, ab), new mxns.mxPoint(as, h)], this.isRounded, arcSize, true);
    c.end();
  };
  mxCellRenderer.registerShape("doubleArrow", DoubleArrowShape);

  function DataStorageShape() { mxns.mxActor.call(this); }
  mxUtils.extend(DataStorageShape, mxns.mxActor);
  DataStorageShape.prototype.size = 0.1;
  DataStorageShape.prototype.fixedSize = 20;
  DataStorageShape.prototype.redrawPath = function (c, x, y, w, h) {
    var fixed = mxUtils.getValue(this.style, "fixedSize", "0") != "0";
    var s = fixed ? Math.max(0, Math.min(w, parseFloat(mxUtils.getValue(this.style, "size", this.fixedSize)))) : w * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, "size", this.size))));
    c.moveTo(s, 0);
    c.lineTo(w, 0);
    c.quadTo(w - s * 2, h / 2, w, h);
    c.lineTo(s, h);
    c.quadTo(s - s * 2, h / 2, s, 0);
    c.close();
    c.end();
  };
  mxCellRenderer.registerShape("dataStorage", DataStorageShape);

  function OrShape() { mxns.mxActor.call(this); }
  mxUtils.extend(OrShape, mxns.mxActor);
  OrShape.prototype.redrawPath = function (c, x, y, w, h) {
    c.moveTo(0, 0);
    c.quadTo(w, 0, w, h / 2);
    c.quadTo(w, h, 0, h);
    c.close();
    c.end();
  };
  mxCellRenderer.registerShape("or", OrShape);

  function XorShape() { mxns.mxActor.call(this); }
  mxUtils.extend(XorShape, mxns.mxActor);
  XorShape.prototype.redrawPath = function (c, x, y, w, h) {
    c.moveTo(0, 0);
    c.quadTo(w, 0, w, h / 2);
    c.quadTo(w, h, 0, h);
    c.quadTo(w / 2, h / 2, 0, 0);
    c.close();
    c.end();
  };
  mxCellRenderer.registerShape("xor", XorShape);

  function LoopLimitShape() { mxns.mxActor.call(this); }
  mxUtils.extend(LoopLimitShape, mxns.mxActor);
  LoopLimitShape.prototype.size = 20;
  LoopLimitShape.prototype.isRoundable = function () { return true; };
  LoopLimitShape.prototype.redrawPath = function (c, x, y, w, h) {
    var s = Math.min(w / 2, Math.min(h, parseFloat(mxUtils.getValue(this.style, "size", this.size))));
    var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2;
    this.addPoints(c, [new mxns.mxPoint(s, 0), new mxns.mxPoint(w - s, 0), new mxns.mxPoint(w, s * 0.8), new mxns.mxPoint(w, h), new mxns.mxPoint(0, h), new mxns.mxPoint(0, s * 0.8)], this.isRounded, arcSize, true);
    c.end();
  };
  mxCellRenderer.registerShape("loopLimit", LoopLimitShape);

  function OffPageConnectorShape() { mxns.mxActor.call(this); }
  mxUtils.extend(OffPageConnectorShape, mxns.mxActor);
  OffPageConnectorShape.prototype.size = 3 / 8;
  OffPageConnectorShape.prototype.isRoundable = function () { return true; };
  OffPageConnectorShape.prototype.redrawPath = function (c, x, y, w, h) {
    var s = h * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, "size", this.size))));
    var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2;
    this.addPoints(c, [new mxns.mxPoint(0, 0), new mxns.mxPoint(w, 0), new mxns.mxPoint(w, h - s), new mxns.mxPoint(w / 2, h), new mxns.mxPoint(0, h - s)], this.isRounded, arcSize, true);
    c.end();
  };
  mxCellRenderer.registerShape("offPageConnector", OffPageConnectorShape);

  function TapeDataShape() { mxns.mxEllipse.call(this); }
  mxUtils.extend(TapeDataShape, mxns.mxEllipse);
  TapeDataShape.prototype.paintVertexShape = function (c, x, y, w, h) {
    mxns.mxEllipse.prototype.paintVertexShape.apply(this, arguments);
    c.begin();
    c.moveTo(x + w / 2, y + h);
    c.lineTo(x + w, y + h);
    c.end();
    c.stroke();
  };
  mxCellRenderer.registerShape("tapeData", TapeDataShape);

  function OrEllipseShape() { mxns.mxEllipse.call(this); }
  mxUtils.extend(OrEllipseShape, mxns.mxEllipse);
  OrEllipseShape.prototype.paintVertexShape = function (c, x, y, w, h) {
    mxns.mxEllipse.prototype.paintVertexShape.apply(this, arguments);
    c.setShadow(false);
    c.begin();
    c.moveTo(x, y + h / 2);
    c.lineTo(x + w, y + h / 2);
    c.end();
    c.stroke();
    c.begin();
    c.moveTo(x + w / 2, y);
    c.lineTo(x + w / 2, y + h);
    c.end();
    c.stroke();
  };
  mxCellRenderer.registerShape("orEllipse", OrEllipseShape);

  function SumEllipseShape() { mxns.mxEllipse.call(this); }
  mxUtils.extend(SumEllipseShape, mxns.mxEllipse);
  SumEllipseShape.prototype.paintVertexShape = function (c, x, y, w, h) {
    mxns.mxEllipse.prototype.paintVertexShape.apply(this, arguments);
    var s2 = 0.145;
    c.setShadow(false);
    c.begin();
    c.moveTo(x + w * s2, y + h * s2);
    c.lineTo(x + w * (1 - s2), y + h * (1 - s2));
    c.end();
    c.stroke();
    c.begin();
    c.moveTo(x + w * (1 - s2), y + h * s2);
    c.lineTo(x + w * s2, y + h * (1 - s2));
    c.end();
    c.stroke();
  };
  mxCellRenderer.registerShape("sumEllipse", SumEllipseShape);

  function SortShape() { mxns.mxRhombus.call(this); }
  mxUtils.extend(SortShape, mxns.mxRhombus);
  SortShape.prototype.paintVertexShape = function (c, x, y, w, h) {
    mxns.mxRhombus.prototype.paintVertexShape.apply(this, arguments);
    c.setShadow(false);
    c.begin();
    c.moveTo(x, y + h / 2);
    c.lineTo(x + w, y + h / 2);
    c.end();
    c.stroke();
  };
  mxCellRenderer.registerShape("sortShape", SortShape);

  function CollateShape() { mxns.mxEllipse.call(this); }
  mxUtils.extend(CollateShape, mxns.mxEllipse);
  CollateShape.prototype.paintVertexShape = function (c, x, y, w, h) {
    c.begin();
    c.moveTo(x, y);
    c.lineTo(x + w, y);
    c.lineTo(x + w / 2, y + h / 2);
    c.close();
    c.fillAndStroke();
    c.begin();
    c.moveTo(x, y + h);
    c.lineTo(x + w, y + h);
    c.lineTo(x + w / 2, y + h / 2);
    c.close();
    c.fillAndStroke();
  };
  mxCellRenderer.registerShape("collate", CollateShape);

  function LineEllipseShape() { mxns.mxEllipse.call(this); }
  mxUtils.extend(LineEllipseShape, mxns.mxEllipse);
  LineEllipseShape.prototype.paintVertexShape = function (c, x, y, w, h) {
    mxns.mxEllipse.prototype.paintVertexShape.apply(this, arguments);
    c.setShadow(false);
    c.begin();
    if (mxUtils.getValue(this.style, "line") == "vertical") {
      c.moveTo(x + w / 2, y);
      c.lineTo(x + w / 2, y + h);
    } else {
      c.moveTo(x, y + h / 2);
      c.lineTo(x + w, y + h / 2);
    }
    c.end();
    c.stroke();
  };
  mxCellRenderer.registerShape("lineEllipse", LineEllipseShape);

  function DelayShape() { mxns.mxActor.call(this); }
  mxUtils.extend(DelayShape, mxns.mxActor);
  DelayShape.prototype.redrawPath = function (c, x, y, w, h) {
    var dx = Math.min(w, h / 2);
    c.moveTo(0, 0);
    c.lineTo(w - dx, 0);
    c.quadTo(w, 0, w, h / 2);
    c.quadTo(w, h, w - dx, h);
    c.lineTo(0, h);
    c.close();
    c.end();
  };
  mxCellRenderer.registerShape("delay", DelayShape);

  function DisplayShape() { mxns.mxActor.call(this); }
  mxUtils.extend(DisplayShape, mxns.mxActor);
  DisplayShape.prototype.size = 0.25;
  DisplayShape.prototype.redrawPath = function (c, x, y, w, h) {
    var dx = Math.min(w, h / 2);
    var s = Math.min(w - dx, Math.max(0, parseFloat(mxUtils.getValue(this.style, "size", this.size))) * w);
    c.moveTo(0, h / 2);
    c.lineTo(s, 0);
    c.lineTo(w - dx, 0);
    c.quadTo(w, 0, w, h / 2);
    c.quadTo(w, h, w - dx, h);
    c.lineTo(s, h);
    c.close();
    c.end();
  };
  mxCellRenderer.registerShape("display", DisplayShape);

  function UmlActorShape() { mxns.mxShape.call(this); }
  mxUtils.extend(UmlActorShape, mxns.mxShape);
  UmlActorShape.prototype.paintBackground = function (c, x, y, w, h) {
    c.translate(x, y);
    c.ellipse(w / 4, 0, w / 2, h / 4);
    c.fillAndStroke();
    c.begin();
    c.moveTo(w / 2, h / 4);
    c.lineTo(w / 2, (2 * h) / 3);
    c.moveTo(w / 2, h / 3);
    c.lineTo(0, h / 3);
    c.moveTo(w / 2, h / 3);
    c.lineTo(w, h / 3);
    c.moveTo(w / 2, (2 * h) / 3);
    c.lineTo(0, h);
    c.moveTo(w / 2, (2 * h) / 3);
    c.lineTo(w, h);
    c.end();
    c.stroke();
  };
  mxCellRenderer.registerShape("umlActor", UmlActorShape);

  mxns.mxPerimeter.CalloutPerimeter = function (bounds, vertex, next, orthogonal) {
    return mxns.mxPerimeter.RectanglePerimeter(mxUtils.getDirectedBounds(bounds, new mxns.mxRectangle(0, 0, 0, Math.max(0, Math.min(bounds.height, parseFloat(mxUtils.getValue(vertex.style, "size", 30) * vertex.view.scale)))), vertex.style), vertex, next, orthogonal);
  };
  mxns.mxStyleRegistry.putValue("calloutPerimeter", mxns.mxPerimeter.CalloutPerimeter);

  mxns.mxPerimeter.ParallelogramPerimeter = function (bounds, vertex, next, orthogonal) {
    var fixed = mxUtils.getValue(vertex.style, "fixedSize", "0") != "0";
    var size = fixed ? 20 : 0.2;
    if (vertex != null) size = mxUtils.getValue(vertex.style, "size", size);
    if (fixed) size *= vertex.view.scale;
    var x = bounds.x, y = bounds.y, w = bounds.width, h = bounds.height;
    var direction = vertex != null ? mxUtils.getValue(vertex.style, mxConstants.STYLE_DIRECTION, mxConstants.DIRECTION_EAST) : mxConstants.DIRECTION_EAST;
    var vertical = direction == mxConstants.DIRECTION_NORTH || direction == mxConstants.DIRECTION_SOUTH;
    var points;
    if (vertical) {
      var dy = fixed ? Math.max(0, Math.min(h, size)) : h * Math.max(0, Math.min(1, size));
      points = [new mxns.mxPoint(x, y), new mxns.mxPoint(x + w, y + dy), new mxns.mxPoint(x + w, y + h), new mxns.mxPoint(x, y + h - dy), new mxns.mxPoint(x, y)];
    } else {
      var dx = fixed ? Math.max(0, Math.min(w * 0.5, size)) : w * Math.max(0, Math.min(1, size));
      points = [new mxns.mxPoint(x + dx, y), new mxns.mxPoint(x + w, y), new mxns.mxPoint(x + w - dx, y + h), new mxns.mxPoint(x, y + h), new mxns.mxPoint(x + dx, y)];
    }
    var cx = bounds.getCenterX();
    var cy = bounds.getCenterY();
    var p1 = new mxns.mxPoint(cx, cy);
    if (orthogonal) { if (next.x < x || next.x > x + w) { p1.y = next.y; } else { p1.x = next.x; } }
    return mxUtils.getPerimeterPoint(points, p1, next);
  };
  mxns.mxStyleRegistry.putValue("parallelogramPerimeter", mxns.mxPerimeter.ParallelogramPerimeter);

  mxns.mxPerimeter.TrapezoidPerimeter = function (bounds, vertex, next, orthogonal) {
    var fixed = mxUtils.getValue(vertex.style, "fixedSize", "0") != "0";
    var size = fixed ? 20 : 0.2;
    if (vertex != null) size = mxUtils.getValue(vertex.style, "size", size);
    if (fixed) size *= vertex.view.scale;
    var x = bounds.x, y = bounds.y, w = bounds.width, h = bounds.height;
    var direction = vertex != null ? mxUtils.getValue(vertex.style, mxConstants.STYLE_DIRECTION, mxConstants.DIRECTION_EAST) : mxConstants.DIRECTION_EAST;
    var points = [];
    if (direction == mxConstants.DIRECTION_EAST) {
      var dx = fixed ? Math.max(0, Math.min(w * 0.5, size)) : w * Math.max(0, Math.min(1, size));
      points = [new mxns.mxPoint(x + dx, y), new mxns.mxPoint(x + w - dx, y), new mxns.mxPoint(x + w, y + h), new mxns.mxPoint(x, y + h), new mxns.mxPoint(x + dx, y)];
    } else if (direction == mxConstants.DIRECTION_WEST) {
      var dx = fixed ? Math.max(0, Math.min(w, size)) : w * Math.max(0, Math.min(1, size));
      points = [new mxns.mxPoint(x, y), new mxns.mxPoint(x + w, y), new mxns.mxPoint(x + w - dx, y + h), new mxns.mxPoint(x + dx, y + h), new mxns.mxPoint(x, y)];
    } else if (direction == mxConstants.DIRECTION_NORTH) {
      var dy = fixed ? Math.max(0, Math.min(h, size)) : h * Math.max(0, Math.min(1, size));
      points = [new mxns.mxPoint(x, y + dy), new mxns.mxPoint(x + w, y), new mxns.mxPoint(x + w, y + h), new mxns.mxPoint(x, y + h - dy), new mxns.mxPoint(x, y + dy)];
    } else {
      var dy = fixed ? Math.max(0, Math.min(h, size)) : h * Math.max(0, Math.min(1, size));
      points = [new mxns.mxPoint(x, y), new mxns.mxPoint(x + w, y + dy), new mxns.mxPoint(x + w, y + h - dy), new mxns.mxPoint(x, y + h), new mxns.mxPoint(x, y)];
    }
    var cx = bounds.getCenterX();
    var cy = bounds.getCenterY();
    var p1 = new mxns.mxPoint(cx, cy);
    if (orthogonal) { if (next.x < x || next.x > x + w) { p1.y = next.y; } else { p1.x = next.x; } }
    return mxUtils.getPerimeterPoint(points, p1, next);
  };
  mxns.mxStyleRegistry.putValue("trapezoidPerimeter", mxns.mxPerimeter.TrapezoidPerimeter);

  mxns.mxPerimeter.StepPerimeter = function (bounds, vertex, next, orthogonal) {
    var fixed = mxUtils.getValue(vertex.style, "fixedSize", "0") != "0";
    var size = fixed ? 20 : 0.2;
    if (vertex != null) size = mxUtils.getValue(vertex.style, "size", size);
    if (fixed) size *= vertex.view.scale;
    var x = bounds.x, y = bounds.y, w = bounds.width, h = bounds.height;
    var cx = bounds.getCenterX();
    var cy = bounds.getCenterY();
    var direction = vertex != null ? mxUtils.getValue(vertex.style, mxConstants.STYLE_DIRECTION, mxConstants.DIRECTION_EAST) : mxConstants.DIRECTION_EAST;
    var points;
    if (direction == mxConstants.DIRECTION_EAST) {
      var dx = fixed ? Math.max(0, Math.min(w, size)) : w * Math.max(0, Math.min(1, size));
      points = [new mxns.mxPoint(x, y), new mxns.mxPoint(x + w - dx, y), new mxns.mxPoint(x + w, cy), new mxns.mxPoint(x + w - dx, y + h), new mxns.mxPoint(x, y + h), new mxns.mxPoint(x + dx, cy), new mxns.mxPoint(x, y)];
    } else if (direction == mxConstants.DIRECTION_WEST) {
      var dx = fixed ? Math.max(0, Math.min(w, size)) : w * Math.max(0, Math.min(1, size));
      points = [new mxns.mxPoint(x + dx, y), new mxns.mxPoint(x + w, y), new mxns.mxPoint(x + w - dx, cy), new mxns.mxPoint(x + w, y + h), new mxns.mxPoint(x + dx, y + h), new mxns.mxPoint(x, cy), new mxns.mxPoint(x + dx, y)];
    } else if (direction == mxConstants.DIRECTION_NORTH) {
      var dy = fixed ? Math.max(0, Math.min(h, size)) : h * Math.max(0, Math.min(1, size));
      points = [new mxns.mxPoint(x, y + dy), new mxns.mxPoint(cx, y), new mxns.mxPoint(x + w, y + dy), new mxns.mxPoint(x + w, y + h), new mxns.mxPoint(cx, y + h - dy), new mxns.mxPoint(x, y + h), new mxns.mxPoint(x, y + dy)];
    } else {
      var dy = fixed ? Math.max(0, Math.min(h, size)) : h * Math.max(0, Math.min(1, size));
      points = [new mxns.mxPoint(x, y), new mxns.mxPoint(cx, y + dy), new mxns.mxPoint(x + w, y), new mxns.mxPoint(x + w, y + h - dy), new mxns.mxPoint(cx, y + h), new mxns.mxPoint(x, y + h - dy), new mxns.mxPoint(x, y)];
    }
    var p1 = new mxns.mxPoint(cx, cy);
    if (orthogonal) { if (next.x < x || next.x > x + w) { p1.y = next.y; } else { p1.x = next.x; } }
    return mxUtils.getPerimeterPoint(points, p1, next);
  };
  mxns.mxStyleRegistry.putValue("stepPerimeter", mxns.mxPerimeter.StepPerimeter);

  mxns.mxPerimeter.HexagonPerimeter2 = function (bounds, vertex, next, orthogonal) {
    var fixed = mxUtils.getValue(vertex.style, "fixedSize", "0") != "0";
    var size = fixed ? 20 : 0.25;
    if (vertex != null) size = mxUtils.getValue(vertex.style, "size", size);
    if (fixed) size *= vertex.view.scale;
    var x = bounds.x, y = bounds.y, w = bounds.width, h = bounds.height;
    var cx = bounds.getCenterX();
    var cy = bounds.getCenterY();
    var direction = vertex != null ? mxUtils.getValue(vertex.style, mxConstants.STYLE_DIRECTION, mxConstants.DIRECTION_EAST) : mxConstants.DIRECTION_EAST;
    var vertical = direction == mxConstants.DIRECTION_NORTH || direction == mxConstants.DIRECTION_SOUTH;
    var points;
    if (vertical) {
      var dy = fixed ? Math.max(0, Math.min(h, size)) : h * Math.max(0, Math.min(1, size));
      points = [new mxns.mxPoint(cx, y), new mxns.mxPoint(x + w, y + dy), new mxns.mxPoint(x + w, y + h - dy), new mxns.mxPoint(cx, y + h), new mxns.mxPoint(x, y + h - dy), new mxns.mxPoint(x, y + dy), new mxns.mxPoint(cx, y)];
    } else {
      var dx = fixed ? Math.max(0, Math.min(w, size)) : w * Math.max(0, Math.min(1, size));
      points = [new mxns.mxPoint(x + dx, y), new mxns.mxPoint(x + w - dx, y), new mxns.mxPoint(x + w, cy), new mxns.mxPoint(x + w - dx, y + h), new mxns.mxPoint(x + dx, y + h), new mxns.mxPoint(x, cy), new mxns.mxPoint(x + dx, y)];
    }
    var p1 = new mxns.mxPoint(cx, cy);
    if (orthogonal) { if (next.x < x || next.x > x + w) { p1.y = next.y; } else { p1.x = next.x; } }
    return mxUtils.getPerimeterPoint(points, p1, next);
  };
  mxns.mxStyleRegistry.putValue("hexagonPerimeter2", mxns.mxPerimeter.HexagonPerimeter2);
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
