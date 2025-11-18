<template>
  <g>
    <path
      :d="bodyPath"
      :stroke="stroke"
      :stroke-width="variantStrokeWidth"
      :stroke-linejoin="join"
      stroke-linecap="round"
      fill="none"
      :stroke-opacity="variantStrokeOpacity"
      @dblclick.stop="addPointAt"
      @mousedown.stop="onPathMouseDown"
    />
    <polygon v-if="variantFill" :points="shaftPolygon" :fill="stroke" :stroke="stroke" />
    <polygon v-if="variantHasEnd" :points="arrowPoints" :fill="stroke" :stroke="stroke" />
    <polygon v-if="variantHasStart" :points="startArrowPoints" :fill="stroke" :stroke="stroke" />

    <g v-for="(p, i) in points" :key="i">
      <circle
        :cx="p.x"
        :cy="p.y"
        r="14"
        style="opacity: 0; pointer-events: all; cursor: grab;"
        @mousedown.stop.prevent="startDrag(i, $event)"
        @contextmenu.prevent="removePoint(i)"
        @dblclick.stop="removePoint(i)"
        @click.stop="selectPoint(i)"
      />
      <circle
        :cx="p.x"
        :cy="p.y"
        r="8"
        fill="#fff"
        :stroke="stroke"
        stroke-width="2"
        style="cursor: grab;"
        @mousedown.stop.prevent="startDrag(i, $event)"
        @contextmenu.prevent="removePoint(i)"
        @dblclick.stop="removePoint(i)"
        @click.stop="selectPoint(i)"
      />
    </g>

    <g v-if="guideVisible">
      <line :x1="guideRef.x" :y1="guideRef.y" :x2="guideSnap.x" :y2="guideSnap.y" stroke="#64748b" stroke-width="1" stroke-dasharray="4 3" />
      <circle :cx="guideSnap.x" :cy="guideSnap.y" r="3" fill="#64748b" />
      <text v-if="hintText" :x="guideSnap.x + 8" :y="guideSnap.y - 8" font-size="12" fill="#334155">{{ hintText }}</text>
    </g>

    <g v-if="handlesVisible">
      <circle
        :cx="base.x"
        :cy="base.y"
        r="14"
        style="opacity: 0; pointer-events: all; cursor: ns-resize;"
        @mousedown.stop.prevent="startHandleDrag('length', $event)"
      />
      <circle
        :cx="base.x"
        :cy="base.y"
        r="8"
        fill="#fef3c7"
        stroke="#b45309"
        stroke-width="2"
        style="cursor: ns-resize;"
        @mousedown.stop.prevent="startHandleDrag('length', $event)"
      />
      <circle
        :cx="widthHandle.x"
        :cy="widthHandle.y"
        r="14"
        style="opacity: 0; pointer-events: all; cursor: ew-resize;"
        @mousedown.stop.prevent="startHandleDrag('width', $event)"
      />
      <circle
        :cx="widthHandle.x"
        :cy="widthHandle.y"
        r="8"
        fill="#cffafe"
        stroke="#0e7490"
        stroke-width="2"
        style="cursor: ew-resize;"
        @mousedown.stop.prevent="startHandleDrag('width', $event)"
      />
      <circle
        :cx="shaftHandle.x"
        :cy="shaftHandle.y"
        r="14"
        style="opacity: 0; pointer-events: all; cursor: ew-resize;"
        @mousedown.stop.prevent="startHandleDrag('shaft', $event)"
      />
      <circle
        :cx="shaftHandle.x"
        :cy="shaftHandle.y"
        r="8"
        fill="#ede9fe"
        stroke="#6d28d9"
        stroke-width="2"
        style="cursor: ew-resize;"
        @mousedown.stop.prevent="startHandleDrag('shaft', $event)"
      />
    </g>
  </g>
</template>

<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'
import { useVueFlow } from '@vue-flow/core'

