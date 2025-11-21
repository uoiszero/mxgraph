<template>
  <main>
    <h1>组件开发调试页</h1>
    <MxToolbar :mxGraph="graphInstance" :mx="mxObj" />
    <section class="grid">
      <div class="card">
        <div class="card-header">侧边栏</div>
        <div class="card-body">
          <MxSidebar :mxGraph="graphInstance" :mx="mxObj" />
        </div>
      </div>
      <div class="card">
        <div class="card-header">画布</div>
        <div class="card-body">
          <MxGraph ref="mxRef" :cells="cells" :height="420" @ready="onReady" />
        </div>
      </div>
      <div class="card">
        <div class="card-header">样式编辑器</div>
        <div class="card-body">
          <MxStyleEditor :mxGraph="graphInstance" :mx="mxObj" />
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref , computed } from 'vue'

/**
 * 返回测试图形 cells 数据
 * @returns {Array}
 */
function getTestCells() {
  return [
    // 矩形
    { type: 'vertex', id: 'rect', label: '矩形', x: 20, y: 30, w: 100, h: 40 },
    // 椭圆
    { type: 'vertex', id: 'ellipse', label: '椭圆', x: 160, y: 30, w: 100, h: 60, style: 'shape=ellipse;perimeter=ellipsePerimeter;fillColor=#d1fae5;strokeColor=#10b981' },
    // 菱形
    { type: 'vertex', id: 'rhombus', label: '菱形', x: 300, y: 30, w: 100, h: 60, style: 'shape=rhombus;perimeter=rhombusPerimeter;fillColor=#fee2e2;strokeColor=#ef4444' },
    // 三角形
    { type: 'vertex', id: 'triangle', label: '三角形', x: 450, y: 30, w: 100, h: 60, style: 'shape=triangle;perimeter=trianglePerimeter;fillColor=#e0f2fe;strokeColor=#3b82f6' },
    // 六边形
    { type: 'vertex', id: 'hex', label: '六边形', x: 600, y: 30, w: 110, h: 60, style: 'shape=hexagon;perimeter=hexagonPerimeter;fillColor=#fef3c7;strokeColor=#f59e0b' },
    // 云朵
    { type: 'vertex', id: 'cloud', label: '云朵', x: 760, y: 30, w: 120, h: 70, style: 'shape=cloud;fillColor=#f5f3ff;strokeColor=#8b5cf6' },

    // 连线示例
    { type: 'edge', id: 'e-rect-ellipse', source: 'rect', target: 'ellipse', label: '连接' },
    { type: 'edge', id: 'e-ellipse-rhombus', source: 'ellipse', target: 'rhombus' },
    { type: 'edge', id: 'e-rhombus-triangle', source: 'rhombus', target: 'triangle' },
    { type: 'edge', id: 'e-triangle-hex', source: 'triangle', target: 'hex' },
    { type: 'edge', id: 'e-hex-cloud', source: 'hex', target: 'cloud' }
  ]
}

const cells = ref(getTestCells())
const mxRef = ref(null)
const mxObj = ref(null)
const mxGraph = ref(null);

/**
 * MxGraph ready 事件处理，设置可连接、样式等
 * @param {{graph:any, mx:any}} payload
 * @returns {void}
 */
  function onReady(payload) {
    const { graph, mx } = payload
    mxGraph.value = graph;
    graph.setConnectable(true)
    graph.setPanning(true)
    graph.panningHandler.useLeftButtonForPanning = true
    const style = graph.getStylesheet().getDefaultVertexStyle()
    style[mx.mxConstants.STYLE_FONTSIZE] = 12
    mxObj.value = mx
  }

  const graphInstance = computed(()=> mxGraph.value)
</script>

<style scoped>
main {
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto,
    Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
  padding: 24px;
}
h1 {
  margin-bottom: 12px;
}
.grid { display: grid; grid-template-columns: 300px 1fr 400px; gap: 16px; }
.card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.card-header { padding: 8px 12px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; font-weight: 600; }
.card-body { padding: 12px; }
</style>