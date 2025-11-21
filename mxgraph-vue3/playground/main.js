import { createApp } from 'vue'
import App from './App.vue'
import MyLib from '../src/index.js'

/**
 * 启动本地调试应用
 * @returns {void}
 */
function bootstrap() {
  const app = createApp(App)
  app.use(MyLib)
  app.mount('#app')
}

bootstrap()