const props = defineProps({
  id: { type: String, required: true },
  sourceX: { type: Number, required: true },
  sourceY: { type: Number, required: true },
  targetX: { type: Number, required: true },
  targetY: { type: Number, required: true },
  data: { type: Object, default: () => ({}) }
})

/**
 * 计算箭身路径（基于折线）与箭头顶点
 * 输入：起止点 + 可选拐点；样式：shaftWidth、headLength、headType、stroke、join
 */
const geometry = computed(() => {
  const points = Array.isArray(props.data?.points) ? props.data.points : []
  const shaftWidth = Math.max(2, Number(props.data?.shaftWidth ?? 12))
  const headLength = Number(props.data?.headLength ?? 18)
  const headType = String(props.data?.headType ?? 'triangle')
  const headWidth = Number(props.data?.headWidth ?? shaftWidth)
  const taperLength = Number(props.data?.taperLength ?? Math.round(headLength * 0.6))
  const miterLimit = Number(props.data?.miterLimit ?? 4)

  const sx = props.sourceX, sy = props.sourceY
  const tx = props.targetX, ty = props.targetY

  const pathPts = [[sx, sy], ...points.map(p => [p.x, p.y]), [tx, ty]]
  const bodyPath = 'M ' + pathPts.map(([x, y]) => `${x} ${y}`).join(' L ')

  // 最后一段的方向
  const lastA = pathPts[pathPts.length - 2]
  const lastB = pathPts[pathPts.length - 1]
  const dx = lastB[0] - lastA[0]
  const dy = lastB[1] - lastA[1]
  const len = Math.max(1, Math.hypot(dx, dy))
  const ux = dx / len
  const uy = dy / len

  const nx = -uy
  const ny = ux

  // 箭头基线点（距离终点 headLength）
  const headLengthEff = Math.max(6, headLength)
  const headWidthEff = Math.max(4, headWidth)
  const bx = lastB[0] - ux * headLengthEff
  const by = lastB[1] - uy * headLengthEff

  // 箭头形状
  let arrowPtsArr = []
  const halfShaft = shaftWidth / 2
  const halfHead = headWidthEff / 2
  const tipx = lastB[0], tipy = lastB[1]
  const leftBase = { x: bx + nx * halfHead, y: by + ny * halfHead }
  const rightBase = { x: bx - nx * halfHead, y: by - ny * halfHead }
  if (headType === 'diamond') {
    const backx = bx - ux * headLengthEff
    const backy = by - uy * headLengthEff
    arrowPtsArr = [
      [leftBase.x, leftBase.y],
      [tipx, tipy],
      [rightBase.x, rightBase.y],
      [backx, backy]
    ]
  } else if (headType === 'concave') {
    const notchx = bx - ux * (headLengthEff * 0.45)
    const notchy = by - uy * (headLengthEff * 0.45)
    arrowPtsArr = [
      [leftBase.x, leftBase.y],
      [tipx, tipy],
      [rightBase.x, rightBase.y],
      [notchx, notchy]
    ]
  } else if (headType === 'classic') {
    arrowPtsArr = [
      [leftBase.x, leftBase.y],
      [tipx, tipy],
      [rightBase.x, rightBase.y]
    ]
  } else {
    arrowPtsArr = [
      [leftBase.x, leftBase.y],
      [tipx, tipy],
      [rightBase.x, rightBase.y]
    ]
  }

  function isFinitePts(arr) {
    return arr.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
  }

  if (!isFinitePts(arrowPtsArr)) {
    arrowPtsArr = [
      [bx + nx * halfHead, by + ny * halfHead],
      [tipx, tipy],
      [bx - nx * halfHead, by - ny * halfHead]
    ]
  }
  const arrowPoints = arrowPtsArr.map(([x, y]) => `${x},${y}`).join(' ')

  // 计算起点箭头（用于 connections 变体）
  let startArrowPtsArr = []
  if (variant === 'connections') {
    // 起点方向
    const s1 = pathPts[1]
    const dxs = s1[0] - sx
    const dys = s1[1] - sy
    const lens = Math.max(1, Math.hypot(dxs, dys))
    const usx = dxs / lens
    const usy = dys / lens
    const nsx = -usy
    const nsy = usx
    const sbx = sx + usx * headLengthEff
    const sby = sy + usy * headLengthEff
    const sleft = { x: sbx + nsx * halfHead, y: sby + nsy * halfHead }
    const sright = { x: sbx - nsx * halfHead, y: sby - nsy * halfHead }
    if (headType === 'diamond') {
      const sbackx = sbx + usx * headLengthEff
      const sbacky = sby + usy * headLengthEff
      startArrowPtsArr = [
        [sleft.x, sleft.y], [sx, sy], [sright.x, sright.y], [sbackx, sbacky]
      ]
    } else if (headType === 'concave') {
      const notchx = sbx + usx * (headLengthEff * 0.45)
      const notchy = sby + usy * (headLengthEff * 0.45)
      startArrowPtsArr = [
        [sleft.x, sleft.y], [sx, sy], [sright.x, sright.y], [notchx, notchy]
      ]
    } else {
      startArrowPtsArr = [
        [sleft.x, sleft.y], [sx, sy], [sright.x, sright.y]
      ]
    }
  }
  const startArrowPoints = startArrowPtsArr.map(([x, y]) => `${x},${y}`).join(' ')

  // 计算块箭身多边形：miter/bevel 连接 + 末段 taper 过渡到箭头宽度
  // 先插入 taper 控制点，使箭身宽度在末段过渡到箭头宽度
  const taperPts = pathPts.slice()
  const taperOffset = headLengthEff + Math.max(0, taperLength)
  const taperPx = lastB[0] - ux * taperOffset
  const taperPy = lastB[1] - uy * taperOffset
  taperPts.splice(taperPts.length - 1, 0, [taperPx, taperPy])
  const halfWidths = new Array(taperPts.length).fill(halfShaft)
  halfWidths[halfWidths.length - 2] = halfHead
  halfWidths[halfWidths.length - 1] = halfHead

  const segTangents = []
  const segNormals = []
  for (let i = 0; i < taperPts.length - 1; i++) {
    const ax = taperPts[i][0], ay = taperPts[i][1]
    const bx2 = taperPts[i+1][0], by2 = taperPts[i+1][1]
    const dx2 = bx2 - ax, dy2 = by2 - ay
    const l2 = Math.max(1, Math.hypot(dx2, dy2))
    segTangents.push([dx2 / l2, dy2 / l2])
    segNormals.push([-dy2 / l2, dx2 / l2])
  }

  /**
   * 计算顶点处的 miter 连接偏移，过尖则退化为 bevel
   */
  function miterJoin(i, offset) {
    if (i === 0) return [segNormals[0][0] * offset, segNormals[0][1] * offset]
    if (i === segNormals.length) return [segNormals[segNormals.length - 1][0] * offset, segNormals[segNormals.length - 1][1] * offset]
    const n1 = segNormals[i - 1]
    const n2 = segNormals[i]
    const m = [n1[0] + n2[0], n1[1] + n2[1]]
    const mLen = Math.hypot(m[0], m[1]) || 1
    const mUnit = [m[0] / mLen, m[1] / mLen]
    const denom = mUnit[0] * n2[0] + mUnit[1] * n2[1]
    const scale = denom !== 0 ? offset / denom : offset
    if (Math.abs(scale) > offset * miterLimit) {
      return [n2[0] * offset, n2[1] * offset]
    }
    return [mUnit[0] * scale, mUnit[1] * scale]
  }

  // taperPts 与 halfWidths 已在前面初始化

  const leftPoly = []
  const rightPoly = []
  for (let k = 0; k < taperPts.length; k++) {
    const [px, py] = taperPts[k]
    const off = miterJoin(k, halfWidths[k])
    leftPoly.push([px + off[0], py + off[1]])
    rightPoly.push([px - off[0], py - off[1]])
  }
  // 末端使用箭头基线左右点
  leftPoly[leftPoly.length - 1] = [leftBase.x, leftBase.y]
  rightPoly[rightPoly.length - 1] = [rightBase.x, rightBase.y]
  const poly = [...leftPoly, ...rightPoly.reverse()]
  const shaftPolygon = poly.map(([x, y]) => `${x},${y}`).join(' ')

  return { bodyPath, arrowPoints, startArrowPoints, shaftWidth, tip: { x: tipx, y: tipy }, base: { x: bx, y: by }, ux, uy, nx, ny, halfHead, shaftPolygon, variant }
})

