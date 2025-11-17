## 背景

* Grapheditor 右键弹出菜单中对边提供“Add Waypoint”功能，核心逻辑在 `www/js/Actions.js:1238`（添加拐点）与 `www/js/Menus.js:1180-1219`（在弹出菜单中决定显示“添加/移除/清除拐点”）。

* VueComponents 当前未自定义右键菜单，`MxGraphCanvas.vue` 仅完成基本交互初始化（`VueComponents/src/MxGraphCanvas.vue:33-66`）。

## 目标

* 在 VueComponents 的画布组件中加入自定义右键菜单，当右键点击到边时显示“添加拐点”，点击后在最近线段插入一个控制点。

## 具体改动

* 修改文件：`javascript/examples/VueComponents/src/MxGraphCanvas.vue`

* 在 `initGraph()` 完成 graph 初始化后，设置 `graph.popupMenuHandler.factoryMethod = (menu, cell, evt) => { ... }`。

* 逻辑：

  * 仅在 `graph.getModel().isEdge(cell)` 且 `mxUtils.getValue(style, mxConstants.STYLE_SHAPE, null) !== 'arrow'` 时添加菜单项。

  * 坐标转换：依据 `Actions.js:1248-1269` 的实现，将 `graph.popupMenuHandler.triggerX/triggerY` 转换到模型坐标，考虑 `view.translate`、`view.scale` 以及父几何偏移，使用 `graph.snap` 对齐网格。

  * 插入点：参考 `mxEdgeHandler.prototype.addPointAt` 的算法（`VueComponents/vendor/mxgraph/js/handler/mxEdgeHandler.js:2018-2053`），计算最近线段下标 `mxUtils.findNearestSegment(state, worldX, worldY)`，克隆并更新 `mxGeometry.points`，通过 `graph.getModel().setGeometry(cell, geo)` 写回。

* 文案：菜单项使用中文标签“添加拐点”。

* 实现将提供函数级注释，便于后续维护。

## 示例代码（将添加到 initGraph 末尾）

```js
/**
 * createEdgePopupMenu
 * 为边添加右键菜单：插入一个拐点（控制点）到最近的线段
 */
function createEdgePopupMenu(graph) {
  graph.popupMenuHandler.factoryMethod = function(menu, cell, evt) {
    // 仅对边启用，且排除纯箭头形状（与 Grapheditor 行为保持一致）
    const state = cell && graph.view.getState(cell);
    const style = state && state.style;
    const isEdge = !!cell && graph.getModel().isEdge(cell);
    const isArrowShape = style && mxUtils.getValue(style, mxConstants.STYLE_SHAPE, null) === 'arrow';
    if (!isEdge || isArrowShape) return;

    menu.addItem('添加拐点', null, function() {
      const t = graph.view.translate; const s = graph.view.scale;
      let dx = t.x, dy = t.y;
      // 累加父几何偏移，确保坐标计算在模型空间正确
      let parent = graph.getModel().getParent(cell);
      let pgeo = graph.getCellGeometry(parent);
      while (graph.getModel().isVertex(parent) && pgeo != null) {
        dx += pgeo.x; dy += pgeo.y;
        parent = graph.getModel().getParent(parent);
        pgeo = graph.getCellGeometry(parent);
      }
      const x = Math.round(graph.snap(graph.popupMenuHandler.triggerX / s - dx));
      const y = Math.round(graph.snap(graph.popupMenuHandler.triggerY / s - dy));

      const geo0 = graph.getCellGeometry(cell);
      if (!geo0) return;
      const geo = geo0.clone();
      const offset = new mxPoint(t.x * s, t.y * s);
      const pState = graph.view.getState(graph.getModel().getParent(cell));
      const off = pState ? new mxPoint(pState.x, pState.y) : offset;
      const worldX = x * s + off.x; const worldY = y * s + off.y;
      const idx = mxUtils.findNearestSegment(state, worldX, worldY);
      const pt = new mxPoint(x, y);
      if (!geo.points || geo.points.length === 0) geo.points = [pt]; else geo.points.splice(idx, 0, pt);
      graph.getModel().beginUpdate();
      try { graph.getModel().setGeometry(cell, geo); } finally { graph.getModel().endUpdate(); }
    });
  };
}
```

然后在 `initGraph()` 末尾调用：`createEdgePopupMenu(graph)`。

## 验证

* 运行 Vue 示例，添加两个顶点并连线。

* 右键点击该边，弹出菜单出现“添加拐点”，点击后边上出现新的控制点，可拖动形成折线或曲线。

## 可选扩展（后续）

* 在点击到拐点手柄位置时显示“删除拐点”。

* 在选中单条或多条边时提供“清除拐点”。

