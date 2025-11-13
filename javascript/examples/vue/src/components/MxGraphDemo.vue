<template lang="pug">
.panel
  .toolbar
    button(@click="resetGraph") 重置
    button(@click="addSample") 添加示例
  .workspace
    .sidebar
      MxStencilSidebar(:getGraph="getGraph")
    .canvas
      MxGraphCanvas(@ready="onReady")
</template>

<script>
import { ref } from "vue";
import { MxGraphCanvas, MxStencilSidebar } from "../../../VueComponents/index.js";

export default {
  name: "MxGraphDemo",
  components: { MxGraphCanvas, MxStencilSidebar },
  setup() {
    const container = ref(null);
    let graph = null;

    /**
     * 初始化 mxGraph 图形实例并启用常用交互
     */
    function onReady(g) { graph = g; }

    /**
     * 清空并重建画布
     */
    function resetGraph() {
      if (!graph) return initGraph();
      graph.getModel().beginUpdate();
      try {
        graph.removeCells(graph.getChildVertices(graph.getDefaultParent()));
      } finally {
        graph.getModel().endUpdate();
      }
    }

    /**
     * 添加示例节点与连线
     */
    function addSample() {
      if (!graph) return;
      const parent = graph.getDefaultParent();
      graph.getModel().beginUpdate();
      try {
        const a = graph.insertVertex(parent, null, "A", 60, 220, 60, 30);
        const b = graph.insertVertex(parent, null, "B", 160, 220, 60, 30);
        const c = graph.insertVertex(parent, null, "C", 260, 220, 60, 30);
        graph.insertEdge(parent, null, "", a, b);
        graph.insertEdge(parent, null, "", b, c);
      } finally {
        graph.getModel().endUpdate();
      }
    }

    /**
     * 获取 graph 实例（供侧边栏拖拽使用）
     */
    function getGraph() {
      return graph;
    }

    return { container, resetGraph, addSample, getGraph, onReady };
  },
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
