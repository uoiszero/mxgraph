<template>
  <div
    ref="container"
    :style="containerStyle"></div>
</template>

<script>
import { onMounted, onBeforeUnmount, ref, computed, provide } from "vue";
import { ensureMxClient } from "./utils";

export default {
  name: "MxGraphCanvas",
  props: {
    autoLoad: { type: Boolean, default: true },
    mxClientUrl: { type: String, default: "" },
    mxBasePath: { type: String, default: "" },
    mxImageBasePath: { type: String, default: "" },
    width: { type: [Number, String], default: "100%" },
    height: { type: [Number, String], default: 480 },
    initSample: { type: Boolean, default: true },
  },
  emits: ["ready"],
  setup(props, { emit, expose }) {
    const container = ref(null);
    const graphRef = ref(null);
    let graph = null;
    let rubberband = null;
    let undoManager = null;
    let keyHandler = null;

    const containerStyle = computed(() => ({
      width: typeof props.width === "number" ? props.width + "px" : props.width,
      height:
        typeof props.height === "number" ? props.height + "px" : props.height,
      border: "1px dashed #cbd5e1",
    }));

    /**
     * initGraph
     * 初始化 mxGraph 并启用常用交互与撤销管理
     */
    function initGraph() {
      if (!window.mxClient) throw new Error("mxClient 未加载");
      if (!mxClient.isBrowserSupported()) {
        mxUtils.error("当前浏览器不支持 mxGraph", 200, false);
        return;
      }
      const el = container.value;
      el.innerHTML = "";
      graph = new mxGraph(el);
      rubberband = new mxRubberband(graph);
      new mxCellTracker(graph);
      graph.setPanning(true);
      graph.panningHandler.useLeftButtonForPanning = false;
      graph.setConnectable(true);
      graph.setTooltips(true);
      graph.setCellsResizable(true);

      setupUndoManager(graph);
      createKeyHandler(graph);
      enableRotationInteractions();

      if (props.initSample) {
        const parent = graph.getDefaultParent();
        graph.getModel().beginUpdate();
        try {
          const v1 = graph.insertVertex(parent, null, "Hello", 40, 40, 80, 30);
          const v2 = graph.insertVertex(
            parent,
            null,
            "mxGraph",
            200,
            150,
            100,
            40
          );
          graph.insertEdge(parent, null, "Edge", v1, v2);
        } finally {
          graph.getModel().endUpdate();
        }
      }
      graphRef.value = graph;
      createEdgePopupMenu(graph);
      enableVirtualHandlesForEdges();
      emit("ready", graph);
    }

    /**
     * getGraph
     * 返回 mxGraph 实例
     */
    function getGraph() {
      return graphRef.value;
    }

    /**
     * deleteSelection
     * 删除当前选中的图形；支持清理由侧栏创建的隐形端点
     */
    function deleteSelection(evt) {
      if (!graph) return;
      try {
        if (evt) mxEvent.consume(evt);
      } catch (e) {}
      if (graph.isEditing()) return;
      const model = graph.getModel();
      const selected = graph.getSelectionCells();
      if (!selected || selected.length === 0) return;
      const toRemove = selected.slice();
      for (let i = 0; i < selected.length; i++) {
        const c = selected[i];
        if (model.isEdge(c)) {
          const s = model.getTerminal(c, true);
          const t = model.getTerminal(c, false);
          const terms = [s, t];
          for (let j = 0; j < terms.length; j++) {
            const term = terms[j];
            if (!term) continue;
            const style = model.getStyle(term) || "";
            const isInvisiblePoint =
              style.indexOf("shape=point") !== -1 &&
              style.indexOf("fillColor=none") !== -1 &&
              style.indexOf("strokeColor=none") !== -1;
            if (isInvisiblePoint) {
              const deg = model.getEdgeCount(term);
              const hasChildren = model.getChildCount(term) > 0;
              if (deg <= 1 && !hasChildren) toRemove.push(term);
            }
          }
        }
      }
      const topmost = model.getTopmostCells(toRemove);
      model.beginUpdate();
      try {
        graph.removeCells(topmost, true);
      } finally {
        model.endUpdate();
      }
    }

    /**
     * setupUndoManager
     * 创建并连接撤销管理器到模型与视图事件
     */
    function setupUndoManager(graph) {
      undoManager = new mxUndoManager();
      const listener = function (sender, evt) {
        undoManager.undoableEditHappened(evt.getProperty("edit"));
      };
      graph.getModel().addListener(mxEvent.UNDO, listener);
      graph.getView().addListener(mxEvent.UNDO, listener);

      const syncSelection = function (sender, evt) {
        const changes = evt.getProperty("edit").changes || [];
        const cand = graph.getSelectionCellsForChanges(
          changes,
          function (change) {
            return !(change instanceof mxChildChange);
          }
        );
        if (cand.length > 0) {
          const cells = [];
          for (let i = 0; i < cand.length; i++) {
            if (graph.view.getState(cand[i]) != null) cells.push(cand[i]);
          }
          graph.setSelectionCells(cells);
        }
      };
      undoManager.addListener(mxEvent.UNDO, syncSelection);
      undoManager.addListener(mxEvent.REDO, syncSelection);

      graph.undoManager = undoManager;
    }

    /**
     * undo
     * 执行撤销（编辑文本时优先使用原生撤销）
     */
    function undo() {
      if (!graph || !undoManager) return;
      try {
        if (
          graph.isEditing() &&
          graph.cellEditor &&
          graph.cellEditor.textarea
        ) {
          const before = graph.cellEditor.textarea.innerHTML;
          document.execCommand("undo", false, null);
          if (before === graph.cellEditor.textarea.innerHTML) {
            graph.stopEditing(true);
            undoManager.undo();
          }
        } else {
          undoManager.undo();
        }
      } catch (e) {}
    }

    /**
     * redo
     * 执行重做（编辑文本时优先使用原生重做）
     */
    function redo() {
      if (!graph || !undoManager) return;
      try {
        if (graph.isEditing()) {
          document.execCommand("redo", false, null);
        } else {
          undoManager.redo();
        }
      } catch (e) {}
    }

    /**
     * createKeyHandler
     * 绑定撤销/重做快捷键（Mac 支持 Cmd）
     */
    function createKeyHandler(graph) {
      keyHandler = new mxKeyHandler(graph);
      keyHandler.isControlDown = function (evt) {
        return mxEvent.isControlDown(evt) || (mxClient.IS_MAC && evt.metaKey);
      };
      const bind = function (code, control, fn, shift) {
        const f = function (evt) {
          fn(evt);
        };
        if (control) {
          if (shift) keyHandler.bindControlShiftKey(code, f);
          else keyHandler.bindControlKey(code, f);
        } else {
          if (shift) keyHandler.bindShiftKey(code, f);
          else keyHandler.bindKey(code, f);
        }
      };
      bind(90, true, undo); // Ctrl/Cmd+Z
      if (!mxClient.IS_WIN) bind(90, true, redo, true); // Ctrl/Cmd+Shift+Z
      else bind(89, true, redo); // Ctrl+Y on Windows
      bind(46, false, deleteSelection); // Delete
      bind(8, false, deleteSelection); // Backspace

      graph.undo = undo;
      graph.redo = redo;
      graph.deleteSelection = deleteSelection;
    }

    /**
     * createEdgePopupMenu
     * 为边添加右键菜单：插入一个拐点（控制点）到最近的线段
     */
    function createEdgePopupMenu(graph) {
      graph.popupMenuHandler.factoryMethod = function (menu, cell, evt) {
        // 命中容错：若 cell 为空，尝试用触发坐标进行命中
        if (!cell) {
          const x = graph.popupMenuHandler.triggerX;
          const y = graph.popupMenuHandler.triggerY;
          const hit = graph.getCellAt(x, y);
          if (hit) cell = hit;
        }
        let state = cell && graph.view.getState(cell);
        let style = state && state.style;
        let isEdge = !!cell && graph.getModel().isEdge(cell);
        // 若命中的是端点（隐形 point 顶点），则取其连接的边
        if (!isEdge && cell && graph.getModel().isVertex(cell)) {
          const s0 = graph.getModel().getStyle(cell) || "";
          const looksPoint =
            s0.indexOf("shape=point") !== -1 ||
            (s0.indexOf("fillColor=none") !== -1 &&
              s0.indexOf("strokeColor=none") !== -1);
          if (looksPoint) {
            const edges = graph.getModel().getConnections(cell) || [];
            if (edges.length > 0) {
              cell = edges[0];
              state = graph.view.getState(cell);
              style = state && state.style;
              isEdge = true;
            }
          }
        }
        // 若仍未命中边，则尝试用当前选中的单条边
        if (!isEdge) {
          const sel = graph
            .getSelectionCells()
            .filter(c => graph.getModel().isEdge(c));
          if (sel.length === 1) {
            cell = sel[0];
            state = graph.view.getState(cell);
            style = state && state.style;
            isEdge = true;
          }
        }
        const isArrowShape =
          style &&
          mxUtils.getValue(style, mxConstants.STYLE_SHAPE, null) === "arrow";
        if (!isEdge || isArrowShape) return;

        const t = graph.view.translate;
        const s = graph.view.scale;
        let dx = t.x;
        let dy = t.y;
        let parent = graph.getModel().getParent(cell);
        let pgeo = graph.getCellGeometry(parent);
        while (graph.getModel().isVertex(parent) && pgeo != null) {
          dx += pgeo.x;
          dy += pgeo.y;
          parent = graph.getModel().getParent(parent);
          pgeo = graph.getCellGeometry(parent);
        }
        const x = Math.round(
          graph.snap(graph.popupMenuHandler.triggerX / s - dx)
        );
        const y = Math.round(
          graph.snap(graph.popupMenuHandler.triggerY / s - dy)
        );

        const geo0 = graph.getCellGeometry(cell);
        if (!geo0) return;
        const geo = geo0.clone();
        const offset = new mxPoint(t.x * s, t.y * s);
        const pState = graph.view.getState(graph.getModel().getParent(cell));
        const off = pState ? new mxPoint(pState.x, pState.y) : offset;
        const worldX = x * s + off.x;
        const worldY = y * s + off.y;

        let hitIndex = -1;
        if (geo.points && geo.points.length > 0) {
          const th = (mxConstants.HANDLE_SIZE || 4) + 3;
          const tol2 = th * th;
          for (let i = 0; i < geo.points.length; i++) {
            const p = geo.points[i];
            const pwx = p.x * s + off.x;
            const pwy = p.y * s + off.y;
            const dxw = pwx - worldX;
            const dyw = pwy - worldY;
            const d2 = dxw * dxw + dyw * dyw;
            if (d2 <= tol2) {
              hitIndex = i;
              break;
            }
          }
        }

        if (hitIndex >= 0) {
          menu.addItem("删除拐点", null, function () {
            const points = (geo.points || []).slice();
            points.splice(hitIndex, 1);
            const newGeo = geo.clone();
            newGeo.points = points.length > 0 ? points : null;
            graph.getModel().beginUpdate();
            try {
              graph.getModel().setGeometry(cell, newGeo);
            } finally {
              graph.getModel().endUpdate();
            }
          });
        } else {
          menu.addItem("添加拐点", null, function () {
            const idx = mxUtils.findNearestSegment(state, worldX, worldY);
            const pt = new mxPoint(x, y);
            const newGeo = geo.clone();
            if (!newGeo.points || newGeo.points.length === 0)
              newGeo.points = [pt];
            else newGeo.points.splice(idx, 0, pt);
            graph.getModel().beginUpdate();
            try {
              graph.getModel().setGeometry(cell, newGeo);
            } finally {
              graph.getModel().endUpdate();
            }
          });
        }
      };
    }

    /**
     * enableRotationInteractions
     * 启用顶点旋转把手、实时预览，并支持单击旋转把手使选中图形顺时针旋转 90°
     */
    function enableRotationInteractions() {
      // 允许显示旋转把手与动态预览，参考 grapheditor 配置
      mxVertexHandler.prototype.rotationEnabled = true;
      mxVertexHandler.prototype.manageSizers = true;
      mxVertexHandler.prototype.livePreview = true;

      // 自定义旋转把手的鼠标指针为“旋转”图标（使用内联 SVG 作为自定义 cursor）
      try {
        const svg =
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#fca000" d="M15.55 5.55L11 1v3.07C7.06 4.56 4 7.92 4 12s3.05 7.44 7 7.93v-2.02c-2.84-.48-5-2.94-5-5.91s2.16-5.43 5-5.91V10l4.55-4.45zM19.93 11c-.17-1.39-.72-2.73-1.62-3.89l-1.42 1.42c.54.75.88 1.6 1.02 2.47h2.02zM13 17.9v2.02c1.39-.17 2.74-.71 3.9-1.61l-1.44-1.44c-.75.54-1.59.89-2.46 1.03zm3.89-2.42l1.42 1.41c.9-1.16 1.45-2.5 1.62-3.89h-2.02c-.14.87-.48 1.72-1.02 2.48z"/></svg>';
        const url = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
        // Hotspot 设置为图标居中（12,12）；尾备选为 crosshair
        mxVertexHandler.prototype.rotationCursor = `url(${url}) 12 12, crosshair`;
      } catch (e) {
        mxVertexHandler.prototype.rotationCursor = "crosshair";
      }

      // 覆盖单击旋转把手的行为：顺时针旋转 90°
      const origRotateClick = mxVertexHandler.prototype.rotateClick;
      mxVertexHandler.prototype.rotateClick = function () {
        try {
          const current = Number(
            mxUtils.getValue(this.state.style, mxConstants.STYLE_ROTATION, 0)
          );
          const next = (current + 90) % 360;
          this.state.view.graph.setCellStyles(
            mxConstants.STYLE_ROTATION,
            next,
            [this.state.cell]
          );
        } catch (e) {}
        if (typeof origRotateClick === "function") {
          try {
            origRotateClick.apply(this, arguments);
          } catch (e) {}
        }
      };
    }

    /**
     * enableVirtualHandlesForEdges
     * 启用边的虚拟手柄（位于相邻拐点中点），点击虚拟手柄直接添加一个拐点
     */
    function enableVirtualHandlesForEdges() {
      // 全局启用虚拟手柄
      mxEdgeHandler.prototype.virtualBendsEnabled = true;

      // 单击虚拟手柄时直接在对应线段插入一个拐点
      const origMouseUp = mxEdgeHandler.prototype.mouseUp;
      mxEdgeHandler.prototype.mouseUp = function (sender, me) {
        if (this.index != null && this.index <= mxEvent.VIRTUAL_HANDLE) {
          const samePos =
            me.getX() === this.startX && me.getY() === this.startY;
          if (samePos) {
            const edge = this.state.cell;
            const pt = this.getPointForEvent(me);
            const geo = this.graph.getCellGeometry(edge);
            let points = geo && geo.points ? geo.points.slice() : [];
            this.convertPoint(pt, false);
            if (!points || points.length === 0) {
              points = [pt];
            } else {
              points.splice(mxEvent.VIRTUAL_HANDLE - this.index, 0, pt);
            }
            this.changePoints(edge, points, false);
            this.reset();
            me.consume();
            return;
          }
        }
        return origMouseUp.apply(this, arguments);
      };
    }

    // 在 setup 同步阶段提供注入，避免运行时调用 provide 产生警告
    provide("getGraph", () => graphRef.value);
    provide("mxGraph", graphRef);
    if (typeof window !== "undefined") {
      window.__lastGraphRef = () => graphRef.value;
    }

    onMounted(async () => {
      if (props.autoLoad) {
        await ensureMxClient({
          mxClientUrl: props.mxClientUrl,
          mxBasePath: props.mxBasePath,
          mxImageBasePath: props.mxImageBasePath,
        });
      }
      initGraph();
    });

    onBeforeUnmount(() => {
      rubberband = null;
      graph = null;
      undoManager = null;
      keyHandler = null;
    });

    /**
     * rotate90
     * 将当前选中的顶点顺时针旋转 90°
     */
    function rotate90() {
      const graph = graphRef.value;
      if (!graph) return;
      const cells = (graph.getSelectionCells() || []).filter(c =>
        graph.getModel().isVertex(c)
      );
      if (!cells.length) return;
      const style = graph.getCellStyle(cells[0]);
      const current = Number(
        mxUtils.getValue(style, mxConstants.STYLE_ROTATION, 0)
      );
      const next = (current + 90) % 360;
      graph.setCellStyles(mxConstants.STYLE_ROTATION, next, cells);
    }

    /**
     * setRotation
     * 将当前选中的顶点旋转到指定角度（0-360）
     * @param angle 目标角度
     */
    function setRotation(angle) {
      const graph = graphRef.value;
      if (!graph) return;
      const cells = (graph.getSelectionCells() || []).filter(c =>
        graph.getModel().isVertex(c)
      );
      if (!cells.length) return;
      const a = Number(angle);
      if (Number.isNaN(a)) return;
      const norm = ((a % 360) + 360) % 360;
      graph.setCellStyles(mxConstants.STYLE_ROTATION, norm, cells);
    }

    expose({ getGraph, undo, redo, deleteSelection, rotate90, setRotation });
    return { container, containerStyle };
  },
};
</script>
