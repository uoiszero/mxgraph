<template>
  <div class="stencil-root">
    <div class="group" v-for="g in groups" :key="g.key">
      <div class="header" :class="{active: openKey===g.key}" @click="toggleGroup(g.key)">{{ g.title }}</div>
      <div class="items" v-show="openKey===g.key">
        <div class="item" v-for="it in g.items" :key="it.key" :ref="(el) => setupItem(el, it)">
          <div class="thumb"></div>
          <div class="cap">{{ it.label }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { onMounted, reactive, ref, computed, nextTick } from 'vue'
import { ensureMxClient } from './utils'

export default {
  name: 'MxStencilSidebar',
  props: {
    getGraph: { type: Function, required: true },
    stencils: {
      type: Array,
      default: () => [
        { key: 'basic', title: '基础图形', url: '/@fs/Users/alex/temp/mxgraph/javascript/examples/grapheditor/www/stencils/basic.xml' },
        { key: 'flowchart', title: '流程图', url: '/@fs/Users/alex/temp/mxgraph/javascript/examples/grapheditor/www/stencils/flowchart.xml' },
        { key: 'arrows', title: '箭头', url: '/@fs/Users/alex/temp/mxgraph/javascript/examples/grapheditor/www/stencils/arrows.xml' },
        { key: 'bpmn', title: 'BPMN', url: '/@fs/Users/alex/temp/mxgraph/javascript/examples/grapheditor/www/stencils/bpmn.xml' }
      ]
    },
    accordion: { type: Boolean, default: true },
    defaultOpenKey: { type: String, default: 'basic' }
  },
  setup(props) {
    const openKey = ref(props.defaultOpenKey)
    let thumbGraph = null

    // 为每个分组预建一个响应式数组，避免 Map 非响应导致不更新
    const groupsState = reactive(props.stencils.map(s => ({
      key: s.key,
      title: s.title,
      url: s.url,
      items: reactive([])
    })))

    const groups = computed(() => groupsState)

    /**
     * loadAll
     * 并行加载并注册所有 stencil 集合
     */
    async function loadAll() {
      for (const g of groupsState) {
        await loadStencilSetAndEnumerate(g.url, g.items)
      }
    }

    /**
     * loadStencilSetAndEnumerate
     * 加载并注册指定 XML，然后枚举 shape 生成为条目
     */
    async function loadStencilSetAndEnumerate(url, items) {
      await new Promise((resolve) => {
        if (!window.mxStencilRegistry || !window.mxUtils) return resolve()
        // 先加载到 cache 并注册（带 async）
        if (typeof mxStencilRegistry.loadStencilSet === 'function') {
          mxStencilRegistry.loadStencilSet(url, null, true, true)
        }
        // 解析 XML 并手动注册与枚举
        mxUtils.get(url, (req) => {
          try {
            const xml = req.getText ? req.getText() : ''
            const doc = mxUtils.parseXml(xml)
            registerStencilSetFromXml(doc)
            enumerateShapesFromXml(doc, items)
          } catch (e) {}
          resolve()
        }, () => resolve())
      })
    }

    /**
     * registerStencilSetFromXml
     * 将 XML 中的 shape 注册为 mxStencil
     */
    function registerStencilSetFromXml(doc) {
      if (!doc || !window.mxStencilRegistry || !window.mxStencil) return
      const root = doc.documentElement
      if (!root) return
      let packageName = (root.getAttribute('name') || '').toLowerCase()
      if (packageName && !packageName.endsWith('.')) packageName += '.'
      let node = root.firstChild
      while (node) {
        if (node.nodeType === 1 && node.nodeName === 'shape') {
          const raw = node.getAttribute('name') || ''
          if (raw) {
            const key = packageName + raw.replace(/ /g, '_').toLowerCase()
            if (!mxStencilRegistry.stencils || !mxStencilRegistry.stencils[key]) {
              try { mxStencilRegistry.addStencil(key, new mxStencil(node)) } catch (e) {}
            }
          }
        }
        node = node.nextSibling
      }
    }

    /**
     * enumerateShapesFromXml
     * 从 stencil XML 构建侧栏条目
     */
    function enumerateShapesFromXml(doc, items) {
      if (!doc) return
      const root = doc.documentElement
      let packageName = (root.getAttribute('name') || '').toLowerCase()
      if (packageName && !packageName.endsWith('.')) packageName += '.'
      const list = root ? root.getElementsByTagName('shape') : []
      const next = []
      for (let i = 0; i < list.length; i++) {
        const el = list[i]
        const raw = el.getAttribute('name') || ''
        if (!raw) continue
        const w = Number(el.getAttribute('w') || 80)
        const h = Number(el.getAttribute('h') || 40)
        const nameKey = raw.toLowerCase().replace(/ /g, '_')
        next.push({ key: packageName + nameKey, label: raw, shapeKey: packageName + nameKey, w, h })
      }
      items.splice(0, items.length, ...next)
    }

    /**
     * setupItem
     * 渲染缩略图并绑定拖拽
     */
    function setupItem(el, item) {
      if (!el) return
      if (!el.__thumb) {
        renderItemThumb(el, item)
        el.__thumb = true
      }
      const g = props.getGraph && props.getGraph()
      if (!g) {
        // graph 尚未就绪，稍后重试绑定拖拽
        setTimeout(() => setupItem(el, item), 100)
        return
      }
      if (!el.__dragBound) {
        bindDraggable(el, item)
        el.__dragBound = true
      }
    }

    /**
     * bindDraggable
     * 绑定拖拽到当前画布
     */
    function bindDraggable(el, item) {
      const graph = props.getGraph()
      if (!graph) return
      const dragElt = renderThumbDom(item, item.w, item.h)
      mxUtils.makeDraggable(el, graph, (g, evt) => {
        const pt = g.getPointForEvent(evt)
        const parent = g.getDefaultParent()
        g.getModel().beginUpdate()
        try {
          g.insertVertex(parent, null, '', pt.x, pt.y, item.w, item.h, 'shape=' + item.shapeKey + ';whiteSpace=wrap;html=1')
        } finally { g.getModel().endUpdate() }
      }, dragElt, 0, 0, true, true)
    }

    /**
     * renderItemThumb
     * 在条目上渲染缩略图
     */
    function renderItemThumb(el, item) {
      const thumb = el.querySelector('.thumb')
      if (!thumb) return
      thumb.innerHTML = ''
      thumb.appendChild(renderThumbDom(item, 80, 60))
    }

    /**
     * renderThumbDom
     * 使用离屏 mxGraph 渲染 SVG 缩略图
     */
    function renderThumbDom(item, width, height) {
      ensureThumbGraph()
      const g = thumbGraph
      g.labelsVisible = false
      g.getModel().beginUpdate()
      try { g.insertVertex(g.getDefaultParent(), null, '', 0, 0, item.w, item.h, 'shape=' + item.shapeKey + ';whiteSpace=wrap;html=1') }
      finally { g.getModel().endUpdate() }
      const bounds = g.getGraphBounds()
      const s = Math.max(0.01, Math.floor(Math.min((width - 4) / bounds.width, (height - 4) / bounds.height) * 100) / 100)
      g.view.scaleAndTranslate(s, Math.floor((width - bounds.width * s) / 2 / s - bounds.x), Math.floor((height - bounds.height * s) / 2 / s - bounds.y))
      let node = null
      if (g.dialect == mxConstants.DIALECT_SVG && !mxClient.NO_FO && g.view.getCanvas().ownerSVGElement) {
        node = g.view.getCanvas().ownerSVGElement.cloneNode(true)
      } else {
        node = g.container.cloneNode(false); node.innerHTML = g.container.innerHTML
      }
      g.view.scaleAndTranslate(1, 0, 0); g.getModel().clear()
      node.style.width = width + 'px'; node.style.height = height + 'px'; node.style.display = 'block'
      return node
    }

    /**
     * ensureThumbGraph
     * 创建一个隐藏的离屏 graph 供缩略图渲染使用
     */
    function ensureThumbGraph() {
      if (thumbGraph) return
      const container = document.createElement('div')
      container.style.position = 'absolute'; container.style.left = '-10000px'; container.style.top = '-10000px'
      container.style.width = '200px'; container.style.height = '200px'
      document.body.appendChild(container)
      thumbGraph = new mxGraph(container)
    }

    /**
     * toggleGroup
     * 切换风琴分组
     */
    function toggleGroup(key) { if (!props.accordion) return; openKey.value = key }

    onMounted(async () => {
      await ensureMxClient()
      // 等待 graph 就绪，以便一次性绑定拖拽
      const waitGraph = async () => {
        for (let i = 0; i < 50; i++) {
          if (props.getGraph && props.getGraph()) return
          await new Promise(r => setTimeout(r, 100))
        }
      }
      await waitGraph()
      await loadAll()
      await nextTick()
    })

    return { groups, setupItem, toggleGroup, openKey }
  }
}
</script>

<style scoped>
.stencil-root { display: flex; flex-direction: column; gap: 8px; }
.group { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
.header { padding: 8px 10px; font-size: 13px; color: #334155; background: #f8fafc; cursor: pointer; user-select: none; }
.header.active { background: #eef2f7; }
.items { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px; }
.item { width: 96px; padding: 6px; border: 1px solid #94a3b8; border-radius: 4px; background: #fff; cursor: grab; user-select: none; text-align: center; }
.item:hover { background: #f8fafc; }
.thumb { width: 80px; height: 60px; margin: 0 auto; }
.cap { font-size: 11px; color: #334155; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
