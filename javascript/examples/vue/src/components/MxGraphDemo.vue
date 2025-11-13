<template lang="pug">
.panel
  .toolbar
    button(@click="resetGraph") 重置
    button(@click="addSample") 添加示例
  .workspace
    .sidebar
      StencilSidebar(:getGraph="getGraph")
    .canvas(ref="container")
</template>

<script>
import { onMounted, onBeforeUnmount, ref } from "vue";
import StencilSidebar from "./StencilSidebar.vue";

export default {
  name: "MxGraphDemo",
  components: { StencilSidebar },
  setup() {
    const container = ref(null);
    let graph = null;
    let rubberband = null;

    /**
     * 初始化 mxGraph 图形实例并启用常用交互
     */
    function initGraph() {
      if (!window.mxClient) throw new Error("mxClient 未加载");
      // 兼容性检查
      if (!mxClient.isBrowserSupported()) {
        mxUtils.error("当前浏览器不支持 mxGraph", 200, false);
        return;
      }
      const containerEl = container.value;
      containerEl.innerHTML = "";

      // 创建图实例
      graph = new mxGraph(containerEl);

      // 启用橡皮筋选择、Port 高亮等常见交互
      rubberband = new mxRubberband(graph);
      new mxCellTracker(graph);

      // 基础样式
      graph.setPanning(true);
      graph.setConnectable(true);
      graph.setTooltips(true);
      graph.setCellsResizable(true);

      // 默认父容器
      const parent = graph.getDefaultParent();

      // 批量更新
      graph.getModel().beginUpdate();
      try {
        // 初始两个顶点与一条边
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

    onMounted(() => {
      initGraph();
    });

    onBeforeUnmount(() => {
      rubberband = null;
      graph = null;
    });

    return { container, resetGraph, addSample, getGraph };
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
