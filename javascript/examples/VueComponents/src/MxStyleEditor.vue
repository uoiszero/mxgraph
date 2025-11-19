<template>
  <div class="style-editor">
    <div class="row style-text">
      <label>style</label><textarea v-model="styleText"></textarea>
    </div>
    <div class="row">
      <label>shape</label
      ><select v-model="shapeType">
        <option
          v-for="item in shapeTypeOptions"
          :key="item.value"
          :value="item.value">
          {{ item.label }}
        </option>
      </select>
    </div>
    <div class="row">
      <label>Arrow Style</label>
      <select v-model="arrowStyle">
        <option
          v-for="item in arrowStyleOptions"
          :key="item.value"
          :value="item.value">
          {{ item.label }}
        </option>
      </select>
    </div>
    <div class="row">
      <label>width</label
      ><input
        type="number"
        step="1"
        min="1"
        v-model.number="width"
        :placeholder="defaultHints.width" />
    </div>
    <div class="row">
      <label>strokeWidth</label
      ><input
        type="number"
        step="1"
        min="1"
        v-model.number="strokeWidth"
        :placeholder="defaultHints.strokeWidth" />
    </div>
    <div class="row">
      <label>strokeColor</label
      ><input
        type="color"
        v-model="strokeColor" />
    </div>
    <div class="row">
      <label>lineType</label
      ><select v-model="lineType">
        <option value="solid">实线</option>
        <option value="dashed">虚线</option>
      </select>
    </div>
    <div class="row">
      <label>startSize</label
      ><input
        type="number"
        step="1"
        min="1"
        v-model.number="startSize"
        :placeholder="defaultHints.startSize" />
    </div>
    <div class="row">
      <label>endSize</label
      ><input
        type="number"
        step="1"
        min="1"
        v-model.number="endSize"
        :placeholder="defaultHints.endSize" />
    </div>
    <div class="row">
      <label>startWidth</label
      ><input
        type="number"
        step="1"
        min="1"
        v-model.number="startWidth"
        :placeholder="defaultHints.startWidth" />
    </div>
    <div class="row">
      <label>endWidth</label
      ><input
        type="number"
        step="1"
        min="1"
        v-model.number="endWidth"
        :placeholder="defaultHints.endWidth" />
    </div>
    <div class="row">
      <label>fillColor</label
      ><input
        type="color"
        v-model="fillColor" />
    </div>
    <div class="row actions">
      <button @click="applyText">应用文本</button>
      <button @click="applyFields">应用参数</button>
      <button @click="refreshFromSelection">读取选中</button>
      <button @click="deleteSelected">删除选中</button>
    </div>
  </div>
</template>

<script>
import {
  ref,
  onMounted,
  onBeforeUnmount,
  computed,
  unref,
  inject,
  watch,
} from "vue";

