import { defineConfig } from '@rslib/core'
import { pluginVue } from '@rsbuild/plugin-vue'

export default defineConfig({
  plugins: [pluginVue()],
  lib: [
    { format: 'esm', bundle: true },
    { format: 'cjs', bundle: true }
  ],
  source: {
    entry: {
      index: './src/index.js'
    }
  },
  output: {
    externals: ['vue'],
    distPath: { root: 'dist' }
  }
})