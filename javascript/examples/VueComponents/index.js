import MxGraphCanvas from './src/MxGraphCanvas.vue'
import MxStencilSidebar from './src/MxStencilSidebar.vue'

export { MxGraphCanvas, MxStencilSidebar }

export default {
  install(app) {
    app.component('MxGraphCanvas', MxGraphCanvas)
    app.component('MxStencilSidebar', MxStencilSidebar)
  }
}
