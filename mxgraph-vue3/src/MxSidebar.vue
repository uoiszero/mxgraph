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

      /**
       * addVertexItem
       * 向指定容器添加一个顶点缩略图条目，并绑定拖拽创建行为
       * @param {HTMLElement} containerEl 容器元素
       * @param {string} label 标题（用于创建时默认文本）
       * @param {number} w 宽度
       * @param {number} h 高度
       * @param {string} style 样式字符串
       * @param {{valueThumb?: any, valueCreate?: any, attrs?: Record<string,string>}} [opts] 可选项
       */
      function addVertexItem(containerEl, label, w, h, style, opts) {
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
          g.insertVertex(
            parent,
            null,
            opts && "valueThumb" in opts ? opts.valueThumb : "",
            gx,
            gy,
            w,
            h,
            style
          );
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
              opts && "valueCreate" in opts ? opts.valueCreate : label,
              pt.x,
              pt.y,
              w,
              h,
              style
            );
            if (opts && opts.attrs) {
              try {
                for (const k of Object.keys(opts.attrs)) {
                  graphTarget.setAttributeForCell(v, k, String(opts.attrs[k]));
                }
              } catch (e) {}
            }
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

      /**
       * addEdgeItem
       * 添加连线缩略图项目，支持 flexArrow 缩略图按比例缩小 1/4
       * @param {string} label 标题
       * @param {string} style 边样式字符串
       */
      /**
       * addEdgeItem
       * 添加连线缩略图到 Edge 分组
       * @param {string} label 标题
       * @param {string} style 边样式
       */
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
          // 缩略图等比缩小 1/4（缩放到原始 75%）
          const scale = 0.25;
          g.view.scale = scale;
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
        // 根据缩放修正坐标以保持可视居中
        const scaleApplied = g.view?.scale || 1;
        const startX = (margin + (innerW - L) / 2) / scaleApplied;
        const endX = startX + L / scaleApplied;
        const y = (margin + innerH / 2) / scaleApplied;
        edge.geometry.setTerminalPoint(new mxPoint(startX, y), true);
        edge.geometry.setTerminalPoint(new mxPoint(endX, y), false);
        // 添加两个中点偏移以与拖放后的默认形状一致（Z 形折线）
        const midX = (startX + endX) / 2;
        const dy = Math.min(8, innerH / 3) / scaleApplied;
        edge.geometry.points = [
          new mxPoint(midX, y - dy),
          new mxPoint(midX, y + dy)
        ];
        g.getModel().beginUpdate();
        try {
          g.addCell(edge, parent);
        } finally {
          g.getModel().endUpdate();
        }

        const createEdge = (graphTarget, evt) => {
          const pt = graphTarget.getPointForEvent(evt);
          // 规范化样式（与缩略图一致），确保 flexArrow 默认显式宽度
          let edgeStyle2 = style || "edgeStyle=orthogonalEdgeStyle;rounded=0;";
          if (edgeStyle2.indexOf("shape=flexArrow") !== -1) {
            if (edgeStyle2.indexOf("noEdgeStyle=") === -1) edgeStyle2 += "noEdgeStyle=1;";
            if (edgeStyle2.indexOf("width=") === -1) edgeStyle2 += "width=14;";
          }
          const tmpl = new mxCell("", new mxGeometry(0, 0, 50, 50), edgeStyle2);
          tmpl.geometry.setTerminalPoint(new mxPoint(0, 50), true);
          tmpl.geometry.setTerminalPoint(new mxPoint(50, 0), false);
          tmpl.geometry.relative = true;
          tmpl.edge = true;
          let select = null;
          graphTarget.getModel().beginUpdate();
          try {
            select = graphTarget.importCells([tmpl], pt.x, pt.y, null);
          } finally {
            graphTarget.getModel().endUpdate();
          }
          if (select && select.length) {
            graphTarget.setSelectionCells(select);
            graphTarget.scrollCellToVisible(select[0]);
            graphTarget.refresh();
          }
          graphTarget.stopEditing();
          try { mxLocal.value?.mxEvent?.consume?.(evt); } catch (e) {}
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

      /**
       * addEdgeItemTo
       * 添加连线缩略图到指定分组容器
       * @param {HTMLElement} containerEl 容器元素
       * @param {string} label 标题
       * @param {string} style 边样式
       */
      function addEdgeItemTo(containerEl, label, style) {
        const item = document.createElement("div");
        item.className = "item";
        const thumb = document.createElement("div");
        thumb.className = "thumb";
        thumb.style.width = `40px`;
        thumb.style.height = `40px`;
        item.appendChild(thumb);
        containerEl.appendChild(item);

        bindNoSelect(item);
        bindNoSelect(thumb);

        const g = createThumbGraph(thumb);
        const parent = g.getDefaultParent();
        let edgeStyle = style || "edgeStyle=orthogonalEdgeStyle;rounded=0;";
        if (edgeStyle.indexOf("shape=flexArrow") !== -1) {
          const scale = 0.25;
          g.view.scale = scale;
          if (edgeStyle.indexOf("noEdgeStyle=") === -1) edgeStyle += "noEdgeStyle=1;";
          if (edgeStyle.indexOf("width=") === -1) edgeStyle += "width=14;";
        }
        const edge = new mxCell("", new mxGeometry(), edgeStyle);
        edge.setEdge(true);
        const size = 40;
        const margin = 6;
        const innerW = size - margin * 2;
        const innerH = size - margin * 2;
        const L = Math.max(12, innerW - 4);
        const scaleApplied = g.view?.scale || 1;
        const startX = (margin + (innerW - L) / 2) / scaleApplied;
        const endX = startX + L / scaleApplied;
        const y = (margin + innerH / 2) / scaleApplied;
        edge.geometry.setTerminalPoint(new mxPoint(startX, y), true);
        edge.geometry.setTerminalPoint(new mxPoint(endX, y), false);
        const midX = (startX + endX) / 2;
        const dy = Math.min(8, innerH / 3) / scaleApplied;
        edge.geometry.points = [new mxPoint(midX, y - dy), new mxPoint(midX, y + dy)];
        g.getModel().beginUpdate();
        try { g.addCell(edge, parent); } finally { g.getModel().endUpdate(); }

        const createEdge = (graphTarget, evt) => {
          const pt = graphTarget.getPointForEvent(evt);
          let edgeStyle2 = style || "edgeStyle=orthogonalEdgeStyle;rounded=0;";
          if (edgeStyle2.indexOf("shape=flexArrow") !== -1) {
            if (edgeStyle2.indexOf("noEdgeStyle=") === -1) edgeStyle2 += "noEdgeStyle=1;";
            if (edgeStyle2.indexOf("width=") === -1) edgeStyle2 += "width=14;";
          }
          const tmpl = new mxCell("", new mxGeometry(0, 0, 50, 50), edgeStyle2);
          tmpl.geometry.setTerminalPoint(new mxPoint(0, 50), true);
          tmpl.geometry.setTerminalPoint(new mxPoint(50, 0), false);
          tmpl.geometry.relative = true;
          tmpl.edge = true;
          let select = null;
          graphTarget.getModel().beginUpdate();
          try { select = graphTarget.importCells([tmpl], pt.x, pt.y, null); }
          finally { graphTarget.getModel().endUpdate(); }
          if (select && select.length) {
            graphTarget.setSelectionCells(select);
            graphTarget.scrollCellToVisible(select[0]);
            graphTarget.refresh();
          }
          graphTarget.stopEditing();
          try { mxLocal.value?.mxEvent?.consume?.(evt); } catch (e) {}
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

      /**
       * addTableCompositeItem
       * 使用 Grapheditor 的 table 形状构造复合表格（含行/列），并绑定拖拽创建
       * @param {HTMLElement} containerEl 容器
       * @param {string} label 标题
       * @param {number} w 宽度
       * @param {number} h 高度
       * @param {number} rows 行数
       * @param {number} cols 列数
       */
      function addTableCompositeItem(containerEl, label, w, h, rows = 3, cols = 3) {
        const item = document.createElement("div");
        item.className = "item";
        const thumb = document.createElement("div");
        thumb.className = "thumb";
        thumb.style.width = `40px`;
        thumb.style.height = `40px`;
        item.appendChild(thumb);
        containerEl.appendChild(item);

        bindNoSelect(item);
        bindNoSelect(thumb);

        const g = createThumbGraph(thumb);
        const parent = g.getDefaultParent();
        const tableStyle = "swimlane;shape=table;rowLines=1;columnLines=1;startSize=0;html=1;fillColor=#ffffff;strokeColor=#c0c0c0;";
        const t = new mxLocal.value.mxCell(label, new mxLocal.value.mxGeometry(0, 0, w, h), tableStyle);
        t.vertex = true;
        const rH = h / rows;
        for (let i = 0; i < rows; i++) {
          const row = new mxLocal.value.mxCell("", new mxLocal.value.mxGeometry(0, i * rH, w, rH), "");
          row.vertex = true;
          t.insert(row);
          if (i === 0) {
            const cW = w / cols;
            for (let j = 0; j < cols; j++) {
              const col = new mxLocal.value.mxCell("", new mxLocal.value.mxGeometry(j * cW, 0, cW, rH), "");
              col.vertex = true;
              row.insert(col);
            }
          }
        }
        g.getModel().beginUpdate();
        try {
          g.addCell(t, parent);
        } finally {
          g.getModel().endUpdate();
        }

        const createComposite = (graphTarget, evt) => {
          const pt = graphTarget.getPointForEvent(evt);
          const parentTarget = graphTarget.getDefaultParent();
          const m = graphTarget.getModel();
          m.beginUpdate();
          let tableV = null;
          try {
            tableV = graphTarget.insertVertex(parentTarget, null, label, pt.x, pt.y, w, h, tableStyle);
            const rH2 = h / rows;
            for (let i = 0; i < rows; i++) {
              const rowV = graphTarget.insertVertex(tableV, null, "", 0, i * rH2, w, rH2, "");
              if (i === 0) {
                const cW2 = w / cols;
                for (let j = 0; j < cols; j++) {
                  graphTarget.insertVertex(rowV, null, "", j * cW2, 0, cW2, rH2, "");
                }
              }
            }
          } finally {
            m.endUpdate();
          }
          if (tableV) {
            graphTarget.setSelectionCell(tableV);
            graphTarget.scrollCellToVisible(tableV);
            graphTarget.refresh();
          }
        };
        const bind = () => {
          const gr = getActiveGraph();
          if (!gr) return false;
          mxLocal.value.mxUtils.makeDraggable(item, gr, createComposite, g.container);
          return true;
        };
        if (!bind()) {
          if (!window.__mxPendingDrags) window.__mxPendingDrags = [];
          window.__mxPendingDrags.push(bind);
        }
      }

      // General（精确合并 Grapheditor Sidebar.js 大部分条目）
      addVertexItem(basicItems.value, "Rectangle", 120, 60, "rounded=0;whiteSpace=wrap;html=1;");
      addVertexItem(basicItems.value, "Rounded Rectangle", 120, 60, "rounded=1;whiteSpace=wrap;html=1;");
      addVertexItem(
        basicItems.value,
        "Text",
        40,
        20,
        "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;",
        { valueThumb: "Text", valueCreate: "Text" }
      );
      addVertexItem(
        basicItems.value,
        "Textbox",
        190,
        120,
        "text;html=1;strokeColor=none;fillColor=none;spacing=5;spacingTop=-20;whiteSpace=wrap;overflow=hidden;rounded=0;",
        { valueThumb: '<h1>Heading</h1><p>Lorem ipsum dolor sit amet...</p>', valueCreate: '<h1>Heading</h1><p>Lorem ipsum dolor sit amet...</p>' }
      );
      addVertexItem(basicItems.value, "Ellipse", 120, 80, "shape=ellipse;whiteSpace=wrap;html=1;");
      addVertexItem(basicItems.value, "Square", 80, 80, "whiteSpace=wrap;html=1;aspect=fixed;");
      addVertexItem(basicItems.value, "Circle", 80, 80, "shape=ellipse;whiteSpace=wrap;html=1;aspect=fixed;");
      addVertexItem(basicItems.value, "Process", 120, 60, "shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;");
      addVertexItem(basicItems.value, "Diamond", 80, 80, "shape=rhombus;whiteSpace=wrap;html=1;");
      addVertexItem(basicItems.value, "Parallelogram", 120, 60, "shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;");
      addVertexItem(basicItems.value, "Hexagon", 120, 80, "shape=hexagon;perimeter=hexagonPerimeter;whiteSpace=wrap;html=1;fixedSize=1;");
      addVertexItem(basicItems.value, "Triangle", 60, 80, "shape=triangle;whiteSpace=wrap;html=1;");
      addVertexItem(basicItems.value, "Cylinder", 60, 80, "shape=cylinder;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;");
      addVertexItem(basicItems.value, "Cloud", 120, 80, "shape=cloud;whiteSpace=wrap;html=1;");
      addVertexItem(basicItems.value, "Document", 120, 80, "shape=document;whiteSpace=wrap;html=1;boundedLbl=1;");
      addVertexItem(basicItems.value, "Internal Storage", 80, 80, "shape=internalStorage;whiteSpace=wrap;html=1;backgroundOutline=1;");
      addVertexItem(basicItems.value, "Cube", 120, 80, "shape=cube;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;darkOpacity=0.05;darkOpacity2=0.1;");
      addVertexItem(basicItems.value, "Step", 120, 80, "shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;");
      addVertexItem(basicItems.value, "Trapezoid", 120, 60, "shape=trapezoid;perimeter=trapezoidPerimeter;whiteSpace=wrap;html=1;fixedSize=1;");
      addVertexItem(basicItems.value, "Tape", 120, 100, "shape=tape;whiteSpace=wrap;html=1;");
      addVertexItem(basicItems.value, "Note", 80, 100, "shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;");
      addVertexItem(basicItems.value, "Card", 80, 100, "shape=card;whiteSpace=wrap;html=1;");
      addVertexItem(basicItems.value, "Callout", 120, 80, "shape=callout;whiteSpace=wrap;html=1;perimeter=calloutPerimeter;");
      addVertexItem(basicItems.value, "Actor", 30, 60, "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;", { valueThumb: "Actor", valueCreate: "Actor" });
      addVertexItem(basicItems.value, "Or", 60, 80, "shape=xor;whiteSpace=wrap;html=1;");
      addVertexItem(basicItems.value, "And", 60, 80, "shape=or;whiteSpace=wrap;html=1;");
      addVertexItem(basicItems.value, "Data Storage", 100, 80, "shape=dataStorage;whiteSpace=wrap;html=1;fixedSize=1;");

      // General edges（基础子集）
      addEdgeItemTo(basicItems.value, "Arrow", "shape=flexArrow;endArrow=classic;html=1;");
      addEdgeItemTo(basicItems.value, "Bidirectional Arrow", "shape=flexArrow;endArrow=classic;startArrow=classic;html=1;");
      addEdgeItemTo(basicItems.value, "Line", "endArrow=none;html=1;");
      addEdgeItemTo(basicItems.value, "Dashed Line", "endArrow=none;dashed=1;html=1;");
      addEdgeItemTo(basicItems.value, "Dotted Line", "endArrow=none;dashed=1;dashPattern=1 3;strokeWidth=2;html=1;");
      addEdgeItemTo(basicItems.value, "Link", "shape=link;html=1;");

      // Misc（精确合并 Grapheditor 主要条目）
      addVertexItem(
        miscItems.value,
        "Title",
        100,
        40,
        "text;strokeColor=none;fillColor=none;html=1;fontSize=24;fontStyle=1;verticalAlign=middle;align=center;",
        { valueThumb: "Title", valueCreate: "Title" }
      );
      addVertexItem(
        miscItems.value,
        "Unordered List",
        100,
        80,
        "text;strokeColor=none;fillColor=none;html=1;whiteSpace=wrap;verticalAlign=middle;overflow=hidden;",
        { valueThumb: "<ul><li>Value 1</li><li>Value 2</li><li>Value 3</li></ul>", valueCreate: "<ul><li>Value 1</li><li>Value 2</li><li>Value 3</li></ul>" }
      );
      addVertexItem(
        miscItems.value,
        "Ordered List",
        100,
        80,
        "text;strokeColor=none;fillColor=none;html=1;whiteSpace=wrap;verticalAlign=middle;overflow=hidden;",
        { valueThumb: "<ol><li>Value 1</li><li>Value 2</li><li>Value 3</li></ol>", valueCreate: "<ol><li>Value 1</li><li>Value 2</li><li>Value 3</li></ol>" }
      );
      addVertexItem(
        miscItems.value,
        "HTML Table 1",
        280,
        160,
        "text;html=1;strokeColor=#c0c0c0;fillColor=#ffffff;overflow=fill;rounded=0;",
        { valueThumb: '<table border="1" width="100%" height="100%" cellpadding="4" style="width:100%;height:100%;border-collapse:collapse;"><tr style="background-color:#A7C942;color:#ffffff;border:1px solid #98bf21;"><th align="left">Title 1</th><th align="left">Title 2</th><th align="left">Title 3</th></tr><tr style="border:1px solid #98bf21;"><td>Value 1</td><td>Value 2</td><td>Value 3</td></tr><tr style="background-color:#EAF2D3;border:1px solid #98bf21;"><td>Value 4</td><td>Value 5</td><td>Value 6</td></tr><tr style="border:1px solid #98bf21;"><td>Value 7</td><td>Value 8</td><td>Value 9</td></tr><tr style="background-color:#EAF2D3;border:1px solid #98bf21;"><td>Value 10</td><td>Value 11</td><td>Value 12</td></tr></table>', valueCreate: '<table border="1" width="100%" height="100%" cellpadding="4" style="width:100%;height:100%;border-collapse:collapse;"><tr style="background-color:#A7C942;color:#ffffff;border:1px solid #98bf21;"><th align="left">Title 1</th><th align="left">Title 2</th><th align="left">Title 3</th></tr><tr style="border:1px solid #98bf21;"><td>Value 1</td><td>Value 2</td><td>Value 3</td></tr><tr style="background-color:#EAF2D3;border:1px solid #98bf21;"><td>Value 4</td><td>Value 5</td><td>Value 6</td></tr><tr style="border:1px solid #98bf21;"><td>Value 7</td><td>Value 8</td><td>Value 9</td></tr><tr style="background-color:#EAF2D3;border:1px solid #98bf21;"><td>Value 10</td><td>Value 11</td><td>Value 12</td></tr></table>' }
      );
      addVertexItem(
        miscItems.value,
        "HTML Table 2",
        180,
        140,
        "text;html=1;strokeColor=#c0c0c0;fillColor=none;overflow=fill;",
        { valueThumb: '<table border="0" width="100%" height="100%" style="width:100%;height:100%;border-collapse:collapse;"><tr><td align="center">Value 1</td><td align="center">Value 2</td><td align="center">Value 3</td></tr><tr><td align="center">Value 4</td><td align="center">Value 5</td><td align="center">Value 6</td></tr><tr><td align="center">Value 7</td><td align="center">Value 8</td><td align="center">Value 9</td></tr></table>', valueCreate: '<table border="0" width="100%" height="100%" style="width:100%;height:100%;border-collapse:collapse;"><tr><td align="center">Value 1</td><td align="center">Value 2</td><td align="center">Value 3</td></tr><tr><td align="center">Value 4</td><td align="center">Value 5</td><td align="center">Value 6</td></tr><tr><td align="center">Value 7</td><td align="center">Value 8</td><td align="center">Value 9</td></tr></table>' }
      );
      addTableCompositeItem(miscItems.value, "Table (shape)", 180, 120, 3, 3);
      addVertexItem(
        miscItems.value,
        "Link",
        60,
        40,
        "text;html=1;strokeColor=none;fillColor=none;whiteSpace=wrap;align=center;verticalAlign=middle;fontColor=#0000EE;fontStyle=4;",
        { valueThumb: "Link", valueCreate: "Link" }
      );
      addVertexItem(
        miscItems.value,
        "Timestamp",
        160,
        20,
        "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;overflow=hidden;",
        { valueThumb: "%date{ddd mmm dd yyyy HH:MM:ss}%", valueCreate: "%date{ddd mmm dd yyyy HH:MM:ss}%", attrs: { placeholders: "1" } }
      );
      addVertexItem(
        miscItems.value,
        "Variable",
        80,
        20,
        "text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;overflow=hidden;",
        { valueThumb: "%name% Text", valueCreate: "%name% Text", attrs: { placeholders: "1", name: "Variable" } }
      );

      // Advanced（精确合并 Grapheditor 主要条目子集）
      addVertexItem(advancedItems.value, "Tape Data", 80, 80, "shape=tapeData;whiteSpace=wrap;html=1;perimeter=ellipsePerimeter;");
      addVertexItem(advancedItems.value, "Manual Input", 80, 80, "shape=manualInput;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Off Page Connector", 80, 80, "shape=offPageConnector;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Delay", 80, 40, "shape=delay;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Display", 80, 40, "shape=display;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Arrow Left", 100, 60, "shape=singleArrow;direction=west;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Arrow Right", 100, 60, "shape=singleArrow;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Arrow Up", 60, 100, "shape=singleArrow;direction=north;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Arrow Down", 60, 100, "shape=singleArrow;direction=south;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Double Arrow", 100, 60, "shape=doubleArrow;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Double Arrow Vertical", 60, 100, "shape=doubleArrow;direction=south;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "User", 40, 60, "shape=actor;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Corner", 80, 80, "shape=corner;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Tee", 80, 80, "shape=tee;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Data Store", 60, 60, "shape=datastore;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Ellipse + Divider H", 80, 80, "shape=lineEllipse;perimeter=ellipsePerimeter;whiteSpace=wrap;html=1;backgroundOutline=1;");
      addVertexItem(advancedItems.value, "Ellipse + Divider V", 80, 80, "shape=lineEllipse;line=vertical;perimeter=ellipsePerimeter;whiteSpace=wrap;html=1;backgroundOutline=1;");
      addVertexItem(advancedItems.value, "Sort", 80, 80, "shape=sortShape;perimeter=rhombusPerimeter;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Collate", 80, 80, "shape=collate;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Switch", 60, 60, "shape=switch;whiteSpace=wrap;html=1;");
      addVertexItem(advancedItems.value, "Container", 200, 200, "swimlane;", { valueThumb: "Container", valueCreate: "Container" });

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
