<template>
  <div ref="container" :style="containerStyle"></div>
</template>

<script>
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import { ensureMxClient } from './utils'

export default {
  name: 'MxGraphCanvas',
  props: {
    autoLoad: { type: Boolean, default: true },
    mxClientUrl: { type: String, default: '' },
    mxBasePath: { type: String, default: '' },
    mxImageBasePath: { type: String, default: '' },
    width: { type: [Number, String], default: '100%' },
    height: { type: [Number, String], default: 480 },
    initSample: { type: Boolean, default: true }
  },
  emits: ['ready'],
  setup(props, { emit, expose }) {
    const container = ref(null)
    let graph = null
    let rubberband = null

    const containerStyle = computed(() => ({
      width: typeof props.width === 'number' ? props.width + 'px' : props.width,
      height: typeof props.height === 'number' ? props.height + 'px' : props.height,
      border: '1px dashed #cbd5e1'
    }))

    /**
     * initGraph
     * 初始化 mxGraph 图形实例并启用常用交互
     */
    function initGraph() {
      if (!window.mxClient) throw new Error('mxClient 未加载')
      if (!mxClient.isBrowserSupported()) {
        mxUtils.error('当前浏览器不支持 mxGraph', 200, false)
        return
      }
      const el = container.value
      el.innerHTML = ''
      graph = new mxGraph(el)
      rubberband = new mxRubberband(graph)
      new mxCellTracker(graph)
      graph.setPanning(true)
      graph.setConnectable(true)
      graph.setTooltips(true)
      graph.setCellsResizable(true)

      if (props.initSample) {
        const parent = graph.getDefaultParent()
        graph.getModel().beginUpdate()
        try {
          const v1 = graph.insertVertex(parent, null, 'Hello', 40, 40, 80, 30)
          const v2 = graph.insertVertex(parent, null, 'mxGraph', 200, 150, 100, 40)
          graph.insertEdge(parent, null, 'Edge', v1, v2)
        } finally {
          graph.getModel().endUpdate()
        }
      }
      emit('ready', graph)
    }

    /**
     * getGraph
     * 返回 mxGraph 实例
     */
    function getGraph() {
      return graph
    }

    onMounted(async () => {
      if (props.autoLoad) {
        await ensureMxClient({
          mxClientUrl: props.mxClientUrl,
          mxBasePath: props.mxBasePath,
          mxImageBasePath: props.mxImageBasePath
        })
      }
      initGraph()
    })

    onBeforeUnmount(() => {
      rubberband = null
      graph = null
    })

    expose({ getGraph })
    return { container, containerStyle }
  }
}
</script>

