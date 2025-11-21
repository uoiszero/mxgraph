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
      if (props.mxGraph) return props.mxGraph;
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

        const g = createThumbGraph(thumb);
        const scale = Math.min(
          40 / Math.max(1, (Number(w) || 40) + 12),
          40 / Math.max(1, (Number(h) || 40) + 12)
        );
        if (!Number.isNaN(scale) && scale > 0) g.view.scale = scale;
        const parent = g.getDefaultParent();
        g.getModel().beginUpdate();
        try {
          g.insertVertex(parent, null, "", 6, 6, w, h, style);
        } finally {
          g.getModel().endUpdate();
        }

        const createVertex = (graphTarget, evt) => {
          const pt = graphTarget.getPointForEvent(evt);
          const parentTarget = graphTarget.getDefaultParent();
          graphTarget.getModel().beginUpdate();
          try {
            graphTarget.insertVertex(
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

        const g = createThumbGraph(thumb);
        g.view.scale = 0.6;
        const parent = g.getDefaultParent();
        const edge = new mxCell(
          "",
          new mxGeometry(),
          style || "edgeStyle=orthogonalEdgeStyle;rounded=0;"
        );
        edge.setEdge(true);
        edge.geometry.setTerminalPoint(new mxPoint(10, 20), true);
        edge.geometry.setTerminalPoint(new mxPoint(30, 20), false);
        g.getModel().beginUpdate();
        try {
          g.addCell(edge, parent);
        } finally {
          g.getModel().endUpdate();
        }

        const createEdge = (graphTarget, evt) => {
          const pt = graphTarget.getPointForEvent(evt);
          const parentTarget = graphTarget.getDefaultParent();
          const e = new mxCell(
            "",
            new mxGeometry(),
            style || "edgeStyle=orthogonalEdgeStyle;rounded=0;"
          );
          e.setEdge(true);
          e.geometry.setTerminalPoint(new mxPoint(pt.x - 40, pt.y), true);
          e.geometry.setTerminalPoint(new mxPoint(pt.x + 40, pt.y), false);
          graphTarget.getModel().beginUpdate();
          try {
            graphTarget.addCell(e, parentTarget);
          } finally {
            graphTarget.getModel().endUpdate();
          }
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
      addEdgeItem(
        "箭头",
        `${mxConstants.STYLE_SHAPE}=flexArrow;${mxConstants.STYLE_ENDARROW}=${mxConstants.ARROW_BLOCK};`
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
}
.palette-title:hover {
  cursor: pointer;
  background: #f1f5f9;
}
.items {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.item {
  display: grid;
  grid-template-rows: auto 20px;
  justify-items: center;
  align-items: center;
  padding: 6px 8px;
  border: 1px dashed #cbd5e1;
  border-radius: 4px;
  background: #fff;
  cursor: grab;
  user-select: none;
}
.thumb {
  display: block;
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}
.caption {
  font-size: 12px;
  color: #334155;
}
.item:active {
  cursor: grabbing;
}
</style>
