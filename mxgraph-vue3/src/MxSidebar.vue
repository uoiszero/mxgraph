<template>
  <div class="sidebar">
    <div class="palette">
      <div class="palette-title" @click="toggleGroup('general')">General</div>
      <div
        class="items"
        ref="basicItems"
        v-show="expandedGroup === 'general'"></div>
    </div>
    <div class="palette">
      <div class="palette-title" @click="toggleGroup('misc')">Misc</div>
      <div
        class="items"
        ref="miscItems"
        v-show="expandedGroup === 'misc'"></div>
    </div>
    <div class="palette">
      <div class="palette-title" @click="toggleGroup('advanced')">Advanced</div>
      <div
        class="items"
        ref="advancedItems"
        v-show="expandedGroup === 'advanced'"></div>
    </div>
    <div class="palette">
      <div class="palette-title" @click="toggleGroup('edge')">连线</div>
      <div
        class="items"
        ref="edgeItems"
        v-show="expandedGroup === 'edge'"></div>
    </div>
    <div class="palette">
      <div class="palette-title" @click="toggleGroup('basicStencils')">
        Basic (stencils)
      </div>
      <div
        class="items"
        ref="basicStencilItems"
        v-show="expandedGroup === 'basicStencils'"></div>
    </div>
    <div class="palette">
      <div class="palette-title" @click="toggleGroup('flowchart')">
        Flowchart (stencils)
      </div>
      <div
        class="items"
        ref="flowchartItems"
        v-show="expandedGroup === 'flowchart'"></div>
    </div>
    <div class="palette">
      <div class="palette-title" @click="toggleGroup('bpmn')">
        BPMN (stencils)
      </div>
      <div
        class="items"
        ref="bpmnItems"
        v-show="expandedGroup === 'bpmn'"></div>
    </div>
    <div class="palette">
      <div class="palette-title" @click="toggleGroup('arrows')">
        Arrows (stencils)
      </div>
      <div
        class="items"
        ref="arrowsItems"
        v-show="expandedGroup === 'arrows'"></div>
    </div>
  </div>
</template>

<script>
import { ref, inject, onMounted, watch } from "vue";

