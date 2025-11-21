import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  root: 'playground',
  server: {
    port: 5174,
    open: true
  },
  resolve: {
    alias: {
      '@lib': '/src'
    }
  }
})

