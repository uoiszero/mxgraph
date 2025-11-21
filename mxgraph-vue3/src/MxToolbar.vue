<template>
  <div class="toolbar">
    <button @click="newGraph">新建</button>
    <button @click="triggerOpen">打开</button>
    <button @click="saveGraph">保存</button>
    <span class="sep"></span>
    <button @click="undo">撤销</button>
    <button @click="redo">重做</button>
    <button @click="deleteSelected">删除</button>
    <span class="sep"></span>
    <button @click="zoomIn">放大</button>
    <button @click="zoomOut">缩小</button>
    <button @click="fit">适配</button>
    <button @click="actualSize">原始比例</button>
    <input
      ref="fileInput"
      type="file"
      accept="application/json"
      style="display: none"
      @change="onFileChange" />
  </div>
</template>

<script>
import { ref, inject, watch } from "vue";

export default {
  name: "MxToolbar",
  props: {
    mxGraph: { type: Object, default: null },
    mx: { type: Object, default: null }
  },
  setup(props) {
    const injectedGetter = inject("getGraph", null);
    const injectedGraphRef = inject("mxGraph", null);
    const injectedMx = inject("mx", null);
    const mxLocal = ref(injectedMx ?? props.mx ?? null);
    watch(
      () => props.mx,
      v => {
        mxLocal.value = v;
      }
    );

    const fileInput = ref(null);
    let undoMgr = null;

    /**
     * getActiveGraph
     * 获取当前 mxGraph 实例
     */
    function getActiveGraph() {
      if (props.mxGraph) return props.mxGraph;
      if (typeof injectedGetter === "function") {
        try {
          const v = injectedGetter();
          if (v) return typeof v === "function" ? v() : v;
        } catch (e) {}
      }
      if (injectedGraphRef && injectedGraphRef.value)
        return injectedGraphRef.value;
      return null;
    }

    /**
     * ensureUndoManager
     * 确保为图绑定撤销管理器
     */
    function ensureUndoManager() {
      const graph = getActiveGraph();
      if (!graph || !mxLocal.value) return;
      if (undoMgr) return;
      const { mxUndoManager, mxEvent } = mxLocal.value;
      undoMgr = new mxUndoManager();
      const undoListener = function (sender, evt) {
        const edit = evt.getProperty("edit");
        undoMgr.undoableEditHappened(edit);
      };
      graph.getModel().addListener(mxEvent.UNDO, undoListener);
      graph.getView().addListener(mxEvent.UNDO, undoListener);
    }

    /**
     * triggerOpen
     * 触发文件选择
     */
    function triggerOpen() {
      if (fileInput.value) fileInput.value.click();
    }

    /**
     * onFileChange
     * 读取 JSON 并加载到图
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
     * newGraph
     * 清空当前图模型
     */
    function newGraph() {
      const graph = getActiveGraph();
      if (!graph) return;
      const model = graph.getModel();
      model.beginUpdate();
      try {
        graph.removeCells(graph.getChildVertices(graph.getDefaultParent()));
      } finally {
        model.endUpdate();
      }
    }

    /**
     * saveGraph
     * 导出 JSON 并下载
     */
    function saveGraph() {
      const graph = getActiveGraph();
      if (!graph) return;
      const parent = graph.getDefaultParent();
      const model = graph.getModel();
      const cells = [];
      for (const v of graph.getChildVertices(parent)) {
        const g = v.geometry;
        cells.push({
          type: "vertex",
          id: v.id || null,
          label: model.getValue(v) || "",
          x: g?.x ?? 0,
          y: g?.y ?? 0,
          w: g?.width ?? 80,
          h: g?.height ?? 30,
          style: model.getStyle(v) || ""
        });
      }
      for (const e of graph.getChildEdges(parent)) {
        const s = model.getTerminal(e, true);
        const t = model.getTerminal(e, false);
        cells.push({
          type: "edge",
          id: e.id || null,
          label: model.getValue(e) || "",
          source: s?.id || null,
          target: t?.id || null,
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
     * loadCellsFromJSON
     * 从 JSON 加载顶点与边
     */
    function loadCellsFromJSON(data) {
      const graph = getActiveGraph();
      if (!graph) return;
      const parent = graph.getDefaultParent();
      const created = new Map();
      const model = graph.getModel();
      model.beginUpdate();
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
        model.endUpdate();
      }
    }

    /**
     * deleteSelected
     * 删除选中单元
     */
    function deleteSelected() {
      const graph = getActiveGraph();
      if (!graph) return;
      const cells = graph.getSelectionCells();
      if (cells && cells.length) graph.removeCells(cells);
    }

    /**
     * undo
     * 撤销操作
     */
    function undo() {
      ensureUndoManager();
      if (undoMgr) undoMgr.undo();
    }

    /**
     * redo
     * 重做操作
     */
    function redo() {
      ensureUndoManager();
      if (undoMgr) undoMgr.redo();
    }

    /**
     * zoomIn/zoomOut/fit/actualSize
     * 视图缩放与适配
     */
    function zoomIn() {
      const g = getActiveGraph();
      if (g) g.zoomIn();
    }
    function zoomOut() {
      const g = getActiveGraph();
      if (g) g.zoomOut();
    }
    function fit() {
      const g = getActiveGraph();
      if (g) g.fit();
    }
    function actualSize() {
      const g = getActiveGraph();
      if (g) g.zoomActual();
    }

    return {
      fileInput,
      triggerOpen,
      onFileChange,
      newGraph,
      saveGraph,
      loadCellsFromJSON,
      deleteSelected,
      undo,
      redo,
      zoomIn,
      zoomOut,
      fit,
      actualSize
    };
  }
};
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
}
.toolbar .sep {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
  margin: 0 4px;
}
.toolbar button {
  padding: 4px 8px;
  border: 1px solid #94a3b8;
  border-radius: 4px;
  background: #f8fafc;
  cursor: pointer;
}
.toolbar button:hover {
  background: #eef2f7;
}
</style>
