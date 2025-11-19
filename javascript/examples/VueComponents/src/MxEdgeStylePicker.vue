<template>
  <div class="edge-style-picker">
    <button
      v-for="opt in options"
      :key="opt.key"
      @click="apply(opt.key)">
      {{ opt.label }}
    </button>
    <button @click="enableStartArrow">启用起始箭头</button>
    <button @click="disableStartArrow">移除起始箭头</button>
    <button @click="endOnlyArrow">仅末端箭头</button>
    <button @click="startOnlyArrow">仅起始箭头</button>
  </div>
</template>

<script>
export default {
  name: "MxEdgeStylePicker",
  props: {
    getGraph: { type: Function, required: false, default: null },
  },
  setup(props) {
    const options = [
      { key: "connection", label: "Connection" },
      { key: "link", label: "Link" },
      { key: "flexArrow", label: "Arrow" },
      { key: "arrow", label: "Simple Arrow" },
    ];

    /**
     * getActiveGraph
     * 获取当前 mxGraph 实例
     */
    function getActiveGraph() {
      if (typeof props.getGraph === "function") {
        try {
          const g = props.getGraph();
          if (g) return g;
        } catch (e) {}
      }
      if (
        typeof window !== "undefined" &&
        window.__lastGraphRef &&
        window.__lastGraphRef()
      ) {
        return window.__lastGraphRef();
      }
      return null;
    }

    /**
     * apply
     * 将选中的边应用为指定样式（connection/link/flexArrow/arrow）
     */
    function apply(kind) {
      const graph = getActiveGraph();
      if (!graph) return;
      const cells = graph
        .getSelectionCells()
        .filter(c => graph.getModel().isEdge(c));
      if (!cells.length) return;
      graph.getModel().beginUpdate();
      try {
        if (kind === "connection") {
          graph.setCellStyles(mxConstants.STYLE_SHAPE, null, cells);
          graph.setCellStyles(mxConstants.STYLE_STARTSIZE, null, cells);
          graph.setCellStyles(mxConstants.STYLE_ENDSIZE, null, cells);
          graph.setCellStyles("width", null, cells);
          graph.setCellStyles(mxConstants.STYLE_NOEDGESTYLE, null, cells);
          graph.setCellStyles(mxConstants.STYLE_EDGE, null, cells);
        } else if (
          kind === "link" ||
          kind === "flexArrow" ||
          kind === "arrow"
        ) {
          graph.setCellStyles(mxConstants.STYLE_SHAPE, kind, cells);
          graph.setCellStyles(mxConstants.STYLE_STARTSIZE, null, cells);
          graph.setCellStyles(mxConstants.STYLE_ENDSIZE, null, cells);
          graph.setCellStyles("width", null, cells);
          if (kind === "flexArrow") {
            graph.setCellStyles(
              mxConstants.STYLE_ENDARROW,
              mxConstants.ARROW_BLOCK,
              cells
            );
            graph.setCellStyles(
              mxConstants.STYLE_STARTARROW,
              mxConstants.NONE,
              cells
            );
            graph.setCellStyles(mxConstants.STYLE_NOEDGESTYLE, "1", cells);
            graph.setCellStyles(mxConstants.STYLE_EDGE, null, cells);
          }
        }
      } finally {
        graph.getModel().endUpdate();
      }
    }

    /**
     * enableStartArrow
     * 为选中边启用起始端箭头（并确保为 flexArrow 形状），以显示起始端的宽度/角度控制点
     */
    function enableStartArrow() {
      const graph = getActiveGraph();
      if (!graph) return;
      const cells = graph
        .getSelectionCells()
        .filter(c => graph.getModel().isEdge(c));
      if (!cells.length) return;
      graph.getModel().beginUpdate();
      try {
        graph.setCellStyles(mxConstants.STYLE_SHAPE, "flexArrow", cells);
        graph.setCellStyles(
          mxConstants.STYLE_STARTARROW,
          mxConstants.ARROW_BLOCK,
          cells
        );
        // 如果末端没有箭头，也默认开启，便于两端同时显示控制点
        graph.setCellStyles(
          mxConstants.STYLE_ENDARROW,
          mxConstants.ARROW_BLOCK,
          cells
        );
        graph.setCellStyles(mxConstants.STYLE_NOEDGESTYLE, "1", cells);
        graph.setCellStyles(mxConstants.STYLE_EDGE, null, cells);
      } finally {
        graph.getModel().endUpdate();
      }
    }

    /**
     * disableStartArrow
     * 取消起始端箭头，仅保留当前末端设置
     */
    function disableStartArrow() {
      const graph = getActiveGraph();
      if (!graph) return;
      const cells = graph
        .getSelectionCells()
        .filter(c => graph.getModel().isEdge(c));
      if (!cells.length) return;
      graph.getModel().beginUpdate();
      try {
        graph.setCellStyles(mxConstants.STYLE_SHAPE, "flexArrow", cells);
        graph.setCellStyles(
          mxConstants.STYLE_STARTARROW,
          mxConstants.NONE,
          cells
        );
        graph.setCellStyles(mxConstants.STYLE_NOEDGESTYLE, "1", cells);
        graph.setCellStyles(mxConstants.STYLE_EDGE, null, cells);
      } finally {
        graph.getModel().endUpdate();
      }
    }

    /**
     * endOnlyArrow
     * 只保留末端箭头（起始无箭头）
     */
    function endOnlyArrow() {
      const graph = getActiveGraph();
      if (!graph) return;
      const cells = graph
        .getSelectionCells()
        .filter(c => graph.getModel().isEdge(c));
      if (!cells.length) return;
      graph.getModel().beginUpdate();
      try {
        graph.setCellStyles(mxConstants.STYLE_SHAPE, "flexArrow", cells);
        graph.setCellStyles(
          mxConstants.STYLE_STARTARROW,
          mxConstants.NONE,
          cells
        );
        graph.setCellStyles(
          mxConstants.STYLE_ENDARROW,
          mxConstants.ARROW_BLOCK,
          cells
        );
        graph.setCellStyles(mxConstants.STYLE_NOEDGESTYLE, "1", cells);
        graph.setCellStyles(mxConstants.STYLE_EDGE, null, cells);
      } finally {
        graph.getModel().endUpdate();
      }
    }

    /**
     * startOnlyArrow
     * 只保留起始箭头（末端无箭头）
     */
    function startOnlyArrow() {
      const graph = getActiveGraph();
      if (!graph) return;
      const cells = graph
        .getSelectionCells()
        .filter(c => graph.getModel().isEdge(c));
      if (!cells.length) return;
      graph.getModel().beginUpdate();
      try {
        graph.setCellStyles(mxConstants.STYLE_SHAPE, "flexArrow", cells);
        graph.setCellStyles(
          mxConstants.STYLE_STARTARROW,
          mxConstants.ARROW_BLOCK,
          cells
        );
        graph.setCellStyles(
          mxConstants.STYLE_ENDARROW,
          mxConstants.NONE,
          cells
        );
        graph.setCellStyles(mxConstants.STYLE_NOEDGESTYLE, "1", cells);
        graph.setCellStyles(mxConstants.STYLE_EDGE, null, cells);
      } finally {
        graph.getModel().endUpdate();
      }
    }

    return {
      options,
      apply,
      enableStartArrow,
      disableStartArrow,
      endOnlyArrow,
      startOnlyArrow,
    };
  },
};
</script>

<style scoped>
.edge-style-picker {
  display: inline-flex;
  gap: 6px;
  margin-left: 8px;
}
button {
  padding: 4px 8px;
  border: 1px solid #94a3b8;
  border-radius: 4px;
  background: #f8fafc;
  cursor: pointer;
}
button:hover {
  background: #eef2f7;
}
</style>
