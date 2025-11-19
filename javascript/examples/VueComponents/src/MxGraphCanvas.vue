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
     * 初始化 mxGraph 图形实例并启用常用交互
     */
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
        const f = function () {
          fn();
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

      graph.undo = undo;
      graph.redo = redo;
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

    expose({ getGraph, undo, redo });
    return { container, containerStyle };
  },
};
</script>
