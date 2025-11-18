/* * title: MxVueFlowDemo.vue * author: Yue Ao * date: 2025-11-18 11:06:45 */
<template>
  <div class="flow-panel">
    <div class="toolbar">
      <button @click="resetFlow">重置</button>
      <button @click="addSample">添加示例</button>
      <button @click="addNode">添加节点</button>
      <button @click="connectLastTwo">连接最近两个</button>
    </div>

    <div class="flow-canvas">
      <VueFlow
        :nodes="nodes"
        :edges="edges"
        fit-view
        @node-click="onNodeClick"
      >
        
        <Panel position="bottom-right">{{ infoText }}</Panel>
      </VueFlow>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { VueFlow, Panel } from "@vue-flow/core";

const nodes = ref([]);
const edges = ref([]);
const infoText = ref("点击节点查看信息");
const nodeStyle = { border: '1px solid #94a3b8', padding: '8px 12px', borderRadius: '6px', background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' };

/**
 * 重置画布：清空所有节点与连线
 */
function resetFlow() {
  nodes.value = [];
  edges.value = [];
  infoText.value = "已重置";
}

/**
 * 添加示例：创建基础 4 节点与 3 条连线
 */
function addSample() {
  nodes.value = [
    { id: "A", label: "A", position: { x: 50, y: 80 }, style: nodeStyle },
    { id: "B", label: "B", position: { x: 220, y: 80 }, style: nodeStyle },
    { id: "C", label: "C", position: { x: 390, y: 80 }, style: nodeStyle },
    { id: "D", label: "D", position: { x: 220, y: 220 }, style: nodeStyle },
  ];
  edges.value = [
    { id: "e1", source: "A", target: "B" },
    { id: "e2", source: "B", target: "C" },
    { id: "e3", source: "B", target: "D" },
  ];
  infoText.value = "已添加示例";
}

/**
 * 添加随机节点：在画布范围内创建一个新节点
 */
function addNode() {
  const id = `N${nodes.value.length + 1}`;
  const x = Math.round(40 + Math.random() * 420);
  const y = Math.round(40 + Math.random() * 260);
  nodes.value = [...nodes.value, { id, label: id, position: { x, y }, style: nodeStyle }];
  infoText.value = `已添加节点 ${id}`;
}

/**
 * 连接最近两个节点：若存在至少两个节点，则按添加顺序连接最后两个
 */
function connectLastTwo() {
  if (nodes.value.length < 2) return;
  const a = nodes.value[nodes.value.length - 2].id;
  const b = nodes.value[nodes.value.length - 1].id;
  const id = `e-${a}-${b}-${edges.value.length + 1}`;
  edges.value = [...edges.value, { id, source: a, target: b }];
  infoText.value = `已连接 ${a} -> ${b}`;
}

/**
 * 节点点击回调：展示被点击节点的基础信息
 */
function onNodeClick({ node }) {
  infoText.value = `选中节点 ${node.id}`;
}
</script>

<style scoped>

.flow-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
button {
  padding: 6px 12px;
  border: 1px solid #94a3b8;
  border-radius: 4px;
  background: #f8fafc;
  cursor: pointer;
}
button:hover {
  background: #eef2f7;
}
.flow-canvas {
  height: 400px;
  border: 1px dashed #cbd5e1;
}
</style>
