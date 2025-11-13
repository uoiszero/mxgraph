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
import { onMounted, reactive, ref, computed, nextTick, inject } from 'vue'
import { ensureMxClient } from './utils'

export default {
  name: 'MxStencilSidebar',
  props: {
    getGraph: { type: Function, required: false, default: null },
    stencils: { type: Array, default: () => [] },
    accordion: { type: Boolean, default: true },
    defaultOpenKey: { type: String, default: 'basic' }
  },
  setup(props) {
    const openKey = ref(props.defaultOpenKey)
    let thumbGraph = null

    // 为每个分组预建一个响应式数组，避免 Map 非响应导致不更新
    const defaultStencilUrls = () => {
      const base = new URL('../stencils/', import.meta.url).href
      return [
        { key: 'basic', title: '基础图形', url: new URL('basic.xml', base).href },
        { key: 'flowchart', title: '流程图', url: new URL('flowchart.xml', base).href },
        { key: 'arrows', title: '箭头', url: new URL('arrows.xml', base).href },
        { key: 'bpmn', title: 'BPMN', url: new URL('bpmn.xml', base).href },
      ]
    }

    const source = props.stencils.length ? props.stencils : defaultStencilUrls()

    const groupsState = reactive(source.map(s => ({
      key: s.key,
      title: s.title,
      url: s.url,
      items: reactive([])
    })))

    const groups = computed(() => groupsState)

    // 在 setup 同步阶段获取注入，避免在运行时（setupItem 调用时）使用 inject 触发警告
    const injectedGetter = inject('getGraph', null)
    const injectedGraph = inject('mxGraph', null)

    /**
     * loadAll
     * 并行加载并注册所有 stencil 集合
     */
    async function loadAll() {
      for (const g of groupsState) {
        if (g.url) {
          await loadStencilSetAndEnumerate(g.url, g.items)
        }
      }
      ensureProgrammaticGroups()
      populateGeneral(groupsState.find(g => g.key === 'general')?.items)
      populateMisc(groupsState.find(g => g.key === 'misc')?.items)
      populateAdvanced(groupsState.find(g => g.key === 'advanced')?.items)
      // 自动展开第一个非空分组
      const firstNonEmpty = groupsState.find(g => g.items.length > 0)
      if (firstNonEmpty && openKey.value !== firstNonEmpty.key) {
        openKey.value = firstNonEmpty.key
      }
      // 对每个空的 stencil 分组做逐级回退：组件绝对路径 -> grapheditor 示例路径
      const compAbs = '/@fs/Users/alex/temp/mxgraph/javascript/examples/VueComponents/stencils/'
      const geAbs = '/@fs/Users/alex/temp/mxgraph/javascript/examples/grapheditor/www/stencils/'
      for (const g of groupsState) {
        if (!g.url) continue
        if (g.items.length > 0) continue
        const name = g.url.split('/').pop()
        if (!name) continue
        for (const base of [compAbs, geAbs]) {
          await loadStencilSetAndEnumerate(base + name, g.items)
          if (g.items.length > 0) break
        }
      }
      const firstNonEmpty2 = groupsState.find(g => g.items.length > 0)
      if (firstNonEmpty2) openKey.value = firstNonEmpty2.key
    }

    function ensureProgrammaticGroups() {
      const need = [
        { key: 'general', title: 'General' },
        { key: 'misc', title: 'Misc' },
        { key: 'advanced', title: 'Advanced' }
      ]
      need.forEach(n => {
        if (!groupsState.find(g => g.key === n.key)) {
          groupsState.push({ key: n.key, title: n.title, url: '', items: reactive([]) })
        }
      })
    }

    function styleForItem(it) {
      let s = it.style || (it.shapeKey ? ('shape=' + it.shapeKey + ';whiteSpace=wrap;html=1') : 'whiteSpace=wrap;html=1;')
      if (it.style && s.indexOf('shape=') === -1) {
        // 将首个裸标记 token; 归一化为 shape=token;
        const m = s.match(/^([a-zA-Z0-9_]+);/)
        if (m) s = s.replace(/^([a-zA-Z0-9_]+);/, 'shape=$1;')
      }
      return s
    }

    function populateGeneral(items) {
      if (!items) return
      const push = (label, w, h, style, value='') => items.push({ key: 'general.' + label, label, w, h, style, value })
      push('Rectangle', 120, 60, 'rounded=0;whiteSpace=wrap;html=1;')
      push('Rounded Rectangle', 120, 60, 'rounded=1;whiteSpace=wrap;html=1;')
      push('Text', 40, 20, 'text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;', 'Text')
      push('Ellipse', 120, 80, 'ellipse;whiteSpace=wrap;html=1;')
      push('Square', 80, 80, 'whiteSpace=wrap;html=1;aspect=fixed;')
      push('Circle', 80, 80, 'ellipse;whiteSpace=wrap;html=1;aspect=fixed;')
      push('Process', 120, 60, 'shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;')
      push('Diamond', 80, 80, 'rhombus;whiteSpace=wrap;html=1;')
      push('Parallelogram', 120, 60, 'shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;')
      push('Hexagon', 120, 80, 'shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;')
      push('Triangle', 60, 80, 'triangle;whiteSpace=wrap;html=1;')
      push('Cylinder', 60, 80, 'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;')
      push('Cloud', 120, 80, 'ellipse;shape=cloud;whiteSpace=wrap;html=1;')
      push('Document', 120, 80, 'shape=document;whiteSpace=wrap;html=1;boundedLbl=1;')
      push('Internal Storage', 80, 80, 'shape=internalStorage;whiteSpace=wrap;html=1;backgroundOutline=1;')
      push('Cube', 120, 80, 'shape=cube;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;darkOpacity=0.05;darkOpacity2=0.1;')
      push('Step', 120, 80, 'shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;')
      push('Trapezoid', 120, 60, 'shape=trapezoid;perimeter=trapezoidPerimeter;whiteSpace=wrap;html=1;fixedSize=1;')
      push('Tape', 120, 100, 'shape=tape;whiteSpace=wrap;html=1;')
      push('Note', 80, 100, 'shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;')
      push('Card', 80, 100, 'shape=card;whiteSpace=wrap;html=1;')
      push('Callout', 120, 80, 'shape=callout;whiteSpace=wrap;html=1;perimeter=calloutPerimeter;')
      push('Actor', 30, 60, 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;', 'Actor')
      push('Or', 60, 80, 'shape=xor;whiteSpace=wrap;html=1;')
      push('And', 60, 80, 'shape=or;whiteSpace=wrap;html=1;')
      push('Data Storage', 100, 80, 'shape=dataStorage;whiteSpace=wrap;html=1;fixedSize=1;')
    }

    function populateMisc(items) {
      if (!items) return
      const push = (label, w, h, style, value='') => items.push({ key: 'misc.' + label, label, w, h, style, value })
      push('Double Rectangle', 120, 80, 'shape=ext;double=1;rounded=0;whiteSpace=wrap;html=1;')
      push('Double Rounded Rectangle', 120, 80, 'shape=ext;double=1;rounded=1;whiteSpace=wrap;html=1;')
      push('Double Ellipse', 100, 60, 'ellipse;shape=doubleEllipse;whiteSpace=wrap;html=1;')
      push('Double Square', 80, 80, 'shape=ext;double=1;whiteSpace=wrap;html=1;aspect=fixed;')
      push('Double Circle', 80, 80, 'ellipse;shape=doubleEllipse;whiteSpace=wrap;html=1;aspect=fixed;')
      push('Rectangle Sketch', 120, 60, 'rounded=1;whiteSpace=wrap;html=1;strokeWidth=2;fillWeight=4;hachureGap=8;hachureAngle=45;fillColor=#1ba1e2;sketch=1;')
      push('Ellipse Sketch', 120, 60, 'ellipse;whiteSpace=wrap;html=1;strokeWidth=2;fillWeight=2;hachureGap=8;fillColor=#990000;fillStyle=dots;sketch=1;')
      push('Diamond Sketch', 120, 60, 'rhombus;whiteSpace=wrap;html=1;strokeWidth=2;fillWeight=-1;hachureGap=8;fillStyle=cross-hatch;fillColor=#006600;sketch=1;')
      push('Isometric Cube', 90, 100, 'html=1;whiteSpace=wrap;shape=isoCube2;backgroundOutline=1;isoAngle=15;')
      push('Isometric Square', 150, 90, 'html=1;whiteSpace=wrap;aspect=fixed;shape=isoRectangle;')
      push('Curly Bracket', 20, 120, 'shape=curlyBracket;whiteSpace=wrap;html=1;rounded=1;')
      push('Crossbar', 120, 20, 'shape=crossbar;whiteSpace=wrap;html=1;rounded=1;')
      // 去除依赖 gearImage 的示例，避免资源缺失导致缩略图异常
    }

    function populateAdvanced(items) {
      if (!items) return
      const push = (label, w, h, style, value='') => items.push({ key: 'advanced.' + label, label, w, h, style, value })
      push('Tape Data', 80, 80, 'shape=tapeData;whiteSpace=wrap;html=1;perimeter=ellipsePerimeter;')
      push('Manual Input', 80, 80, 'shape=manualInput;whiteSpace=wrap;html=1;')
      push('Loop Limit', 100, 80, 'shape=loopLimit;whiteSpace=wrap;html=1;')
      push('Off Page Connector', 80, 80, 'shape=offPageConnector;whiteSpace=wrap;html=1;')
      push('Delay', 80, 40, 'shape=delay;whiteSpace=wrap;html=1;')
      push('Display', 80, 40, 'shape=display;whiteSpace=wrap;html=1;')
      push('Arrow Left', 100, 60, 'shape=singleArrow;direction=west;whiteSpace=wrap;html=1;')
      push('Arrow Right', 100, 60, 'shape=singleArrow;whiteSpace=wrap;html=1;')
      push('Arrow Up', 60, 100, 'shape=singleArrow;direction=north;whiteSpace=wrap;html=1;')
      push('Arrow Down', 60, 100, 'shape=singleArrow;direction=south;whiteSpace=wrap;html=1;')
      push('Double Arrow', 100, 60, 'shape=doubleArrow;whiteSpace=wrap;html=1;')
      push('User', 40, 60, 'shape=actor;whiteSpace=wrap;html=1;')
      push('Cross', 80, 80, 'shape=cross;whiteSpace=wrap;html=1;')
      push('Corner', 80, 80, 'shape=corner;whiteSpace=wrap;html=1;')
      push('Tee', 80, 80, 'shape=tee;whiteSpace=wrap;html=1;')
      push('Data Store', 60, 60, 'shape=datastore;whiteSpace=wrap;html=1;')
      push('Or Ellipse', 80, 80, 'shape=orEllipse;perimeter=ellipsePerimeter;whiteSpace=wrap;html=1;backgroundOutline=1;')
      push('Sum Ellipse', 80, 80, 'shape=sumEllipse;perimeter=ellipsePerimeter;whiteSpace=wrap;html=1;backgroundOutline=1;')
      push('Ellipse H Divider', 80, 80, 'shape=lineEllipse;perimeter=ellipsePerimeter;whiteSpace=wrap;html=1;backgroundOutline=1;')
      push('Ellipse V Divider', 80, 80, 'shape=lineEllipse;line=vertical;perimeter=ellipsePerimeter;whiteSpace=wrap;html=1;backgroundOutline=1;')
      push('Sort', 80, 80, 'shape=sortShape;perimeter=rhombusPerimeter;whiteSpace=wrap;html=1;')
      push('Collate', 80, 80, 'shape=collate;whiteSpace=wrap;html=1;')
      push('Switch', 60, 60, 'shape=switch;whiteSpace=wrap;html=1;')
      push('Container', 200, 200, 'swimlane;')
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
      const g = (props.getGraph && props.getGraph()) || (injectedGetter && injectedGetter()) || injectedGraph
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
          g.insertVertex(parent, null, item.value || '', pt.x, pt.y, item.w, item.h, styleForItem(item))
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
      try { g.insertVertex(g.getDefaultParent(), null, item.value || '', 0, 0, item.w, item.h, styleForItem(item)) }
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
      // 先加载并渲染缩略图（不依赖外部 graph）
      await loadAll()
      await nextTick()
      // 拖拽绑定将由 setupItem 在 graph 可用时自动完成
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