/**
 * 提供渲染用属性（颜色与连接方式）
 */
const stroke = computed(() => props.data?.stroke ?? '#334155')
const join = computed(() => props.data?.join ?? 'round')
const bodyPath = computed(() => geometry.value.bodyPath)
const arrowPoints = computed(() => geometry.value.arrowPoints)
const startArrowPoints = computed(() => geometry.value.startArrowPoints)
const shaftWidth = computed(() => geometry.value.shaftWidth)
const shaftPolygon = computed(() => geometry.value.shaftPolygon)
const variant = computed(() => geometry.value.variant)
const variantFill = computed(() => variant.value === 'arrow' || variant.value === 'connections')
const variantHasEnd = computed(() => variant.value === 'arrow' || variant.value === 'connections' || variant.value === 'simple')
const variantHasStart = computed(() => variant.value === 'connections')
const variantStrokeOpacity = computed(() => 1)
const variantStrokeWidth = computed(() => (variant.value === 'link' || variant.value === 'simple') ? Math.max(1, shaftWidth.value / (variant.value === 'simple' ? 2 : 1)) : shaftWidth.value)
const points = computed(() => Array.isArray(props.data?.points) ? props.data.points : [])
const base = computed(() => geometry.value.base)
const tip = computed(() => geometry.value.tip)
const ux = computed(() => geometry.value.ux)
const uy = computed(() => geometry.value.uy)
const nx = computed(() => geometry.value.nx)
const ny = computed(() => geometry.value.ny)
const halfHead = computed(() => geometry.value.halfHead)
const widthHandle = computed(() => ({ x: base.value.x + nx.value * halfHead.value, y: base.value.y + ny.value * halfHead.value }))
const shaftHandle = computed(() => ({ x: base.value.x + nx.value * (shaftWidth.value / 2), y: base.value.y + ny.value * (shaftWidth.value / 2) }))

