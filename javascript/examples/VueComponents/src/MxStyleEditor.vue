<template>
  <div class="style-editor">
    <div class="row"><label>style</label><textarea v-model="styleText"></textarea></div>
    <div class="row">
      <label>width</label><input type="number" step="0.1" v-model.number="width" :placeholder="defaultHints.width"/>
      <label>startSize</label><input type="number" step="0.1" v-model.number="startSize" :placeholder="defaultHints.startSize"/>
      <label>endSize</label><input type="number" step="0.1" v-model.number="endSize" :placeholder="defaultHints.endSize"/>
    </div>
    <div class="row">
      <label>startWidth</label><input type="number" step="0.1" v-model.number="startWidth" :placeholder="defaultHints.startWidth"/>
      <label>endWidth</label><input type="number" step="0.1" v-model.number="endWidth" :placeholder="defaultHints.endWidth"/>
      <label>fillColor</label><input type="text" v-model="fillColor" placeholder="#ffffff/none"/>
    </div>
    <div class="row actions">
      <button @click="applyText">应用文本</button>
      <button @click="applyFields">应用参数</button>
      <button @click="refreshFromSelection">读取选中</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'MxStyleEditor',
  props: { getGraph: { type: Function, default: null } },
  setup(props) {
    const styleText = ref('')
    const width = ref(null)
    const startSize = ref(null)
    const endSize = ref(null)
    const startWidth = ref(null)
    const endWidth = ref(null)
    const fillColor = ref('')
    const defaultHints = ref({ width: '', startSize: '', endSize: '', startWidth: '', endWidth: '' })

    /**
     * getActiveGraph
     * 获取当前 mxGraph 实例
     */
    function getActiveGraph() {
      if (typeof props.getGraph === 'function') {
        try { const g = props.getGraph(); if (g) return g } catch(e) {}
      }
      if (typeof window !== 'undefined' && window.__lastGraphRef) return window.__lastGraphRef()
      return null
    }

    /**
     * parseStyle
     * 将分号分隔的 style 字符串解析为对象
     */
    function parseStyle(s) {
      const obj = {}
      ;(s || '').split(';').forEach(kv => {
        const i = kv.indexOf('='); if (i>0) obj[kv.slice(0,i)] = kv.slice(i+1)
      })
      return obj
    }

    /**
     * stringifyStyle
     * 将对象序列化为 style 字符串
     */
    function stringifyStyle(o) {
      return Object.keys(o).map(k => `${k}=${o[k]}`).join(';') + (Object.keys(o).length?';':'')
    }

    /**
     * refreshFromSelection
     * 从当前选中边读取 style 字符串与关键参数
     */
    function refreshFromSelection() {
      const graph = getActiveGraph(); if (!graph) return
      const cell = graph.getSelectionCell(); if (!cell) return
      const style = graph.getModel().getStyle(cell) || ''
      styleText.value = style
      const o = parseStyle(style)
      width.value = o.width != null ? Number(o.width) : null
      startSize.value = o[mxConstants.STYLE_STARTSIZE] != null ? Number(o[mxConstants.STYLE_STARTSIZE]) : null
      endSize.value = o[mxConstants.STYLE_ENDSIZE] != null ? Number(o[mxConstants.STYLE_ENDSIZE]) : null
      startWidth.value = o.startWidth != null ? Number(o.startWidth) : null
      endWidth.value = o.endWidth != null ? Number(o.endWidth) : null
      fillColor.value = o.fillColor || ''
      refreshDefaultHints(graph, cell, o)
    }

    /**
     * refreshDefaultHints
     * 计算并显示当前选中边在未显式设置时的默认值提示
     */
    function refreshDefaultHints(graph, cell, styleObj) {
      const view = graph.getView()
      const state = view.getState(cell)
      const shapeName = (styleObj.shape || (state && state.style && state.style.shape) || '').toString()
      const strokeWidth = Number((state && state.shape && state.shape.strokewidth) || (styleObj.strokeWidth != null ? styleObj.strokeWidth : 1)) || 1

      let defWidth = ''
      let defStartSize = ''
      let defEndSize = ''
      let defStartWidth = ''
      let defEndWidth = ''

      if (shapeName === 'link') {
        const base = 4
        defWidth = String(base + Math.max(0, strokeWidth - 1))
      } else if (shapeName === 'flexArrow') {
        const base = 10
        defWidth = String(base + Math.max(0, strokeWidth - 1))
        defStartWidth = '20'
        defEndWidth = '20'
      }

      // 端点尺寸默认：连线用 DEFAULT_MARKERSIZE，箭头族用 ARROW_SIZE
      const isArrowFamily = (shapeName === 'arrow' || shapeName === 'flexArrow' || shapeName === 'doubleArrow' || shapeName === 'singleArrow')
      defStartSize = String(isArrowFamily ? mxConstants.ARROW_SIZE : mxConstants.DEFAULT_MARKERSIZE)
      defEndSize = defStartSize

      defaultHints.value = { width: defWidth, startSize: defStartSize, endSize: defEndSize, startWidth: defStartWidth, endWidth: defEndWidth }
    }

    /**
     * applyText
     * 以文本方式覆盖选中单元的样式
     */
    function applyText() {
      const graph = getActiveGraph(); if (!graph) return
      const cells = graph.getSelectionCells(); if (!cells?.length) return
      graph.getModel().beginUpdate()
      try {
        for (const c of cells) graph.getModel().setStyle(c, styleText.value)
      } finally { graph.getModel().endUpdate() }
      graph.refresh()
    }

    /**
     * applyFields
     * 以字段方式设置样式键，未设的键不改动
     */
    function applyFields() {
      const graph = getActiveGraph(); if (!graph) return
      const cells = graph.getSelectionCells(); if (!cells?.length) return
      const set = (k,v)=> v==null? null : String(v)
      graph.getModel().beginUpdate()
      try {
        // 当用户设置 width 且当前形状不是支持 width 的形状（flexArrow/link），自动转换为 flexArrow
        if (width.value != null) {
          const needsShape = cells.some(c => {
            const s = graph.getModel().getStyle(c) || ''
            const shape = (s.match(/(^|;)shape=([^;]+)/)?.[2]) || ''
            return shape !== 'flexArrow' && shape !== 'link'
          })
          if (needsShape) {
            graph.setCellStyles(mxConstants.STYLE_SHAPE, 'flexArrow', cells)
            graph.setCellStyles(mxConstants.STYLE_NOEDGESTYLE, '1', cells)
            graph.setCellStyles(mxConstants.STYLE_EDGE, null, cells)
          }
        }
        if (width.value != null) graph.setCellStyles('width', String(width.value), cells)
        if (startSize.value != null) graph.setCellStyles(mxConstants.STYLE_STARTSIZE, String(startSize.value), cells)
        if (endSize.value != null) graph.setCellStyles(mxConstants.STYLE_ENDSIZE, String(endSize.value), cells)
        if (startWidth.value != null) graph.setCellStyles('startWidth', String(startWidth.value), cells)
        if (endWidth.value != null) graph.setCellStyles('endWidth', String(endWidth.value), cells)
        if (fillColor.value) graph.setCellStyles(mxConstants.STYLE_FILLCOLOR, fillColor.value, cells)
      } finally { graph.getModel().endUpdate() }
      graph.refresh()
      refreshFromSelection()
    }

    onMounted(() => refreshFromSelection())

    return { styleText, width, startSize, endSize, startWidth, endWidth, fillColor, applyText, applyFields, refreshFromSelection, defaultHints }
  }
}
</script>

<style scoped>
.style-editor { display: flex; flex-direction: column; gap: 8px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; }
.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
label { font-size: 12px; color: #334155; }
textarea { width: 100%; height: 100px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; }
input[type=number], input[type=text] { width: 120px; padding: 4px 6px; }
.actions { justify-content: flex-end; }
button { padding: 4px 8px; border: 1px solid #94a3b8; border-radius: 4px; background: #f8fafc; cursor: pointer; }
button:hover { background: #eef2f7; }
</style>