export default {
  name: "MxSidebar",
  props: {
    mxGraph: { type: Object, default: null },
    mx: { type: Object, default: null }
  },
  setup(props) {
    const injectedGetter = inject("getGraph", null);
    const injectedGraphRef = inject("mxGraph", null);
    const injectedMx = inject("mx", null);
    const mxLocal = ref(injectedMx ?? props.mx ?? null);

    const basicItems = ref(null);
    const miscItems = ref(null);
    const advancedItems = ref(null);
    const edgeItems = ref(null);
    const basicStencilItems = ref(null);
    const flowchartItems = ref(null);
    const bpmnItems = ref(null);
    const arrowsItems = ref(null);

    const expandedGroup = ref("general");

    /**
     * bindNoSelect
     * 绑定事件以防止拖拽过程中产生文本选择，同时禁用原生拖拽
     * @param {HTMLElement} el 目标元素
     */
    function bindNoSelect(el) {
      if (!el) return;
      el.setAttribute("unselectable", "on");
      el.style.userSelect = "none";
      el.style.webkitUserSelect = "none";
      el.style.msUserSelect = "none";
      el.addEventListener(
        "mousedown",
        e => {
          e.preventDefault();
        },
        { passive: false }
      );
      el.addEventListener(
        "touchstart",
        e => {
          e.preventDefault();
        },
        { passive: false }
      );
      el.addEventListener("dragstart", e => {
        e.preventDefault();
      });
    }

    /**
     * toggleGroup
     * 切换指定分组的展开/折叠状态，保证同时仅有一个分组展开
     * @param {string} key 分组标识
     */
    function toggleGroup(key) {
      expandedGroup.value = expandedGroup.value === key ? null : key;
    }

    /**
     * getActiveGraph
     * 获取当前 mxGraph 实例
     */
    function getActiveGraph() {
      const src = props.mxGraph;
      if (src) {
        if (typeof src === "function") {
          try {
            const g = src();
            if (g && typeof g.getDefaultParent === "function") return g;
          } catch (e) {}
        }
        if (typeof src === "object") {
          // 处理传入的 ref/computed
          if (
            "value" in src &&
            src.value &&
            typeof src.value.getDefaultParent === "function"
          ) {
            return src.value;
          }
          if (typeof src.getDefaultParent === "function") return src;
        }
      }
      if (typeof injectedGetter === "function") {
        try {
          const v = injectedGetter();
          if (v) return typeof v === "function" ? v() : v;
        } catch (e) {}
      }
      if (injectedGraphRef && injectedGraphRef.value)
        return injectedGraphRef.value;
      return null;
    }

    /**
     * createThumbGraph
     * 创建缩略图专用的只读 Graph
     * @param {HTMLElement} container 缩略图容器
     * @returns {any}
     */
    function createThumbGraph(container) {
      const g = new mxLocal.value.mxGraph(container);
      g.setEnabled(false);
      g.setPanning(false);
      g.setHtmlLabels(true);
      g.setCellsResizable(false);
      g.setConnectable(false);
      return g;
    }

    /**
     * initSidebar
     * 初始化侧边栏模板与拖拽
     */
    function initSidebar() {
      const graph = getActiveGraph();
      const mx = mxLocal.value;
      if (!basicItems.value || !edgeItems.value || !mx) return;
      const { mxUtils, mxCell, mxGeometry, mxPoint, mxConstants } = mx;

      function addVertexItem(containerEl, label, w, h, style) {
        const item = document.createElement("div");
        item.className = "item";
        const thumb = document.createElement("div");
        thumb.className = "thumb";
        thumb.style.width = `40px`;
        thumb.style.height = `40px`;
        // const caption = document.createElement("div");
        // caption.className = "caption";
        // caption.textContent = label;
        item.appendChild(thumb);
        //item.appendChild(caption);
        containerEl.appendChild(item);

        bindNoSelect(item);
        bindNoSelect(thumb);

        const g = createThumbGraph(thumb);
        const W = Math.max(1, Number(w) || 40);
        const H = Math.max(1, Number(h) || 40);
        const margin = 6;
        const innerW = 40 - margin * 2;
        const innerH = 40 - margin * 2;
        const scale = Math.min(innerW / W, innerH / H);
        if (!Number.isNaN(scale) && scale > 0) g.view.scale = scale;
        const gx = (margin + (innerW - W * scale) / 2) / scale;
        const gy = (margin + (innerH - H * scale) / 2) / scale;
        const parent = g.getDefaultParent();
        g.getModel().beginUpdate();
        try {
          g.insertVertex(parent, null, "", gx, gy, w, h, style);
        } finally {
          g.getModel().endUpdate();
        }

        /**
         * createVertex
         * 在目标图上插入一个顶点，并选中、滚动可见、强制刷新视图
         * @param {any} graphTarget 目标 mxGraph 实例
         * @param {MouseEvent} evt 拖拽释放事件
         */
        const createVertex = (graphTarget, evt) => {
          const pt = graphTarget.getPointForEvent(evt);
          const parentTarget = graphTarget.getDefaultParent();
          graphTarget.getModel().beginUpdate();
          let v;
          try {
            v = graphTarget.insertVertex(
              parentTarget,
              null,
              label,
              pt.x,
              pt.y,
              w,
              h,
              style
            );
          } finally {
            graphTarget.getModel().endUpdate();
          }
          if (v) {
            graphTarget.setSelectionCell(v);
            graphTarget.scrollCellToVisible(v);
            graphTarget.refresh();
          }
        };
        const bind = () => {
          const gr = getActiveGraph();
          if (!gr) return false;
          mxUtils.makeDraggable(item, gr, createVertex, g.container);
          return true;
        };
        if (!bind()) {
          if (!window.__mxPendingDrags) window.__mxPendingDrags = [];
          window.__mxPendingDrags.push(bind);
        }
      }

      function addEdgeItem(label, style) {
        const item = document.createElement("div");
        item.className = "item";
        const thumb = document.createElement("div");
        thumb.className = "thumb";
        thumb.style.width = `40px`;
        thumb.style.height = `40px`;
        // const caption = document.createElement("div");
        // caption.className = "caption";
        // caption.textContent = label;
        item.appendChild(thumb);
        //item.appendChild(caption);
        edgeItems.value.appendChild(item);

        bindNoSelect(item);
        bindNoSelect(thumb);

        const g = createThumbGraph(thumb);
        const parent = g.getDefaultParent();
        // 规范化样式：对 flexArrow 默认补充 noEdgeStyle 与 width
        let edgeStyle = style || "edgeStyle=orthogonalEdgeStyle;rounded=0;";
        if (edgeStyle.indexOf("shape=flexArrow") !== -1) {
          if (edgeStyle.indexOf("noEdgeStyle=") === -1) {
            edgeStyle += "noEdgeStyle=1;";
          }
          if (edgeStyle.indexOf("width=") === -1) {
            edgeStyle += "width=14;";
          }
        }
        const edge = new mxCell("", new mxGeometry(), edgeStyle);
        edge.setEdge(true);
        // 居中计算：在 40x40 的缩略图内按边距居中终点
        const size = 40;
        const margin = 6;
        const innerW = size - margin * 2;
        const innerH = size - margin * 2;
        const L = Math.max(12, innerW - 4);
        const startX = margin + (innerW - L) / 2;
        const endX = startX + L;
        const y = margin + innerH / 2;
        edge.geometry.setTerminalPoint(new mxPoint(startX, y), true);
        edge.geometry.setTerminalPoint(new mxPoint(endX, y), false);
        // 添加一个轻微的中点偏移以展示厚度，同时保持居中
        const midX = (startX + endX) / 2;
        const dy = Math.min(6, innerH / 3);
        edge.geometry.points = [new mxPoint(midX, y - dy)];
        g.getModel().beginUpdate();
        try {
          g.addCell(edge, parent);
        } finally {
          g.getModel().endUpdate();
        }

        const createEdge = (graphTarget, evt) => {
          const pt = graphTarget.getPointForEvent(evt);
          const parentTarget = graphTarget.getDefaultParent();
          // 规范化样式（与缩略图一致），确保 flexArrow 默认显式宽度
          let edgeStyle2 = style || "edgeStyle=orthogonalEdgeStyle;rounded=0;";
          if (edgeStyle2.indexOf("shape=flexArrow") !== -1) {
            if (edgeStyle2.indexOf("noEdgeStyle=") === -1) {
              edgeStyle2 += "noEdgeStyle=1;";
            }
            if (edgeStyle2.indexOf("width=") === -1) {
              edgeStyle2 += "width=14;";
            }
          }
          const pStyle = "shape=point;fillColor=none;strokeColor=none;";
          const model = graphTarget.getModel();
          model.beginUpdate();
          let e;
          try {
            const s = graphTarget.insertVertex(
              parentTarget,
              null,
              "",
              pt.x - 48,
              pt.y,
              1,
              1,
              pStyle
            );
            const t = graphTarget.insertVertex(
              parentTarget,
              null,
              "",
              pt.x + 48,
              pt.y,
              1,
              1,
              pStyle
            );
            e = graphTarget.insertEdge(
              parentTarget,
              null,
              "",
              s,
              t,
              edgeStyle2
            );
            // 预置两个 waypoint，立即可见并可拖动
            const geo =
              e.geometry != null ? e.geometry.clone() : new mxGeometry();
            geo.points = [
              new mxPoint(pt.x, pt.y - 24),
              new mxPoint(pt.x, pt.y + 24)
            ];
            model.setGeometry(e, geo);
          } finally {
            model.endUpdate();
          }
          graphTarget.setSelectionCell(e);
          graphTarget.scrollCellToVisible(e);
          graphTarget.refresh();
        };
        const bindEdge = () => {
          const gr = getActiveGraph();
          if (!gr) return false;
          mxUtils.makeDraggable(item, gr, createEdge, g.container);
          return true;
        };
        if (!bindEdge()) {
          if (!window.__mxPendingDrags) window.__mxPendingDrags = [];
          window.__mxPendingDrags.push(bindEdge);
        }
      }

      // General
      addVertexItem(basicItems.value, "Rectangle", 80, 40, null);
      addVertexItem(basicItems.value, "Rounded", 100, 50, "rounded=1;");
      addVertexItem(
        basicItems.value,
        "Ellipse",
        80,
        50,
        "shape=ellipse;perimeter=ellipsePerimeter;"
      );
      addVertexItem(
        basicItems.value,
        "Triangle",
        80,
        60,
        "shape=triangle;perimeter=trianglePerimeter;"
      );
      addVertexItem(
        basicItems.value,
        "Rhombus",
        80,
        60,
        "shape=rhombus;perimeter=rhombusPerimeter;"
      );
      addVertexItem(
        basicItems.value,
        "Hexagon",
        100,
        60,
        "shape=hexagon;perimeter=hexagonPerimeter;"
      );
      addVertexItem(
        basicItems.value,
        "Swimlane",
        140,
        80,
        "shape=swimlane;horizontal=1;childLayout=stackLayout;"
      );

      // Misc
      addVertexItem(miscItems.value, "Cylinder", 100, 60, "shape=cylinder;");
      addVertexItem(miscItems.value, "Actor", 50, 70, "shape=actor;");
      addVertexItem(miscItems.value, "Cloud", 100, 70, "shape=cloud;");
      addVertexItem(
        miscItems.value,
        "Double Ellipse",
        90,
        60,
        "shape=doubleEllipse;"
      );
      addVertexItem(miscItems.value, "Label", 100, 30, "shape=label;");

      // Advanced
      addVertexItem(
        advancedItems.value,
        "Single Arrow",
        120,
        40,
        "shape=singleArrow;"
      );
      addVertexItem(
        advancedItems.value,
        "Double Arrow",
        120,
        40,
        "shape=doubleArrow;"
      );
      addVertexItem(advancedItems.value, "Line", 120, 10, "shape=line;");

      addEdgeItem("直线", "edgeStyle=straight;");
      addEdgeItem("折线", "edgeStyle=orthogonalEdgeStyle;");
      /**
       * Flex Arrow 示例：末端箭头，使用默认宽度与端宽
       */
      addEdgeItem(
        "Flex Arrow（末端）",
        `${mxConstants.STYLE_SHAPE}=flexArrow;noEdgeStyle=1;fillColor=#60a5fa;strokeColor=#1e3a8a;${mxConstants.STYLE_ENDARROW}=${mxConstants.ARROW_BLOCK};`
      );
      /**
       * Flex Arrow 示例：两端箭头
       */
      addEdgeItem(
        "Flex Arrow（两端）",
        `${mxConstants.STYLE_SHAPE}=flexArrow;noEdgeStyle=1;fillColor=#34d399;strokeColor=#065f46;${mxConstants.STYLE_STARTARROW}=${mxConstants.ARROW_BLOCK};${mxConstants.STYLE_ENDARROW}=${mxConstants.ARROW_BLOCK};`
      );
      /**
       * Flex Arrow 示例：仅起始箭头
       */
      addEdgeItem(
        "Flex Arrow（起始）",
        `${mxConstants.STYLE_SHAPE}=flexArrow;noEdgeStyle=1;fillColor=#fb7185;strokeColor=#7f1d1d;${mxConstants.STYLE_STARTARROW}=${mxConstants.ARROW_BLOCK};${mxConstants.STYLE_ENDARROW}=${mxConstants.NONE};`
      );
      /**
       * Flex Arrow 示例：自定义箭身厚度与端宽，圆角
       */
      addEdgeItem(
        "Flex Arrow（自定义）",
        `${mxConstants.STYLE_SHAPE}=flexArrow;noEdgeStyle=1;width=16;startWidth=24;endWidth=16;rounded=1;fillColor=#a78bfa;strokeColor=#4c1d95;${mxConstants.STYLE_STARTARROW}=${mxConstants.ARROW_BLOCK};${mxConstants.STYLE_ENDARROW}=${mxConstants.ARROW_BLOCK};`
      );

      function addStencilPalette(containerEl, url, styleSuffix) {
        const suffix = styleSuffix || ";whiteSpace=wrap;html=1;";
        async function loadStencilSet(u) {
          try {
            const base = import.meta?.env?.BASE_URL || "/";
            const full =
              base.replace(/\/$/, "/") + String(u).replace(/^\//, "");
            const resp = await fetch(full);
            const text = await resp.text();
            const doc = mx.mxUtils.parseXml(text);
            const root = doc?.documentElement;
            const pkg = root?.getAttribute("name") || "";
            const nodes = root?.getElementsByTagName("shape") || [];
            for (let i = 0; i < nodes.length; i++) {
              const node = nodes[i];
              const name = node.getAttribute("name") || `shape_${i}`;
              const w = Number(node.getAttribute("w") || 80);
              const h = Number(node.getAttribute("h") || 40);
              const stencil = new mx.mxStencil(node);
              mx.mxStencilRegistry.addStencil(`${pkg}.${name}`, stencil);
              const shapeStyle = `shape=${pkg}.${name}${suffix}`;
              addVertexItem(
                containerEl,
                name,
                Math.round(w || 80),
                Math.round(h || 40),
                shapeStyle
              );
            }
          } catch (e) {
            console.error("Load stencil failed:", u, e);
          }
        }
        loadStencilSet(url);
      }
      addStencilPalette(basicStencilItems.value, "/stencils/basic.xml");
      addStencilPalette(flowchartItems.value, "/stencils/flowchart.xml");
      addStencilPalette(bpmnItems.value, "/stencils/bpmn.xml");
      addStencilPalette(arrowsItems.value, "/stencils/arrows.xml");
    }

    onMounted(() => {
      if (mxLocal.value) initSidebar();
      const timer = setInterval(() => {
        const g = getActiveGraph();
        if (g && window.__mxPendingDrags && window.__mxPendingDrags.length) {
          const fns = window.__mxPendingDrags.splice(0);
          for (const fn of fns) {
            try {
              fn();
            } catch (e) {}
          }
        }
        if (g) clearInterval(timer);
      }, 300);
    });

    watch(
      () => props.mx,
      v => {
        mxLocal.value = v;
        if (v) initSidebar();
      }
    );

    return {
      basicItems,
      miscItems,
      advancedItems,
      edgeItems,
      basicStencilItems,
      flowchartItems,
      bpmnItems,
      arrowsItems,
      expandedGroup,
      toggleGroup
    };
  }
};
</script>

<style scoped>
.sidebar {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
}
.palette {
  margin-bottom: 12px;
}
.palette-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 6px;
  background: #f8fafc;
  padding: 6px 4px;
  border: 1px solid #e5e7eb;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  user-select: none;
}
.palette-title:hover {
  cursor: pointer;
  background: #f1f5f9;
}
.items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  user-select: none;
}
:deep(.item) {
  display: grid;
  justify-items: center;
  align-items: center;
  border: 1px dashed #cbd5e1;
  border-radius: 4px;
  background: #fff;
  cursor: grab;
  user-select: none;
}
:deep(.thumb) {
  display: block;
  background: #fafafa;
  border-radius: 4px;
  overflow: hidden;
  user-select: none;
}
:deep(.caption) {
  font-size: 12px;
  color: #334155;
}
:deep(.item:active) {
  cursor: grabbing;
}
</style>