const dragIndex = ref(null)
const { project } = useVueFlow()
const selectedIndex = ref(null)
const guideVisible = ref(false)
const guideRef = ref({ x: 0, y: 0 })
const guideSnap = ref({ x: 0, y: 0 })
const handleDragType = ref(null)
const handlesVisible = computed(() => Boolean(props.data?.showHandles ?? true))
const hintText = ref('')
const dragOffset = ref({ x: 0, y: 0 })

/**
 * 开始拖拽拐点
 */
function startDrag(idx, ev) {
  dragIndex.value = idx
  selectedIndex.value = idx
  const pStart = project({ x: ev.clientX, y: ev.clientY })
  const curr = points.value[idx]
  dragOffset.value = { x: curr.x - pStart.x, y: curr.y - pStart.y }
  const ref = getRefPoint(idx)
  guideRef.value = { x: ref[0], y: ref[1] }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

/**
 * 拖拽过程中更新拐点坐标
 */
function onMove(ev) {
  if (dragIndex.value == null) return
  const raw = project({ x: ev.clientX, y: ev.clientY })
  const target = { x: raw.x + dragOffset.value.x, y: raw.y + dragOffset.value.y }
  const snapped = applySnap(target, ev)
  guideSnap.value = { x: snapped.x, y: snapped.y }
  guideVisible.value = Boolean(props.data?.showGuides ?? true)
  if (typeof props.data?.onUpdatePoint === 'function') {
    props.data.onUpdatePoint(props.id, dragIndex.value, { x: Math.round(snapped.x), y: Math.round(snapped.y) })
  }
}

/**
 * 结束拖拽，移除监听
 */
function onUp() {
  dragIndex.value = null
  guideVisible.value = false
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', onUp)
}

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', onUp)
})

