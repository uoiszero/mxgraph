# mxGraph Vue 组件库

> 基于 mxGraph 的 Vue 3 组件封装，包含画布、图形素材侧栏、样式编辑器和 XML 编辑对话框，便于在 Vue 应用中快速构建可交互的图编辑体验。

## 功能特性
- 画布组件 `MxGraphCanvas`：自动加载 `mxClient.js`，启用框选、拖拽、连接、撤销/重做、删除快捷键等常用交互
- 素材侧栏 `MxStencilSidebar`：内置基础/流程图/BPMN/箭头等 stencil 集合，支持拖拽到画布，边类图形自动创建隐形端点
- 样式编辑器 `MxStyleEditor`：读取/编辑选中边的样式，支持形状类型、箭头样式、线宽、圆角、虚线、填充色等
- XML 编辑对话框 `MxEditDialog`：查看并覆盖当前图的 XML，便于调试与导入导出
- 边拐点增强：右键添加/删除拐点；虚拟手柄单击快速插入拐点

## 目录结构
- `src/`
  - `MxGraphCanvas.vue`：画布与交互、撤销管理、快捷键、拐点增强
  - `MxStencilSidebar.vue`：素材分组、缩略图渲染、拖拽绑定、自定义 stencil 加载
  - `MxStyleEditor.vue`：读取/应用样式字段与文本、箭头/形状类型切换
  - `MxEditDialog.vue`：图模型 XML 查看/应用
  - `utils.js`：`ensureMxClient` 动态加载 `mxClient.js` 与可选 Grapheditor 扩展
- `vendor/`
  - `mxgraph/js/*` 与 `mxgraph/images/*`：运行时资源（由脚本复制）
  - `ge/Shapes.js`：Grapheditor 扩展形状注册脚本（可选）
- `stencils/*.xml`：示例 stencil 集合（基础、流程图、BPMN、箭头）
- `index.js`：导出组件与插件（`install` 注册）

## 安装与准备
- 依赖：`vue@^3.3.0`
- 克隆后执行：

```bash
npm install
npm run prepare:assets  # 复制 mxGraph 运行时与示例 stencils 到 vendor/stencils
```

- 构建/开发：

```bash
npm run dev   # 以库模式（rslib）进行开发构建（监听）
npm run build # 产出 ESM/CJS 至 dist/
```

> 说明：本目录以库形式输出（见 `rslib.config.ts`），不包含演示页面；可在外部应用中引用或在本仓库其他示例中集成。

## 使用方式
### 1) 作为插件全局注册
`index.js` 默认导出一个带有 `install` 的插件，可直接全局注册：

```js
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import MxComponents from './javascript/examples/VueComponents/index.js'

const app = createApp(App)
app.use(MxComponents)
app.mount('#app')
```

在组件中使用：

```vue
<!-- App.vue -->
<template>
  <div class="wrap">
    <aside class="left"><MxStencilSidebar /></aside>
    <main class="center">
      <MxGraphCanvas :width="900" :height="560" @ready="onReady" />
    </main>
    <aside class="right"><MxStyleEditor /></aside>
    <MxEditDialog :visible="showXml" @close="showXml=false" />
  </div>
</template>

<script setup>
import { ref } from 'vue'

/* 函数注释：onReady
 * 组件挂载并初始化完成时触发，拿到 mxGraph 实例以便调试或与外部交互
 */
function onReady(graph) {
  window.__graph = graph
}

const showXml = ref(false)
</script>

<style scoped>
.wrap { display: grid; grid-template-columns: 260px 1fr 300px; gap: 12px; }
.left, .right { overflow: auto; }
.center { overflow: auto; }
</style>
```

- `MxGraphCanvas` 会通过 `provide` 注入 `getGraph` 与图实例引用，`MxStencilSidebar` 与 `MxStyleEditor` 可自动获取，无需显式传参。

### 2) 按需导入单个组件
如需手动控制实例传递，也可按需导入：

