<template lang="pug">
.stencil-root
  .group(v-for="g in groups" :key="g.key")
    .header(:class="{active: openKey===g.key}" @click="toggleGroup(g.key)") {{ g.title }}
    .items(v-show="openKey===g.key")
      .item(v-for="it in g.items" :key="it.key" :ref="(el) => setupItem(el, it)")
        .thumb
        .cap {{ it.label }}
</template>

<script>
import { onMounted, reactive, ref, computed } from 'vue'

export default {
  name: 'StencilSidebar',
  props: {
    getGraph: { type: Function, required: true }
  },
  setup(props) {
    const basicItems = reactive([])
    const flowItems = reactive([])
    const arrowItems = reactive([])
    const bpmnItems = reactive([])
    const openKey = ref('basic')
    let thumbGraph = null
    let thumbContainer = null

    /**
     * 加载预定义图形库（stencil sets）到 mxStencilRegistry
     */
    function loadStencilSets() {
      const base = '/@fs/Users/alex/temp/mxgraph/javascript/examples/grapheditor/www/stencils'
      return Promise.all([
        loadStencilSetAndEnumerate(base + '/basic.xml', basicItems),
        loadStencilSetAndEnumerate(base + '/flowchart.xml', flowItems),
        loadStencilSetAndEnumerate(base + '/arrows.xml', arrowItems),
        loadStencilSetAndEnumerate(base + '/bpmn.xml', bpmnItems)
      ])
    }

    /**
     * 包装 mxStencilRegistry.loadStencilSet 为 Promise
     */
    function loadStencilSet(url) {
      return new Promise((resolve) => {
        if (window.mxStencilRegistry && mxStencilRegistry.loadStencilSet) {
          mxStencilRegistry.loadStencilSet(url, () => resolve())
        } else {
          resolve()
        }
      })
    }

    /**
     * 加载指定 stencil 集并枚举其中的 shape，生成侧栏条目
     */
    async function loadStencilSetAndEnumerate(url, items) {
      await loadStencilSet(url)
      await new Promise((resolve, reject) => {
        // 使用 mxUtils.get 读取 XML 并解析 shape 列表
        if (!window.mxUtils) return resolve()
        mxUtils.get(url, (req) => {
          try {
            const xml = req.getText ? req.getText() : ''
            const doc = mxUtils.parseXml(xml)
            // 确保将 stencil 注册到全局，以便渲染时能找到对应 shape
            registerStencilSetFromXml(doc)
            enumerateShapesFromXml(doc, items)
            resolve()
          } catch (e) {
            resolve()
          }
        }, () => resolve())
      })
    }

    /**
     * 从 stencil XML 文档枚举 shape 节点，形成可拖拽项目
     */
    function enumerateShapesFromXml(doc, items) {
      if (!doc) return
      const root = doc.documentElement
      // 取根元素包名并标准化为小写且以点结尾，例如 mxgraph.flowchart.
      const pkgRaw = (root && root.getAttribute('name')) || ''
      let packageName = pkgRaw.toLowerCase()
      if (packageName && !packageName.endsWith('.')) packageName += '.'

      const list = root ? root.getElementsByTagName('shape') : []
      const next = []
      for (let i = 0; i < list.length; i++) {
        const el = list[i]
        const name = (el.getAttribute('name') || '')
        const nameKey = name.toLowerCase().replace(/ /g, '_')
        if (!name) continue
        const w = Number(el.getAttribute('w') || 80)
        const h = Number(el.getAttribute('h') || 40)
        next.push({
          key: packageName + nameKey,
          label: name,
          shapeKey: packageName + nameKey,
          w, h
        })
      }
      if (next.length) {
        items.splice(0, items.length, ...next)
      }
    }

    /**
     * 将 XML 中的 shape 注册为 mxStencil，键为 packageName + stencilName
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
            // 已存在则跳过
            if (!mxStencilRegistry.stencils || !mxStencilRegistry.stencils[key]) {
              try {
                mxStencilRegistry.addStencil(key, new mxStencil(node))
              } catch (e) {
                // 忽略单个注册错误，继续其他 shape
              }
            }
          }
        }
        node = node.nextSibling
      }
    }

    /**
     * 绑定一个可拖拽项到 graph：在放置位置创建顶点并应用 stencil 样式
     */
    function bindDraggable(el, item) {
      if (!el || !item) return
      const graph = props.getGraph()
      if (!graph) return

      const create = (graph, evt, target, x, y) => {
        const parent = graph.getDefaultParent()
        graph.getModel().beginUpdate()
        try {
          const v = graph.insertVertex(parent, null, '', x, y, item.w, item.h, 'shape=' + item.shapeKey + ';whiteSpace=wrap;html=1')
          return v
        } finally {
          graph.getModel().endUpdate()
        }
      }

      const dragElt = renderThumbDom(item, item.w, item.h)

      mxUtils.makeDraggable(el, graph, (g, evt) => {
        const pt = g.getPointForEvent(evt)
        create(g, evt, null, pt.x, pt.y)
      }, dragElt, 0, 0, true, true)
    }

    /**
     * 在条目元素中渲染缩略图
     */
    function renderItemThumb(el, item) {
      const thumb = el.querySelector('.thumb')
      if (!thumb) return
      // 清空旧内容
      thumb.innerHTML = ''
      const node = renderThumbDom(item, 80, 60)
      thumb.appendChild(node)
    }

    /**
     * 使用离屏 mxGraph 生成缩略图 DOM 片段
     */
    function renderThumbDom(item, width, height) {
      ensureThumbGraph()
      const g = thumbGraph
      g.labelsVisible = false
      g.getModel().beginUpdate()
      let cell
      try {
        cell = g.insertVertex(g.getDefaultParent(), null, '', 0, 0, item.w, item.h, 'shape=' + item.shapeKey + ';whiteSpace=wrap;html=1')
      } finally {
        g.getModel().endUpdate()
      }

      const bounds = g.getGraphBounds()
      const s = Math.max(0.01, Math.floor(Math.min((width - 4) / bounds.width, (height - 4) / bounds.height) * 100) / 100)
      g.view.scaleAndTranslate(s, Math.floor((width - bounds.width * s) / 2 / s - bounds.x), Math.floor((height - bounds.height * s) / 2 / s - bounds.y))

      let node = null
      if (g.dialect == mxConstants.DIALECT_SVG && !mxClient.NO_FO && g.view.getCanvas().ownerSVGElement) {
        node = g.view.getCanvas().ownerSVGElement.cloneNode(true)
      } else {
        node = g.container.cloneNode(false)
        node.innerHTML = g.container.innerHTML
      }

      // 复位图形以便下次复用
      g.view.scaleAndTranslate(1, 0, 0)
      g.getModel().clear()

      node.style.width = width + 'px'
      node.style.height = height + 'px'
      node.style.display = 'block'
      return node
    }

    function ensureThumbGraph() {
      if (thumbGraph) return
      thumbContainer = document.createElement('div')
      thumbContainer.style.position = 'absolute'
      thumbContainer.style.left = '-10000px'
      thumbContainer.style.top = '-10000px'
      thumbContainer.style.width = '200px'
      thumbContainer.style.height = '200px'
      document.body.appendChild(thumbContainer)
      thumbGraph = new mxGraph(thumbContainer)
    }

    /**
     * 统一条目初始化：渲染缩略图并绑定拖拽
     */
    function setupItem(el, item) {
      if (!el) return
      if (el.__inited) return
      renderItemThumb(el, item)
      bindDraggable(el, item)
      el.__inited = true
    }

    /**
     * 切换风琴分组，仅允许一个打开
     */
    function toggleGroup(key) {
      openKey.value = key
    }

    /**
     * 构建分组描述（风琴）
     */
    const groups = computed(() => [
      { key: 'basic', title: '基础图形', items: basicItems },
      { key: 'flowchart', title: '流程图', items: flowItems },
      { key: 'arrows', title: '箭头', items: arrowItems },
      { key: 'bpmn', title: 'BPMN', items: bpmnItems },
    ])

    /**
     * 初始化侧边栏条目
     */
    function initItems() {
      // 已由 loadStencilSetAndEnumerate 动态填充
    }

    onMounted(async () => {
      await loadStencilSets()
      initItems()
    })

    return { basicItems, flowItems, arrowItems, bpmnItems, setupItem, toggleGroup, groups, openKey }
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
