import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

// 允许从工程外部读取 mxGraph 源码
const mxSrc = path.resolve(__dirname, '../../src')
const projectRoot = __dirname
const stencilsDir = path.resolve(__dirname, '../grapheditor/www/stencils')

export default defineConfig({
  plugins: [vue()],
  server: {
    fs: {
      allow: [mxSrc, projectRoot, stencilsDir]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