/**
 * 在路径上双击添加一个新的拐点
 */
function addPointAt(ev) {
  const p = project({ x: ev.clientX, y: ev.clientY })
  const poly = bodyPolyline()
  const proj = projectToPolyline(p, poly)
  if (typeof props.data?.onAddPoint === 'function') {
    props.data.onAddPoint(props.id, { x: proj.x, y: proj.y }, proj.segIndex)
  }
}

/**
 * 支持 Shift+点击在路径上添加拐点
 */
function onPathMouseDown(ev) {
  if (!ev.shiftKey) return
  const p = project({ x: ev.clientX, y: ev.clientY })
  const poly = bodyPolyline()
  const proj = projectToPolyline(p, poly)
  if (typeof props.data?.onAddPoint === 'function') {
    props.data.onAddPoint(props.id, { x: proj.x, y: proj.y }, proj.segIndex)
  }
}

/**
 * 移除指定索引的拐点
 */
function removePoint(idx) {
  if (typeof props.data?.onRemovePoint === 'function') {
    props.data.onRemovePoint(props.id, idx)
  }
}

/**
 * 选择拐点，支持 Delete 删除
 */
function selectPoint(idx) {
  selectedIndex.value = idx
}

window.addEventListener('keydown', (ev) => {
  if ((ev.key === 'Delete' || ev.key === 'Backspace') && selectedIndex.value != null) {
    removePoint(selectedIndex.value)
    selectedIndex.value = null
  }
})

/**
 * 开始拖拽箭头控制点（length/width）
 */
function startHandleDrag(type, ev) {
  handleDragType.value = type
  if (type === 'length') {
    guideRef.value = { x: tip.value.x, y: tip.value.y }
  } else {
    guideRef.value = { x: base.value.x, y: base.value.y }
  }
  window.addEventListener('mousemove', onHandleMove)
  window.addEventListener('mouseup', onHandleUp)
}

/**
 * 拖拽更新箭头大小（长度或宽度）
 */
function onHandleMove(ev) {
  if (!handleDragType.value) return
  const raw = project({ x: ev.clientX, y: ev.clientY })
  const grid = Number(props.data?.grid ?? 8)
  const p = { x: Math.round(raw.x / grid) * grid, y: Math.round(raw.y / grid) * grid }
  if (handleDragType.value === 'length') {
    const dx = p.x - tip.value.x
    const dy = p.y - tip.value.y
    const proj = Math.abs(dx * ux.value + dy * uy.value)
    const next = Math.max(6, Math.min(200, proj))
    if (typeof props.data?.onUpdateArrow === 'function') props.data.onUpdateArrow(props.id, { headLength: Math.round(next) })
    guideSnap.value = { x: p.x, y: p.y }
    guideVisible.value = Boolean(props.data?.showGuides ?? true)
    hintText.value = `${Math.round(next)}px`
  } else if (handleDragType.value === 'width') {
    const dx = p.x - base.value.x
    const dy = p.y - base.value.y
    const proj = dx * nx.value + dy * ny.value
    const next = Math.max(4, Math.min(200, Math.abs(proj) * 2))
    if (typeof props.data?.onUpdateArrow === 'function') props.data.onUpdateArrow(props.id, { headWidth: Math.round(next) })
    guideSnap.value = { x: p.x, y: p.y }
    guideVisible.value = Boolean(props.data?.showGuides ?? true)
    hintText.value = `${Math.round(next)}px`
  } else if (handleDragType.value === 'shaft') {
    const dx = p.x - base.value.x
    const dy = p.y - base.value.y
    const proj = dx * nx.value + dy * ny.value
    const next = Math.max(2, Math.min(64, Math.abs(proj) * 2))
    if (typeof props.data?.onUpdateArrow === 'function') props.data.onUpdateArrow(props.id, { shaftWidth: Math.round(next) })
    guideSnap.value = { x: p.x, y: p.y }
    guideVisible.value = Boolean(props.data?.showGuides ?? true)
    hintText.value = `${Math.round(next)}px`
  }
}

