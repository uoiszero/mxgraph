<template>
  <div v-if="visible" class="dlg-mask" @click.self="onClose">
    <div class="dlg">
      <div class="dlg-header">编辑图形 XML</div>
      <textarea v-model="text" class="dlg-text" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off"></textarea>
      <div class="dlg-actions">
        <button @click="onApply">应用</button>
        <button @click="onClose">取消</button>
      </div>
    </div>
  </div>
  <div v-else style="display:none"></div>
</template>

<script>
import { ref, watch, inject, nextTick } from 'vue'
import { ensureMxClient } from './utils'

export default {
  name: 'MxEditDialog',
  props: {
    visible: { type: Boolean, default: false },
    // 可选：从父组件传入的获取 graph 的函数，便于兄弟组件场景
    getGraphFn: { type: Function, default: null }
  },
  emits: ['close', 'applied'],
  setup(props, { emit }) {
    const text = ref('')
    const injectedGetter = inject('getGraph', null)
    const graphRef = inject('mxGraph', null)

    /**
     * getActiveGraph
     * 获取当前 mxGraph 实例
     */
    function getActiveGraph() {
      if (typeof props.getGraphFn === 'function') {
        try { const g = props.getGraphFn(); if (g) return g } catch(e) {}
      }
      return (typeof injectedGetter === 'function' && injectedGetter()) || (graphRef && graphRef.value) || graphRef || null
    }

    /**
     * loadCurrentXml
     * 从当前图读取 XML 文本到编辑框
     */
    function loadCurrentXml() {
      const graph = getActiveGraph()
      if (!graph) return
      const enc = new mxCodec()
      const node = enc.encode(graph.getModel())
      text.value = mxUtils.getPrettyXml(node)
    }

    /**
     * applyXml
     * 将编辑框中的 XML 解析并覆盖加载到当前图
     */
    function applyXml() {
      const graph = getActiveGraph()
      if (!graph) return
      try {
        const doc = mxUtils.parseXml(text.value)
        const codec = new mxCodec(doc)
        graph.getModel().beginUpdate()
        try {
          codec.decode(doc.documentElement, graph.getModel())
        } finally {
          graph.getModel().endUpdate()
        }
        graph.refresh()
        emit('applied')
      } catch (e) {
        alert('XML 解析失败：' + (e?.message || e))
      }
    }

    /**
     * onApply
     * 点击应用按钮回调
     */
    function onApply() {
      applyXml()
      emit('close')
    }

    /**
     * onClose
     * 关闭对话框
     */
    function onClose() {
      emit('close')
    }

    watch(() => props.visible, async (v) => {
      if (v) {
        await ensureMxClient()
        await nextTick()
        loadCurrentXml()
      }
    })

    return { text, onApply, onClose }
  }
}
</script>

<style scoped>
.dlg-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 9999; }
.dlg { width: 800px; max-width: 96vw; height: 600px; max-height: 90vh; background: #fff; border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; }
.dlg-header { padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb; }
.dlg-text { flex: 1; width: 100%; padding: 8px 10px; border: none; outline: none; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; }
.dlg-actions { padding: 8px 12px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px; justify-content: flex-end; }
button { padding: 6px 12px; border: 1px solid #94a3b8; border-radius: 4px; background: #f8fafc; cursor: pointer; }
button:hover { background: #eef2f7; }
</style>
