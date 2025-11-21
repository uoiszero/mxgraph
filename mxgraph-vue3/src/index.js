import MxGraph from './MxGraph.vue'
import MxStyleEditor from './MxStyleEditor.vue'
import MxToolbar from './MxToolbar.vue'
import MxSidebar from './MxSidebar.vue'

/**
 * 安装插件并全局注册组件
 * @param {import('vue').App} app Vue应用实例
 * @returns {void}
 */
function install(app) {
  app.component('MxGraph', MxGraph)
  app.component('MxStyleEditor', MxStyleEditor)
  app.component('MxToolbar', MxToolbar)
  app.component('MxSidebar', MxSidebar)
}

export { MxGraph, MxStyleEditor, MxToolbar, MxSidebar }

export default { install }