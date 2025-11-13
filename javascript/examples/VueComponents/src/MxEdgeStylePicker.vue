<template>
  <div class="edge-style-picker">
    <button v-for="opt in options" :key="opt.key" @click="apply(opt.key)">{{ opt.label }}</button>
  </div>
</template>

<script>
export default {
  name: 'MxEdgeStylePicker',
  props: {
    getGraph: { type: Function, required: false, default: null }
  },
  setup(props) {
    const options = [
      { key: 'connection', label: 'Connection' },
      { key: 'link', label: 'Link' },
      { key: 'flexArrow', label: 'Arrow' },
      { key: 'arrow', label: 'Simple Arrow' }
    ]

    /**
     * getActiveGraph
     * 获取当前 mxGraph 实例
     */
    function getActiveGraph() {
      if (typeof props.getGraph === 'function') {
        try { const g = props.getGraph(); if (g) return g } catch (e) {}
      }
      if (typeof window !== 'undefined' && window.__lastGraphRef && window.__lastGraphRef()) {
        return window.__lastGraphRef()
      }
      return null
    }

    /**
     * apply
     * 将选中的边应用为指定样式（connection/link/flexArrow/arrow）
     */
    function apply(kind) {
      const graph = getActiveGraph()
      if (!graph) return
      const cells = graph.getSelectionCells().filter(c => graph.getModel().isEdge(c))
      if (!cells.length) return
      graph.getModel().beginUpdate()
      try {
        if (kind === 'connection') {
          graph.setCellStyles(mxConstants.STYLE_SHAPE, null, cells)
          graph.setCellStyles(mxConstants.STYLE_STARTSIZE, null, cells)
          graph.setCellStyles(mxConstants.STYLE_ENDSIZE, null, cells)
          graph.setCellStyles('width', null, cells)
        } else if (kind === 'link' || kind === 'flexArrow' || kind === 'arrow') {
          graph.setCellStyles(mxConstants.STYLE_SHAPE, kind, cells)
          graph.setCellStyles(mxConstants.STYLE_STARTSIZE, null, cells)
          graph.setCellStyles(mxConstants.STYLE_ENDSIZE, null, cells)
          graph.setCellStyles('width', null, cells)
        }
      } finally {
        graph.getModel().endUpdate()
      }
    }

    return { options, apply }
  }
}
</script>

<style scoped>
.edge-style-picker { display: inline-flex; gap: 6px; margin-left: 8px; }
button { padding: 4px 8px; border: 1px solid #94a3b8; border-radius: 4px; background: #f8fafc; cursor: pointer; }
button:hover { background: #eef2f7; }
</style>

