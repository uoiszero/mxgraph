<template lang="pug">
.panel
  .toolbar
    button(@click="resetGraph") 重置
    button(@click="addSample") 添加示例
    button(@click="doUndo") 撤销
    button(@click="doRedo") 重做
    button(@click="openEditor") 编辑XML
  .workspace
    .sidebar
      MxStencilSidebar(:getGraph="getGraph")
    .canvas
      MxGraphCanvas(@ready="onReady")
    .inspector
      MxStyleEditor(:getGraph="getGraph")
  MxEditDialog(
    :getGraphFn="getGraph",
    :visible="showEditor",
    @close="showEditor = false"
  )
</template>

<script>
import { ref } from "vue";
import {
  MxGraphCanvas,
  MxStencilSidebar,
  MxEditDialog,
  MxStyleEditor
} from "../../../VueComponents/index.js";

export default {
  name: "MxGraphDemo",
  components: { MxGraphCanvas, MxStencilSidebar, MxEditDialog, MxStyleEditor },
  setup() {
    const container = ref(null);
    let graph = null;

    /**
     * 初始化 mxGraph 图形实例并启用常用交互
     */
    /**
     * onReady
     * 画布就绪回调，缓存 graph 并准备撤销接口
     */
    function onReady(g) {
      graph = g;
    }

    /**
     * 打开编辑对话框
     */
    const showEditor = ref(false);
    function openEditor() {
      showEditor.value = true;
    }

    function beginUpdate() {
      if (!graph) return;
      graph.getModel().beginUpdate();
      return true;
    }

    function endUpdate() {
      if (!graph) {
        return false;
      }
      graph.getModel().endUpdate();
    }

    /**
     * 清空并重建画布
     */
    function resetGraph() {
      if (beginUpdate()) {
        try {
          graph.removeCells(graph.getChildVertices(graph.getDefaultParent()));
        } finally {
          endUpdate();
        }
      }
    }

    /**
     * 添加示例节点与连线
     */
    function addSample() {
      if (beginUpdate()) {
        const parent = graph.getDefaultParent();
        try {
          const a = graph.insertVertex(parent, null, "A", 60, 220, 60, 30);
          const b = graph.insertVertex(parent, null, "B", 160, 220, 60, 30);
          const c = graph.insertVertex(parent, null, "C", 260, 220, 60, 30);
          graph.insertEdge(parent, null, "", a, b);
          graph.insertEdge(parent, null, "", b, c);
        } finally {
          endUpdate();
        }
      }
    }

    /**
     * doUndo
     * 调用画布撤销
     */
    function doUndo() {
      if (!graph) {
        return;
      }
      if (typeof graph.undo === "function") graph.undo();
    }

    /**
     * doRedo
     * 调用画布重做
     */
    function doRedo() {
      if (!graph) {
        return;
      }
      if (typeof graph.redo === "function") graph.redo();
    }

    /**
     * 获取 graph 实例（供侧边栏拖拽使用）
     */
    function getGraph() {
      return graph;
    }

    return {
      container,
      resetGraph,
      addSample,
      getGraph,
      onReady,
      showEditor,
      openEditor,
      doUndo,
      doRedo
    };
  }
};
</script>

<style scoped>
.panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.workspace {
  display: flex;
  gap: 12px;
}
.sidebar {
  width: 250px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  height: 480px;
  overflow: auto;
}
.canvas {
  flex: 1;
  height: 480px;
  border: 1px dashed #cbd5e1;
}
.inspector {
  width: 320px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  height: 480px;
  overflow: auto;
}
button {
  padding: 6px 12px;
  border: 1px solid #94a3b8;
  border-radius: 4px;
  background: #f8fafc;
  cursor: pointer;
}
button:hover {
  background: #eef2f7;
}
</style>