export default {
  name: "MxStyleEditor",
  props: { getGraph: { type: Function, default: null } },
  setup(props) {
    const styleText = ref("");
    const width = ref(null);
    const strokeWidth = ref(null);
    const strokeColor = ref("");
    const lineType = ref("solid");
    const shapeType = ref("connection");
    const arrowStyle = ref("endOnly");
    const startSize = ref(null);
    const endSize = ref(null);
    const startWidth = ref(null);
    const endWidth = ref(null);
    const fillColor = ref("");
    const defaultHints = ref({
      width: "",
      strokeWidth: "",
      startSize: "",
      endSize: "",
      startWidth: "",
      endWidth: "",
    });
    const injectedGetter = inject("getGraph", null);
    const injectedGraphRef = inject("mxGraph", null);
    const shapeTypeOptions = computed(() => [
      {
        label: "Connection",
        value: "connection",
      },
      {
        label: "Link",
        value: "link",
      },
      {
        label: "Arrow",
        value: "flexArrow",
      },
      {
        label: "Simple Arrow",
        value: "arrow",
      },
    ]);
    const arrowStyleOptions = computed(() => [
      {
        label: "无箭头",
        value: "none",
      },
      {
        label: "仅末端箭头",
        value: "endOnly",
      },
      {
        label: "仅起始箭头",
        value: "startOnly",
      },
      {
        label: "两端箭头",
        value: "both",
      },
    ]);

    /**
     * getActiveGraph
     * 获取当前 mxGraph 实例
     */
    /**
     * getActiveGraph
     * 获取当前 mxGraph 实例（优先使用 props/inject，再回退全局）
     */
    function getActiveGraph() {
      if (typeof props.getGraph === "function") {
        try {
          const g = props.getGraph();
          if (g) return g;
        } catch (e) {}
      }
      if (typeof injectedGetter === "function") {
        try {
          const g = injectedGetter();
          if (g) return g;
        } catch (e) {}
      }
      if (injectedGraphRef && injectedGraphRef.value)
        return injectedGraphRef.value;
      if (typeof window !== "undefined" && window.__lastGraphRef)
        return window.__lastGraphRef();
      return null;
    }

    /**
     * parseStyle
     * 将分号分隔的 style 字符串解析为对象
     */
    function parseStyle(s) {
      const obj = {};
      (s || "").split(";").forEach(kv => {
        const i = kv.indexOf("=");
        if (i > 0) obj[kv.slice(0, i)] = kv.slice(i + 1);
      });
      return obj;
    }

    /**
     * stringifyStyle
     * 将对象序列化为 style 字符串
     */
    function stringifyStyle(o) {
      return (
        Object.keys(o)
          .map(k => `${k}=${o[k]}`)
          .join(";") + (Object.keys(o).length ? ";" : "")
      );
    }

    /**
     * 获取箭头样式
     * @param graph mxGraph 实例
     * @param style 样式对象
     * @param cell 边对象
     */
    function getArrowStyle(graph, style, cell) {
      const startArrowName = (
        style.startArrow ||
        graph.view.getState(cell)?.style?.startArrow ||
        ""
      ).toString();
      const endArrowName = (
        style.endArrow ||
        graph.view.getState(cell)?.style?.endArrow ||
        ""
      ).toString();
      /*
       * 2025/11/19 Yue Ao
       * 注意，样式为空或者为 none 时，都表示无箭头
       */
      /**
       * 判断是否有箭头样式
       * @param s 箭头样式
       */
      const hasArrow = s =>
        typeof s !== "undefined" && s !== "" && s !== null && s !== "none";
      if (hasArrow(startArrowName) && hasArrow(endArrowName)) {
        arrowStyle.value = "both";
      } else if (hasArrow(startArrowName)) {
        arrowStyle.value = "startOnly";
      } else if (hasArrow(endArrowName)) {
        arrowStyle.value = "endOnly";
      } else {
        arrowStyle.value = "none";
      }
    }

    /**
     * refreshFromSelection
     * 从当前选中边读取 style 字符串与关键参数
     */
    function refreshFromSelection() {
      const graph = getActiveGraph();
      if (!graph) return;
      const cell = graph.getSelectionCell();
      if (!cell) return;
      const style = graph.getModel().getStyle(cell) || "";
      styleText.value = style;
      const o = parseStyle(style);
      width.value =
        o.width != null ? Math.max(1, Math.round(Number(o.width))) : null;
      strokeWidth.value =
        o[mxConstants.STYLE_STROKEWIDTH] != null
          ? Math.max(1, Math.round(Number(o[mxConstants.STYLE_STROKEWIDTH])))
          : null;
      strokeColor.value = o[mxConstants.STYLE_STROKECOLOR] || "";
      const dashedFlag =
        o[mxConstants.STYLE_DASHED] != null
          ? o[mxConstants.STYLE_DASHED] === "1" ||
            o[mxConstants.STYLE_DASHED] === "true"
          : !!graph.view.getState(cell)?.style?.dashed;
      lineType.value = dashedFlag ? "dashed" : "solid";
      const shapeName = (
        o.shape ||
        graph.view.getState(cell)?.style?.shape ||
        ""
      ).toString();
      shapeType.value = shapeTypeOptions.value
        .map(({ value }) => value)
        .includes(shapeName)
        ? shapeName || "connection"
        : "connection";
      getArrowStyle(graph, o, cell);
      startSize.value =
        o[mxConstants.STYLE_STARTSIZE] != null
          ? Math.max(1, Math.round(Number(o[mxConstants.STYLE_STARTSIZE])))
          : null;
      endSize.value =
        o[mxConstants.STYLE_ENDSIZE] != null
          ? Math.max(1, Math.round(Number(o[mxConstants.STYLE_ENDSIZE])))
          : null;
      startWidth.value =
        o.startWidth != null
          ? Math.max(1, Math.round(Number(o.startWidth)))
          : null;
      endWidth.value =
        o.endWidth != null ? Math.max(1, Math.round(Number(o.endWidth))) : null;
      fillColor.value = o.fillColor || "";
      refreshDefaultHints(graph, cell, o);
    }

    /**
     * refreshDefaultHints
     * 计算并显示当前选中边在未显式设置时的默认值提示
     */
    function refreshDefaultHints(graph, cell, styleObj) {
      const view = graph.getView();
      const state = view.getState(cell);
      const shapeName = (
        styleObj.shape ||
        (state && state.style && state.style.shape) ||
        ""
      ).toString();
      const _strokeWidth =
        Number(
          (state && state.shape && state.shape.strokewidth) ||
            (styleObj.strokeWidth != null ? styleObj.strokeWidth : 1)
        ) || 1;

      let defWidth = "";
      let defStartSize = "";
      let defEndSize = "";
      let defStartWidth = "";
      let defEndWidth = "";

      if (shapeName === "link") {
        const base = 4;
        defWidth = String(base + Math.max(0, _strokeWidth - 1));
      } else if (shapeName === "flexArrow") {
        const base = 10;
        defWidth = String(base + Math.max(0, _strokeWidth - 1));
        defStartWidth = "20";
        defEndWidth = "20";
      }

      const defStrokeWidth = String(_strokeWidth);

      // 端点尺寸默认：连线用 DEFAULT_MARKERSIZE，箭头族用 ARROW_SIZE
      const isArrowFamily =
        shapeName === "arrow" ||
        shapeName === "flexArrow" ||
        shapeName === "doubleArrow" ||
        shapeName === "singleArrow";
      defStartSize = String(
        isArrowFamily ? mxConstants.ARROW_SIZE : mxConstants.DEFAULT_MARKERSIZE
      );
      defEndSize = defStartSize;

      defaultHints.value = {
        width: defWidth,
        strokeWidth: defStrokeWidth,
        startSize: defStartSize,
        endSize: defEndSize,
        startWidth: defStartWidth,
        endWidth: defEndWidth,
      };
    }

    /**
     * normalizePositiveInt
     * 将输入值规范化为>=1的整数；null/undefined 保持为 null
     */
    function normalizePositiveInt(v) {
      if (v == null || Number.isNaN(v)) return null;
      return Math.max(1, Math.round(Number(v)));
    }

    /**
     * applyText
     * 以文本方式覆盖选中单元的样式
     */
    function applyText() {
      const graph = getActiveGraph();
      if (!graph) return;
      const cells = graph.getSelectionCells();
      if (!cells?.length) return;
      graph.getModel().beginUpdate();
      try {
        for (const c of cells) graph.getModel().setStyle(c, styleText.value);
      } finally {
        graph.getModel().endUpdate();
      }
      graph.refresh();
    }

    /**
     * applyArrowStyle
     * 应用箭头样式
     * @param graph 图实例
     * @param cells 选中单元
     */
    function setArrowStyle(graph, cells) {
      // 首先将形状设置为 flexArrow
      graph.setCellStyles(mxConstants.STYLE_SHAPE, "flexArrow", cells);
      // 其次根据箭头样式来设置起始箭头和末端箭头
      const _style = unref(arrowStyle);
      if (_style === "none") {
        graph.setCellStyles(
          mxConstants.STYLE_STARTARROW,
          mxConstants.NONE,
          cells
        );
        graph.setCellStyles(
          mxConstants.STYLE_ENDARROW,
          mxConstants.NONE,
          cells
        );
      } else if (_style === "startOnly") {
        graph.setCellStyles(
          mxConstants.STYLE_STARTARROW,
          mxConstants.ARROW_BLOCK,
          cells
        );
        graph.setCellStyles(
          mxConstants.STYLE_ENDARROW,
          mxConstants.NONE,
          cells
        );
      } else if (_style === "endOnly") {
        graph.setCellStyles(
          mxConstants.STYLE_STARTARROW,
          mxConstants.NONE,
          cells
        );
        graph.setCellStyles(
          mxConstants.STYLE_ENDARROW,
          mxConstants.ARROW_BLOCK,
          cells
        );
      } else {
        graph.setCellStyles(
          mxConstants.STYLE_STARTARROW,
          mxConstants.ARROW_BLOCK,
          cells
        );
        graph.setCellStyles(
          mxConstants.STYLE_ENDARROW,
          mxConstants.ARROW_BLOCK,
          cells
        );
        // 其次根据箭头样式来
      }
    }

    /**
     * applyShapeStyle
     * 应用形状样式
     * @param graph 图实例
     * @param cells 选中单元
     */
    function setShapeStyle(graph, cells) {
      const _type = unref(shapeType);
      if (_type === "connection") {
        graph.setCellStyles(mxConstants.STYLE_SHAPE, null, cells);
        graph.setCellStyles(mxConstants.STYLE_STARTSIZE, null, cells);
        graph.setCellStyles(mxConstants.STYLE_ENDSIZE, null, cells);
        graph.setCellStyles("width", null, cells);
        graph.setCellStyles(mxConstants.STYLE_NOEDGESTYLE, null, cells);
        graph.setCellStyles(mxConstants.STYLE_EDGE, null, cells);
      } else if (
        _type === "link" ||
        _type === "flexArrow" ||
        _type === "arrow"
      ) {
        graph.setCellStyles(mxConstants.STYLE_SHAPE, _type, cells);
        graph.setCellStyles(mxConstants.STYLE_STARTSIZE, null, cells);
        graph.setCellStyles(mxConstants.STYLE_ENDSIZE, null, cells);
        graph.setCellStyles("width", null, cells);
        if (_type === "flexArrow") {
          graph.setCellStyles(
            mxConstants.STYLE_ENDARROW,
            mxConstants.ARROW_BLOCK,
            cells
          );
          graph.setCellStyles(
            mxConstants.STYLE_STARTARROW,
            mxConstants.NONE,
            cells
          );
          graph.setCellStyles(mxConstants.STYLE_NOEDGESTYLE, "1", cells);
          graph.setCellStyles(mxConstants.STYLE_EDGE, null, cells);
        }
      }
    }

    /**
     * applyFields
     * 以字段方式设置样式键，未设的键不改动
     */
    function applyFields() {
      const graph = getActiveGraph();
      if (!graph) return;
      const cells = graph.getSelectionCells();
      if (!cells?.length) return;
      const set = (k, v) => (v == null ? null : String(v));
      graph.getModel().beginUpdate();
      try {
        // 先应用 shape 类型选择
        setShapeStyle(graph, cells);
        // 再应用箭头样式
        setArrowStyle(graph, cells);
        const _width = normalizePositiveInt(width.value);
        if (_width != null) graph.setCellStyles("width", String(_width), cells);
        const _sw = normalizePositiveInt(strokeWidth.value);
        if (_sw != null)
          graph.setCellStyles(
            mxConstants.STYLE_STROKEWIDTH,
            String(_sw),
            cells
          );
        if (strokeColor.value)
          graph.setCellStyles(
            mxConstants.STYLE_STROKECOLOR,
            strokeColor.value,
            cells
          );
        if (lineType.value)
          graph.setCellStyles(
            mxConstants.STYLE_DASHED,
            lineType.value === "dashed" ? "1" : null,
            cells
          );
        const _ss = normalizePositiveInt(startSize.value);
        if (_ss != null)
          graph.setCellStyles(mxConstants.STYLE_STARTSIZE, String(_ss), cells);
        const _es = normalizePositiveInt(endSize.value);
        if (_es != null)
          graph.setCellStyles(mxConstants.STYLE_ENDSIZE, String(_es), cells);
        const _stw = normalizePositiveInt(startWidth.value);
        if (_stw != null)
          graph.setCellStyles("startWidth", String(_stw), cells);
        const _enw = normalizePositiveInt(endWidth.value);
        if (_enw != null) graph.setCellStyles("endWidth", String(_enw), cells);
        if (fillColor.value)
          graph.setCellStyles(
            mxConstants.STYLE_FILLCOLOR,
            fillColor.value,
            cells
          );
      } finally {
        graph.getModel().endUpdate();
      }
      graph.refresh();
      refreshFromSelection();
    }

    /**
     * deleteSelected
     * 删除当前选中的图形；同时清理由侧栏创建的隐形端点
     */
    function deleteSelected() {
      const graph = getActiveGraph();
      if (!graph) return;
      if (graph.isEditing()) return;
      const model = graph.getModel();
      const selected = graph.getSelectionCells();
      if (!selected || !selected.length) return;
      const toRemove = selected.slice();
      for (let i = 0; i < selected.length; i++) {
        const c = selected[i];
        if (model.isEdge(c)) {
          const s = model.getTerminal(c, true);
          const t = model.getTerminal(c, false);
          const terms = [s, t];
          for (let j = 0; j < terms.length; j++) {
            const term = terms[j];
            if (!term) continue;
            const style = model.getStyle(term) || "";
            const isInvisiblePoint =
              style.indexOf("shape=point") !== -1 &&
              style.indexOf("fillColor=none") !== -1 &&
              style.indexOf("strokeColor=none") !== -1;
            if (isInvisiblePoint) {
              const deg = model.getEdgeCount(term);
              const hasChildren = model.getChildCount(term) > 0;
              if (deg <= 1 && !hasChildren) toRemove.push(term);
            }
          }
        }
      }
      const topmost = model.getTopmostCells(toRemove);
      model.beginUpdate();
      try {
        graph.removeCells(topmost, true);
      } finally {
        model.endUpdate();
      }
    }

    onMounted(() => refreshFromSelection());

    /**
     * bindSelectionListener
     * 绑定图形选中事件（SelectionModel CHANGE），自动读取并展示样式参数
     */
    /**
     * bindSelectionListener
     * 绑定图形选中事件（SelectionModel CHANGE），自动读取并展示样式参数
     */
    function bindSelectionListener() {
      const graph = getActiveGraph();
      if (!graph) return;
      const listener = function () {
        refreshFromSelection();
      };
      graph.getSelectionModel().addListener(mxEvent.CHANGE, listener);
      selectionListener.value = listener;
    }

    const selectionListener = ref(null);
    onMounted(() => {
      bindSelectionListener();
    });

    /**
     * ensureSelectionBinding
     * 监听图实例就绪/切换，确保成功绑定选中事件并进行一次初始刷新
     */
    function ensureSelectionBinding() {
      const graph = getActiveGraph();
      if (!graph) return;
      // 若尚未绑定，则绑定并刷新一次
      if (!selectionListener.value) {
        bindSelectionListener();
        refreshFromSelection();
      }
    }

    // 监听注入的图引用变化，图初始化后自动绑定
    if (injectedGraphRef) {
      watch(
        () => injectedGraphRef.value,
        () => {
          ensureSelectionBinding();
        }
      );
    } else {
      // 回退：定时检查一次，避免注入缺失但全局引用稍后就绪的情况
      const probe = setInterval(() => {
        if (getActiveGraph()) {
          ensureSelectionBinding();
          clearInterval(probe);
        }
      }, 300);
    }

    onBeforeUnmount(() => {
      const graph = getActiveGraph();
      if (graph && selectionListener.value)
        graph.getSelectionModel().removeListener(selectionListener.value);
      selectionListener.value = null;
    });

    return {
      styleText,
      width,
      shapeType,
      arrowStyle,
      strokeWidth,
      strokeColor,
      lineType,
      startSize,
      endSize,
      startWidth,
      endWidth,
      fillColor,
      bindSelectionListener,
      applyText,
      applyFields,
      refreshFromSelection,
      deleteSelected,
      defaultHints,
      shapeTypeOptions,
      arrowStyleOptions,
    };
  },
};
</script>

<style scoped>
.style-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
}
.row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}
label {
  font-size: 12px;
  color: #334155;
  width: 80px;
  flex: 0 0 80px;
}
textarea {
  width: 100%;
  height: 100px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}

.style-text {
  flex-direction: column;
  justify-content: flex-start;
  align-items: start;

  label {
    flex: none;
  }
}
input[type="number"],
input[type="text"] {
  width: 120px;
  padding: 4px 6px;
  margin-left: auto;
}
input[type="number"] {
  text-align: right;
}
/*
    注意，颜色选择器的宽度计算和其他的不同
 */
input[type="color"],
select {
  width: 136px;
  height: 28px;
}
.actions {
  justify-content: flex-end;
}
button {
  padding: 4px 8px;
  border: 1px solid #94a3b8;
  border-radius: 4px;
  background: #f8fafc;
  cursor: pointer;
}
button:hover {
  background: #eef2f7;
}
</style>