```js
import { MxGraphCanvas, MxStencilSidebar, MxStyleEditor, MxEditDialog } from './javascript/examples/VueComponents/index.js'
```

```vue
<template>
  <MxGraphCanvas ref="canvas" @ready="onReady" />
  <MxStencilSidebar :getGraph="getGraph" />
  <MxStyleEditor :getGraph="getGraph" />
</template>

<script setup>
import { ref } from 'vue'
const canvas = ref(null)

/* 函数注释：getGraph
 * 通过暴露方法获取当前 mxGraph 实例，供兄弟组件传递使用
 */
function getGraph() {
  return canvas.value?.getGraph()
}

/* 函数注释：onReady
 * 初始化完成回调（可选），此处仅示例记录实例
 */
function onReady(graph) {
  console.log('graph ready', graph)
}
</script>
```

## 组件 API
### MxGraphCanvas
- `props`
  - `autoLoad:boolean` 默认 `true`，是否自动加载 `mxClient.js`
  - `mxClientUrl:string` 可选，指定 `mxClient.js` 地址（不传则使用内置 `vendor/mxgraph`）
  - `mxBasePath:string`、`mxImageBasePath:string` 可选，资源与图片目录（通常无需设置）
  - `width:number|string` 画布宽度，默认 `100%`
  - `height:number|string` 画布高度，默认 `480`
  - `initSample:boolean` 是否插入示例顶点与边，默认 `true`
- `emits`
  - `ready(graph)` 初始化完成后回调，传出 `mxGraph` 实例
- `expose`
  - `getGraph()`、`undo()`、`redo()`、`deleteSelection()`
- 快捷键：`Ctrl/Cmd+Z` 撤销、`Ctrl+Shift+Z`（Mac）/`Ctrl+Y`（Win）重做、`Delete/Backspace` 删除
- 边增强：右键菜单添加/删除拐点；虚拟手柄单击直接插入拐点

### MxStencilSidebar
- `props`
  - `stencils:Array` 自定义集合：`[{ key,title,url }]`，否则加载内置 `stencils/*.xml`
  - `accordion:boolean` 风琴开关，默认 `true`
  - `defaultOpenKey:string` 初始展开分组，默认 `basic`
- 说明：边类图形（`shape=flexArrow` / `shape=link`）拖入画布时，会创建两个隐形 `point` 顶点并插入一条边，便于手柄与箭头参数控制

### MxStyleEditor
- `props`
  - `getGraph:Function` 可选，未传则自动从 `MxGraphCanvas` 注入获取
- 能力：
  - 文本样式：直接覆盖 `style` 字符串
  - 字段样式：形状类型（`connection/link/flexArrow/arrow`）、箭头样式（无/仅起始/仅末端/两端）、`width`、`strokeWidth`、`strokeColor`、`dashed`、`rounded`、`startSize/endSize`、`startWidth/endWidth`、`fillColor`
  - 自动读取当前选中边并显示默认值提示（依据形状与笔画宽度计算）

### MxEditDialog
- `props`
  - `visible:boolean` 是否显示
  - `getGraphFn:Function` 可选，未传则自动注入获取
- `emits`
  - `close` 关闭对话框
  - `applied` 成功应用 XML 后触发

## 资源与加载
- 组件默认从本目录 `vendor/mxgraph/js/mxClient.js` 加载运行时，并设置 `mxBasePath` 与 `mxImageBasePath`
- 如需使用外部托管的 mxGraph，请给 `MxGraphCanvas` 传入：

```vue
<MxGraphCanvas :mxClientUrl="'https://your.cdn/mxgraph/js/mxClient.js'" />
```

## 常见问题
- 缩略图异常：请先执行 `npm run prepare:assets`，确保 `vendor/mxgraph` 与 `stencils/*` 完整
- 形状句柄缺失：`vendor/ge/Shapes.js` 未加载或资源不匹配，重新执行资产复制脚本或检查路径

## 许可
本目录为示例组件封装，遵循上游 mxGraph 许可；在商用场景中请遵守相关开源协议与资产版权要求。