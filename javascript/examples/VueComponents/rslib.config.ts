import { defineConfig } from '@rslib/core';
import { pluginVue } from '@rsbuild/plugin-vue';

export default defineConfig({
  source: {
    entry: {
      index: './index.js',
    },
  },
  lib: [
    { format: 'esm', syntax: 'es2021' },
    { format: 'cjs', syntax: 'es2021' },
  ],
  output: {
    target: 'web',
    externals: ['vue'],
  },
  plugins: [pluginVue()],
});