/**
 * 结束拖拽箭头控制点
 */
function onHandleUp() {
  handleDragType.value = null
  hintText.value = ''
  window.removeEventListener('mousemove', onHandleMove)
  window.removeEventListener('mouseup', onHandleUp)
}

/**
 * 获取拖拽参考点（用于角度吸附）
 */
function getRefPoint(idx) {
  const pts = points.value
  if (idx <= 0) return [props.sourceX, props.sourceY]
  return [pts[idx - 1].x, pts[idx - 1].y]
}

/**
 * 吸附：优先栅格吸附，按需再进行 45° 角度吸附（按住 Shift 或开启 angleSnap）
 */
function applySnap(point, ev) {
  const grid = Number(props.data?.grid ?? 8)
  const useGrid = Boolean(props.data?.gridSnap ?? false)
  let sx = point.x
  let sy = point.y
  if (useGrid) {
    sx = Math.round(sx / grid) * grid
    sy = Math.round(sy / grid) * grid
  }

  const angleSnap = Boolean(props.data?.angleSnap ?? false) || Boolean(ev?.shiftKey)
  const step = Number(props.data?.angleStep ?? 45)
  if (angleSnap && dragIndex.value != null) {
    const ref = getRefPoint(dragIndex.value)
    const dx = sx - ref[0]
    const dy = sy - ref[1]
    const r = Math.hypot(dx, dy) || 1
    let ang = Math.atan2(dy, dx)
    const snapRad = (Math.PI / 180) * step
    ang = Math.round(ang / snapRad) * snapRad
    sx = ref[0] + Math.cos(ang) * r
    sy = ref[1] + Math.sin(ang) * r
  }

  return { x: sx, y: sy }
}
</script>

<style scoped>
</style>
  const variant = String(props.data?.variant ?? 'arrow')
/**
 * 将点投影到当前折线段上，返回最接近点与所在段索引
 */
function projectToPolyline(pt, path) {
  if (!path) {
    path = [[props.sourceX, props.sourceY], ...points.value.map(p => [p.x, p.y]), [props.targetX, props.targetY]]
  }
  let best = { x: path[0][0], y: path[0][1], d2: Infinity, segIndex: 0 }
  for (let i = 0; i < path.length - 1; i++) {
    const ax = path[i][0], ay = path[i][1]
    const bx = path[i+1][0], by = path[i+1][1]
    const vx = bx - ax, vy = by - ay
    const len2 = vx * vx + vy * vy
    let t = 0
    if (len2 > 0) {
      t = ((pt.x - ax) * vx + (pt.y - ay) * vy) / len2
      t = Math.max(0, Math.min(1, t))
    }
    const qx = ax + t * vx
    const qy = ay + t * vy
    const dx = pt.x - qx, dy = pt.y - qy
    const d2 = dx * dx + dy * dy
    if (d2 < best.d2) best = { x: qx, y: qy, d2, segIndex: i }
  }
  return best
}

/**
 * 解析当前 bodyPath 为折线点数组，确保投影与渲染一致
 */
function bodyPolyline() {
  const d = bodyPath.value
  // 仅支持 "M x y L x y L x y" 样式
  const tokens = d.split(/[ ,]/).filter(Boolean)
  const pts = []
  for (let i = 0; i < tokens.length;) {
    const cmd = tokens[i++]
    if (cmd === 'M' || cmd === 'L') {
      const x = parseFloat(tokens[i++])
      const y = parseFloat(tokens[i++])
      if (Number.isFinite(x) && Number.isFinite(y)) pts.push([x, y])
    } else {
      // 非预期命令，跳过一个 token 以避免死循环
      i++
    }
  }
  return pts.length >= 2 ? pts : [[props.sourceX, props.sourceY], [props.targetX, props.targetY]]
}
