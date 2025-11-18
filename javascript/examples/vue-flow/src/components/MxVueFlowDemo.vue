/* * title: MxVueFlowDemo.vue * author: Yue Ao * date: 2025-11-18 11:06:45 */
<template>
  <div class="flow-panel">
    <div class="toolbar">
      <button @click="resetFlow">重置</button>
      <button @click="addSample">添加示例</button>
      <button @click="addNode">添加节点</button>
      <button @click="connectLastTwo">连接最近两个</button>
      <button @click="addWaypoint">添加拐点</button>
      <span class="spacer" />
      <label>线宽
        <input type="number" min="2" max="32" v-model.number="flexOpts.shaftWidth" @change="applyFlexOpts" />
      </label>
      <label>箭头大小
        <input type="number" min="6" max="64" v-model.number="flexOpts.headLength" @change="applyFlexOpts" />
      </label>
      <label>箭头形状
        <select v-model="flexOpts.headType" @change="applyFlexOpts">
          <option value="triangle">triangle</option>
          <option value="diamond">diamond</option>
          <option value="concave">concave</option>
          <option value="classic">classic</option>
        </select>
      </label>
      <label>变体
        <select v-model="flexOpts.variant" @change="applyFlexOpts">
          <option value="arrow">arrow</option>
          <option value="connections">connections</option>
          <option value="link">link</option>
          <option value="simple">simple</option>
        </select>
      </label>
      <label>箭头宽度
        <input type="number" min="4" max="64" v-model.number="flexOpts.headWidth" @change="applyFlexOpts" />
      </label>
      <label>栅格
        <input type="number" min="2" max="64" v-model.number="flexOpts.grid" @change="applyFlexOpts" />
      </label>
      <label>
        <input type="checkbox" v-model="flexOpts.angleSnap" @change="applyFlexOpts" /> 45°吸附
      </label>
      <label>
        <input type="checkbox" v-model="flexOpts.gridSnap" @change="applyFlexOpts" /> 栅格吸附
      </label>
    </div>

    <div class="flow-canvas">
      <VueFlow
        :nodes="nodes"
        :edges="edges"
        :edge-types="edgeTypes"
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
import MxFlexArrowEdge from './MxFlexArrowEdge.vue'

const nodes = ref([]);
const edges = ref([]);
const infoText = ref("点击节点查看信息");
const nodeStyle = { border: '1px solid #94a3b8', padding: '8px 12px', borderRadius: '6px', background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' };
const edgeTypes = { 'mx-flex-arrow': MxFlexArrowEdge }
const callbacks = {
  /** 更新拐点坐标 */
  onUpdatePoint: (edgeId, idx, pt) => {
    const e = edges.value.find(e => e.id === edgeId)
    if (!e) return
    const pts = Array.isArray(e.data?.points) ? e.data.points.slice() : []
    pts[idx] = pt
    e.data = { ...(e.data || {}), points: pts }
    edges.value = [...edges.value]
  },
  /** 添加拐点 */
  onAddPoint: (edgeId, pt, segIndex) => {
    const e = edges.value.find(e => e.id === edgeId)
    if (!e) return
    const pts = Array.isArray(e.data?.points) ? e.data.points.slice() : []
    const insertIdx = typeof segIndex === 'number' ? Math.max(0, Math.min(pts.length, segIndex)) : pts.length
    pts.splice(insertIdx, 0, pt)
    e.data = { ...(e.data || {}), points: pts }
    edges.value = [...edges.value]
    infoText.value = '已添加拐点'
  },
  /** 移除拐点 */
  onRemovePoint: (edgeId, idx) => {
    const e = edges.value.find(e => e.id === edgeId)
    if (!e) return
    const pts = Array.isArray(e.data?.points) ? e.data.points.slice() : []
    if (idx >= 0 && idx < pts.length) pts.splice(idx, 1)
    e.data = { ...(e.data || {}), points: pts }
    edges.value = [...edges.value]
    infoText.value = '已移除拐点'
  },
  /** 调整箭头参数（长度/宽度等） */
  onUpdateArrow: (edgeId, payload) => {
    const e = edges.value.find(e => e.id === edgeId)
    if (!e) return
    e.data = { ...(e.data || {}), ...payload }
    edges.value = [...edges.value]
    infoText.value = '已更新箭头参数'
  }
}
const flexOpts = ref({ stroke: '#334155', shaftWidth: 12, headLength: 18, headWidth: 12, headType: 'triangle', variant: 'arrow', join: 'round', grid: 8, gridSnap: false, angleSnap: false, points: [], showGuides: true, angleStep: 45, taperLength: 24, miterLimit: 4, ...callbacks })

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
    { id: "e1", source: "A", target: "B", type: 'mx-flex-arrow', data: { ...flexOpts.value, ...callbacks } },
    { id: "e2", source: "B", target: "C", type: 'mx-flex-arrow', data: { ...flexOpts.value, ...callbacks } },
    { id: "e3", source: "B", target: "D", type: 'mx-flex-arrow', data: { ...flexOpts.value, ...callbacks } },
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
  edges.value = [...edges.value, { id, source: a, target: b, type: 'mx-flex-arrow', data: { ...flexOpts.value, ...callbacks } }];
  infoText.value = `已连接 ${a} -> ${b}`;
}

/**
 * 节点点击回调：展示被点击节点的基础信息
 */
function onNodeClick({ node }) {
  infoText.value = `选中节点 ${node.id}`;
}

/**
 * 添加拐点：在最后一条边的中点添加一个控制点
 */
function addWaypoint() {
  if (edges.value.length === 0) return;
  const e = edges.value[edges.value.length - 1];
  const src = nodes.value.find(n => n.id === e.source);
  const tgt = nodes.value.find(n => n.id === e.target);
  if (!src || !tgt) return;
  const px = Math.round((src.position.x + tgt.position.x) / 2);
  const py = Math.round((src.position.y + tgt.position.y) / 2);
  const pts = Array.isArray(e.data?.points) ? e.data.points : [];
  e.data = { ...e.data, points: [...pts, { x: px, y: py }] };
  edges.value = [...edges.value];
  infoText.value = '已添加拐点';
}

/**
 * 应用样式：更新所有边的箭头参数
 */
function applyFlexOpts() {
  edges.value = edges.value.map(e => ({ ...e, data: { ...(e.data || {}), ...flexOpts.value, ...callbacks } }));
  infoText.value = '已应用样式';
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
.toolbar label { font-size: 12px; color: #334155; display: inline-flex; align-items: center; gap: 4px; }
.toolbar .spacer { width: 12px; }
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
