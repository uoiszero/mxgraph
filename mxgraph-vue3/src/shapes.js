/**
 * 注册所有自定义形状
 * @param {any} mxns mx 命名空间对象
 * @returns {void}
 */
export function registerCustomShapes(mxns) {
  const {
    mxUtils,
    mxCellRenderer,
    mxArrowConnector,
    mxActor,
    mxRectangleShape,
    mxEllipse,
    mxConstants
  } = mxns;

  // flexArrow
  function FlexArrowShape() { mxArrowConnector.call(this); this.spacing = 0; }
  mxUtils.extend(FlexArrowShape, mxArrowConnector);
  FlexArrowShape.prototype.defaultWidth = 10;
  FlexArrowShape.prototype.defaultArrowWidth = 20;
  FlexArrowShape.prototype.getStartArrowWidth = function () {
    return this.getEdgeWidth() + mxUtils.getNumber(this.style, 'startWidth', this.defaultArrowWidth);
  };
  FlexArrowShape.prototype.getEndArrowWidth = function () {
    return this.getEdgeWidth() + mxUtils.getNumber(this.style, 'endWidth', this.defaultArrowWidth);
  };
  FlexArrowShape.prototype.getEdgeWidth = function () {
    return mxUtils.getNumber(this.style, 'width', this.defaultWidth) + Math.max(0, this.strokewidth - 1);
  };
  mxCellRenderer.registerShape('flexArrow', FlexArrowShape);

  // link
  function LinkShape() { mxArrowConnector.call(this); this.spacing = 0; }
  mxUtils.extend(LinkShape, mxArrowConnector);
  LinkShape.prototype.defaultWidth = 4;
  LinkShape.prototype.isOpenEnded = function () { return true; };
  LinkShape.prototype.getEdgeWidth = function () {
    const base = mxUtils.getNumber(this.style, 'width', this.defaultWidth);
    return base + Math.max(0, this.strokewidth - 1);
  };
  LinkShape.prototype.isArrowRounded = function () { return this.isRounded; };
  mxCellRenderer.registerShape('link', LinkShape);

  // cube
  function CubeShape() { mxns.mxCylinder.call(this); }
  mxUtils.extend(CubeShape, mxns.mxCylinder);
  CubeShape.prototype.size = 20; CubeShape.prototype.darkOpacity = 0; CubeShape.prototype.darkOpacity2 = 0;
  CubeShape.prototype.paintVertexShape = function (c, x, y, w, h) {
    var s = Math.max(0, Math.min(w, Math.min(h, parseFloat(mxUtils.getValue(this.style, 'size', this.size)))));
    var op = Math.max(-1, Math.min(1, parseFloat(mxUtils.getValue(this.style, 'darkOpacity', this.darkOpacity))));
    var op2 = Math.max(-1, Math.min(1, parseFloat(mxUtils.getValue(this.style, 'darkOpacity2', this.darkOpacity2))));
    c.translate(x, y);
    c.begin(); c.moveTo(0, 0); c.lineTo(w - s, 0); c.lineTo(w, s); c.lineTo(w, h); c.lineTo(s, h); c.lineTo(0, h - s); c.lineTo(0, 0); c.close(); c.end(); c.fillAndStroke();
    if (!this.outline) {
      c.setShadow(false);
      if (op != 0) { c.setFillAlpha(Math.abs(op)); c.setFillColor(op < 0 ? '#FFFFFF' : '#000000'); c.begin(); c.moveTo(0, 0); c.lineTo(w - s, 0); c.lineTo(w, s); c.lineTo(s, s); c.close(); c.fill(); }
      if (op2 != 0) { c.setFillAlpha(Math.abs(op2)); c.setFillColor(op2 < 0 ? '#FFFFFF' : '#000000'); c.begin(); c.moveTo(0, 0); c.lineTo(s, s); c.lineTo(s, h); c.lineTo(0, h - s); c.close(); c.fill(); }
      c.begin(); c.moveTo(s, h); c.lineTo(s, s); c.lineTo(0, 0); c.moveTo(s, s); c.lineTo(w, s); c.end(); c.stroke();
    }
  };
  CubeShape.prototype.getLabelMargins = function (rect) {
    if (mxUtils.getValue(this.style, 'boundedLbl', false)) { var s = parseFloat(mxUtils.getValue(this.style, 'size', this.size)) * this.scale; return new mxns.mxRectangle(s, s, 0, 0); }
    return null;
  };
  mxCellRenderer.registerShape('cube', CubeShape);

  // note
  function NoteShape() { mxns.mxCylinder.call(this); }
  mxUtils.extend(NoteShape, mxns.mxCylinder);
  NoteShape.prototype.size = 30; NoteShape.prototype.darkOpacity = 0;
  NoteShape.prototype.paintVertexShape = function (c, x, y, w, h) {
    var s = Math.max(0, Math.min(w, Math.min(h, parseFloat(mxUtils.getValue(this.style, 'size', this.size)))));
    var op = Math.max(-1, Math.min(1, parseFloat(mxUtils.getValue(this.style, 'darkOpacity', this.darkOpacity))));
    c.translate(x, y);
    c.begin(); c.moveTo(0, 0); c.lineTo(w - s, 0); c.lineTo(w, s); c.lineTo(w, h); c.lineTo(0, h); c.lineTo(0, 0); c.close(); c.end(); c.fillAndStroke();
    if (!this.outline) { c.setShadow(false); if (op != 0) { c.setFillAlpha(Math.abs(op)); c.setFillColor(op < 0 ? '#FFFFFF' : '#000000'); c.begin(); c.moveTo(w - s, 0); c.lineTo(w - s, s); c.lineTo(w, s); c.close(); c.fill(); }
      c.begin(); c.moveTo(w - s, 0); c.lineTo(w - s, s); c.lineTo(w, s); c.end(); c.stroke(); }
  };
  mxCellRenderer.registerShape('note', NoteShape);

  // card
  function CardShape() { mxActor.call(this); }
  mxUtils.extend(CardShape, mxActor);
  CardShape.prototype.size = 30; CardShape.prototype.isRoundable = function () { return true; };
  CardShape.prototype.redrawPath = function (c, x, y, w, h) {
    var s = Math.max(0, Math.min(w, Math.min(h, parseFloat(mxUtils.getValue(this.style, 'size', this.size)))));
    var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2;
    this.addPoints(c, [new mxns.mxPoint(s, 0), new mxns.mxPoint(w, 0), new mxns.mxPoint(w, h), new mxns.mxPoint(0, h), new mxns.mxPoint(0, s)], this.isRounded, arcSize, true);
    c.end();
  };
  mxCellRenderer.registerShape('card', CardShape);

  // tape
  function TapeShape() { mxActor.call(this); }
  mxUtils.extend(TapeShape, mxActor);
  TapeShape.prototype.size = 0.4;
  TapeShape.prototype.redrawPath = function (c, x, y, w, h) {
    var dy = h * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, 'size', this.size))));
    var fy = 1.4;
    c.moveTo(0, dy / 2); c.quadTo(w / 4, dy * fy, w / 2, dy / 2); c.quadTo((3 * w) / 4, dy * (1 - fy), w, dy / 2);
    c.lineTo(w, h - dy / 2); c.quadTo((3 * w) / 4, h - dy * fy, w / 2, h - dy / 2); c.quadTo(w / 4, h - dy * (1 - fy), 0, h - dy / 2); c.lineTo(0, dy / 2); c.close(); c.end();
  };
  mxCellRenderer.registerShape('tape', TapeShape);

  // document
  function DocumentShape() { mxActor.call(this); }
  mxUtils.extend(DocumentShape, mxActor);
  DocumentShape.prototype.size = 0.3;
  DocumentShape.prototype.getLabelMargins = function (rect) {
    if (mxUtils.getValue(this.style, 'boundedLbl', false)) return new mxns.mxRectangle(0, 0, 0, parseFloat(mxUtils.getValue(this.style, 'size', this.size)) * rect.height);
    return null;
  };
  DocumentShape.prototype.redrawPath = function (c, x, y, w, h) {
    var dy = h * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, 'size', this.size))));
    var fy = 1.4;
    c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w, h - dy / 2); c.quadTo((3 * w) / 4, h - dy * fy, w / 2, h - dy / 2); c.quadTo(w / 4, h - dy * (1 - fy), 0, h - dy / 2); c.lineTo(0, dy / 2); c.close(); c.end();
  };
  mxCellRenderer.registerShape('document', DocumentShape);

  // process
  function ProcessShape() { mxRectangleShape.call(this); }
  mxUtils.extend(ProcessShape, mxRectangleShape);
  ProcessShape.prototype.size = 0.1; ProcessShape.prototype.fixedSize = false;
  ProcessShape.prototype.isHtmlAllowed = function () { return false; };
  ProcessShape.prototype.getLabelBounds = function (rect) {
    if (mxUtils.getValue(this.state.style, mxConstants.STYLE_HORIZONTAL, true) == (this.direction == null || this.direction == mxConstants.DIRECTION_EAST || this.direction == mxConstants.DIRECTION_WEST)) {
      var w = rect.width, h = rect.height; var r = new mxns.mxRectangle(rect.x, rect.y, w, h);
      var inset = w * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, 'size', this.size))));
      if (this.isRounded) { var f = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.RECTANGLE_ROUNDING_FACTOR * 100) / 100; inset = Math.max(inset, Math.min(w * f, h * f)); }
      r.x += Math.round(inset); r.width -= Math.round(2 * inset); return r;
    }
    return rect;
  };
  ProcessShape.prototype.paintForeground = function (c, x, y, w, h) {
    var isFixedSize = mxUtils.getValue(this.style, 'fixedSize', this.fixedSize);
    var inset = parseFloat(mxUtils.getValue(this.style, 'size', this.size));
    inset = isFixedSize ? Math.max(0, Math.min(w, inset)) : w * Math.max(0, Math.min(1, inset));
    if (this.isRounded) { var f = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.RECTANGLE_ROUNDING_FACTOR * 100) / 100; inset = Math.max(inset, Math.min(w * f, h * f)); }
    inset = Math.round(inset);
    c.begin(); c.moveTo(x + inset, y); c.lineTo(x + inset, y + h); c.moveTo(x + w - inset, y); c.lineTo(x + w - inset, y + h); c.end(); c.stroke();
    mxRectangleShape.prototype.paintForeground.apply(this, arguments);
  };
  mxCellRenderer.registerShape('process', ProcessShape);

  // parallelogram
  function ParallelogramShape() { mxActor.call(this); }
  mxUtils.extend(ParallelogramShape, mxActor);
  ParallelogramShape.prototype.size = 0.2; ParallelogramShape.prototype.fixedSize = 20; ParallelogramShape.prototype.isRoundable = function () { return true; };
  ParallelogramShape.prototype.redrawPath = function (c, x, y, w, h) {
    var fixed = mxUtils.getValue(this.style, 'fixedSize', '0') != '0';
    var dx = fixed ? Math.max(0, Math.min(w, parseFloat(mxUtils.getValue(this.style, 'size', this.fixedSize)))) : w * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, 'size', this.size))));
    var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2;
    this.addPoints(c, [new mxns.mxPoint(0, h), new mxns.mxPoint(dx, 0), new mxns.mxPoint(w, 0), new mxns.mxPoint(w - dx, h)], this.isRounded, arcSize, true);
    c.end();
  };
  mxCellRenderer.registerShape('parallelogram', ParallelogramShape);

  // trapezoid
  function TrapezoidShape() { mxActor.call(this); }
  mxUtils.extend(TrapezoidShape, mxActor);
  TrapezoidShape.prototype.size = 0.2; TrapezoidShape.prototype.fixedSize = 20; TrapezoidShape.prototype.isRoundable = function () { return true; };
  TrapezoidShape.prototype.redrawPath = function (c, x, y, w, h) {
    var fixed = mxUtils.getValue(this.style, 'fixedSize', '0') != '0';
    var dx = fixed ? Math.max(0, Math.min(w * 0.5, parseFloat(mxUtils.getValue(this.style, 'size', this.fixedSize)))) : w * Math.max(0, Math.min(0.5, parseFloat(mxUtils.getValue(this.style, 'size', this.size))));
    var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2;
    this.addPoints(c, [new mxns.mxPoint(0, h), new mxns.mxPoint(dx, 0), new mxns.mxPoint(w - dx, 0), new mxns.mxPoint(w, h)], this.isRounded, arcSize, true);
  };
  mxCellRenderer.registerShape('trapezoid', TrapezoidShape);

  // singleArrow / doubleArrow
  function SingleArrowShape() { mxActor.call(this); }
  mxUtils.extend(SingleArrowShape, mxActor);
  SingleArrowShape.prototype.arrowWidth = 0.3; SingleArrowShape.prototype.arrowSize = 0.2;
  SingleArrowShape.prototype.redrawPath = function (c, x, y, w, h) {
    var aw = h * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, 'arrowWidth', this.arrowWidth))));
    var as = w * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, 'arrowSize', this.arrowSize))));
    var at = (h - aw) / 2; var ab = at + aw;
    var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2;
    this.addPoints(c, [new mxns.mxPoint(0, at), new mxns.mxPoint(w - as, at), new mxns.mxPoint(w - as, 0), new mxns.mxPoint(w, h / 2), new mxns.mxPoint(w - as, h), new mxns.mxPoint(w - as, ab), new mxns.mxPoint(0, ab)], this.isRounded, arcSize, true);
    c.end();
  };
  mxCellRenderer.registerShape('singleArrow', SingleArrowShape);

  function DoubleArrowShape() { mxActor.call(this); }
  mxUtils.extend(DoubleArrowShape, mxActor);
  DoubleArrowShape.prototype.redrawPath = function (c, x, y, w, h) {
    var aw = h * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, 'arrowWidth', SingleArrowShape.prototype.arrowWidth))));
    var as = w * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, 'arrowSize', SingleArrowShape.prototype.arrowSize))));
    var at = (h - aw) / 2; var ab = at + aw;
    var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2;
    this.addPoints(c, [new mxns.mxPoint(0, h / 2), new mxns.mxPoint(as, 0), new mxns.mxPoint(as, at), new mxns.mxPoint(w - as, at), new mxns.mxPoint(w - as, 0), new mxns.mxPoint(w, h / 2), new mxns.mxPoint(w - as, h), new mxns.mxPoint(w - as, ab), new mxns.mxPoint(as, ab), new mxns.mxPoint(as, h)], this.isRounded, arcSize, true);
    c.end();
  };
  mxCellRenderer.registerShape('doubleArrow', DoubleArrowShape);

  // dataStorage / datastore
  function DataStorageShape() { mxActor.call(this); }
  mxUtils.extend(DataStorageShape, mxActor);
  DataStorageShape.prototype.size = 0.1; DataStorageShape.prototype.fixedSize = 20;
  DataStorageShape.prototype.redrawPath = function (c, x, y, w, h) {
    var fixed = mxUtils.getValue(this.style, 'fixedSize', '0') != '0';
    var s = fixed ? Math.max(0, Math.min(w, parseFloat(mxUtils.getValue(this.style, 'size', this.fixedSize)))) : w * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, 'size', this.size))));
    c.moveTo(s, 0); c.lineTo(w, 0); c.quadTo(w - s * 2, h / 2, w, h); c.lineTo(s, h); c.quadTo(s - s * 2, h / 2, s, 0); c.close(); c.end();
  };
  mxCellRenderer.registerShape('dataStorage', DataStorageShape);

  function DataStoreShape() { mxns.mxCylinder.call(this); }
  mxUtils.extend(DataStoreShape, mxns.mxCylinder);
  DataStoreShape.prototype.redrawPath = function (c, x, y, w, h, isForeground) {
    var dy = Math.min(h / 2, Math.round(h / 8) + this.strokewidth - 1);
    if ((isForeground && this.fill != null) || (!isForeground && this.fill == null)) {
      c.moveTo(0, dy); c.curveTo(0, 2 * dy, w, 2 * dy, w, dy);
      if (!isForeground) { c.stroke(); c.begin(); }
      c.translate(0, dy / 2); c.moveTo(0, dy); c.curveTo(0, 2 * dy, w, 2 * dy, w, dy);
      if (!isForeground) { c.stroke(); c.begin(); }
      c.translate(0, dy / 2); c.moveTo(0, dy); c.curveTo(0, 2 * dy, w, 2 * dy, w, dy);
      if (!isForeground) { c.stroke(); c.begin(); }
      c.translate(0, -dy);
    }
    if (!isForeground) { c.moveTo(0, dy); c.curveTo(0, -dy / 3, w, -dy / 3, w, dy); c.lineTo(w, h - dy); c.curveTo(w, h + dy / 3, 0, h + dy / 3, 0, h - dy); c.close(); }
  };
  DataStoreShape.prototype.getLabelMargins = function (rect) {
    return new mxns.mxRectangle(0, 2.5 * Math.min(rect.height / 2, Math.round(rect.height / 8) + this.strokewidth - 1), 0, 0);
  };
  mxCellRenderer.registerShape('datastore', DataStoreShape);

  // logical or/xor
  function OrShape() { mxActor.call(this); }
  mxUtils.extend(OrShape, mxActor);
  OrShape.prototype.redrawPath = function (c, x, y, w, h) { c.moveTo(0, 0); c.quadTo(w, 0, w, h / 2); c.quadTo(w, h, 0, h); c.close(); c.end(); };
  mxCellRenderer.registerShape('or', OrShape);
  function XorShape() { mxActor.call(this); }
  mxUtils.extend(XorShape, mxActor);
  XorShape.prototype.redrawPath = function (c, x, y, w, h) { c.moveTo(0, 0); c.quadTo(w, 0, w, h / 2); c.quadTo(w, h, 0, h); c.quadTo(w / 2, h / 2, 0, 0); c.close(); c.end(); };
  mxCellRenderer.registerShape('xor', XorShape);

  // loopLimit / offPageConnector / tapeData
  function LoopLimitShape() { mxActor.call(this); }
  mxUtils.extend(LoopLimitShape, mxActor);
  LoopLimitShape.prototype.size = 20; LoopLimitShape.prototype.isRoundable = function () { return true; };
  LoopLimitShape.prototype.redrawPath = function (c, x, y, w, h) { var s = Math.min(w / 2, Math.min(h, parseFloat(mxUtils.getValue(this.style, 'size', this.size)))); var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2; this.addPoints(c, [new mxns.mxPoint(s, 0), new mxns.mxPoint(w - s, 0), new mxns.mxPoint(w, s * 0.8), new mxns.mxPoint(w, h), new mxns.mxPoint(0, h), new mxns.mxPoint(0, s * 0.8)], this.isRounded, arcSize, true); c.end(); };
  mxCellRenderer.registerShape('loopLimit', LoopLimitShape);
  function OffPageConnectorShape() { mxActor.call(this); }
  mxUtils.extend(OffPageConnectorShape, mxActor);
  OffPageConnectorShape.prototype.size = 3 / 8; OffPageConnectorShape.prototype.isRoundable = function () { return true; };
  OffPageConnectorShape.prototype.redrawPath = function (c, x, y, w, h) { var s = h * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, 'size', this.size)))); var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2; this.addPoints(c, [new mxns.mxPoint(0, 0), new mxns.mxPoint(w, 0), new mxns.mxPoint(w, h - s), new mxns.mxPoint(w / 2, h), new mxns.mxPoint(0, h - s)], this.isRounded, arcSize, true); c.end(); };
  mxCellRenderer.registerShape('offPageConnector', OffPageConnectorShape);
  function TapeDataShape() { mxEllipse.call(this); }
  mxUtils.extend(TapeDataShape, mxEllipse);
  TapeDataShape.prototype.paintVertexShape = function (c, x, y, w, h) { mxEllipse.prototype.paintVertexShape.apply(this, arguments); c.begin(); c.moveTo(x + w / 2, y + h); c.lineTo(x + w, y + h); c.end(); c.stroke(); };
  mxCellRenderer.registerShape('tapeData', TapeDataShape);

  // orEllipse / sumEllipse / lineEllipse
  function OrEllipseShape() { mxEllipse.call(this); }
  mxUtils.extend(OrEllipseShape, mxEllipse);
  OrEllipseShape.prototype.paintVertexShape = function (c, x, y, w, h) { mxEllipse.prototype.paintVertexShape.apply(this, arguments); c.setShadow(false); c.begin(); c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2); c.end(); c.stroke(); c.begin(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.end(); c.stroke(); };
  mxCellRenderer.registerShape('orEllipse', OrEllipseShape);
  function SumEllipseShape() { mxEllipse.call(this); }
  mxUtils.extend(SumEllipseShape, mxEllipse);
  SumEllipseShape.prototype.paintVertexShape = function (c, x, y, w, h) { mxEllipse.prototype.paintVertexShape.apply(this, arguments); var s2 = 0.145; c.setShadow(false); c.begin(); c.moveTo(x + w * s2, y + h * s2); c.lineTo(x + w * (1 - s2), y + h * (1 - s2)); c.end(); c.stroke(); c.begin(); c.moveTo(x + w * (1 - s2), y + h * s2); c.lineTo(x + w * s2, y + h * (1 - s2)); c.end(); c.stroke(); };
  mxCellRenderer.registerShape('sumEllipse', SumEllipseShape);
  function LineEllipseShape() { mxEllipse.call(this); }
  mxUtils.extend(LineEllipseShape, mxEllipse);
  LineEllipseShape.prototype.paintVertexShape = function (c, x, y, w, h) { mxEllipse.prototype.paintVertexShape.apply(this, arguments); c.setShadow(false); c.begin(); if (mxUtils.getValue(this.style, 'line') == 'vertical') { c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); } else { c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2); } c.end(); c.stroke(); };
  mxCellRenderer.registerShape('lineEllipse', LineEllipseShape);

  // delay / display
  function DelayShape() { mxActor.call(this); }
  mxUtils.extend(DelayShape, mxActor);
  DelayShape.prototype.redrawPath = function (c, x, y, w, h) { var dx = Math.min(w, h / 2); c.moveTo(0, 0); c.lineTo(w - dx, 0); c.quadTo(w, 0, w, h / 2); c.quadTo(w, h, w - dx, h); c.lineTo(0, h); c.close(); c.end(); };
  mxCellRenderer.registerShape('delay', DelayShape);
  function DisplayShape() { mxActor.call(this); }
  mxUtils.extend(DisplayShape, mxActor);
  DisplayShape.prototype.size = 0.25;
  DisplayShape.prototype.redrawPath = function (c, x, y, w, h) { var dx = Math.min(w, h / 2); var s = Math.min(w - dx, Math.max(0, parseFloat(mxUtils.getValue(this.style, 'size', this.size))) * w); c.moveTo(0, h / 2); c.lineTo(s, 0); c.lineTo(w - dx, 0); c.quadTo(w, 0, w, h / 2); c.quadTo(w, h, w - dx, h); c.lineTo(s, h); c.close(); c.end(); };
  mxCellRenderer.registerShape('display', DisplayShape);

  // corner / crossbar / tee
  function CornerShape() { mxActor.call(this); }
  mxUtils.extend(CornerShape, mxActor);
  CornerShape.prototype.redrawPath = function (c, x, y, w, h) { var dx = Math.max(0, Math.min(w, mxUtils.getNumber(this.style, 'dx', 20))); var dy = Math.max(0, Math.min(h, mxUtils.getNumber(this.style, 'dy', 20))); var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2; this.addPoints(c, [new mxns.mxPoint(0, 0), new mxns.mxPoint(w, 0), new mxns.mxPoint(w, dy), new mxns.mxPoint(dx, dy), new mxns.mxPoint(dx, h), new mxns.mxPoint(0, h)], this.isRounded, arcSize, true); c.end(); };
  mxCellRenderer.registerShape('corner', CornerShape);
  function CrossbarShape() { mxActor.call(this); }
  mxUtils.extend(CrossbarShape, mxActor);
  CrossbarShape.prototype.redrawPath = function (c, x, y, w, h) { c.moveTo(0, 0); c.lineTo(0, h); c.end(); c.moveTo(w, 0); c.lineTo(w, h); c.end(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.end(); };
  mxCellRenderer.registerShape('crossbar', CrossbarShape);
  function TeeShape() { mxActor.call(this); }
  mxUtils.extend(TeeShape, mxActor);
  TeeShape.prototype.redrawPath = function (c, x, y, w, h) { const dx = Math.max(0, Math.min(w, mxUtils.getNumber(this.style, 'dx', 20))); const dy = Math.max(0, Math.min(h, mxUtils.getNumber(this.style, 'dy', 20))); const arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2; this.addPoints(c, [new mxns.mxPoint(0, 0), new mxns.mxPoint(w, 0), new mxns.mxPoint(w, dy), new mxns.mxPoint((w + dx) / 2, dy), new mxns.mxPoint((w + dx) / 2, h), new mxns.mxPoint((w - dx) / 2, h), new mxns.mxPoint((w - dx) / 2, dy), new mxns.mxPoint(0, dy)], this.isRounded, arcSize, true); c.end(); };
  mxCellRenderer.registerShape('tee', TeeShape);

  // switch / callout / message
  function SwitchShape() { mxActor.call(this); }
  mxUtils.extend(SwitchShape, mxActor);
  SwitchShape.prototype.redrawPath = function (c, x, y, w, h) { var curve = 0.5; c.moveTo(0, 0); c.quadTo(w / 2, h * curve, w, 0); c.quadTo(w * (1 - curve), h / 2, w, h); c.quadTo(w / 2, h * (1 - curve), 0, h); c.quadTo(w * curve, h / 2, 0, 0); c.end(); };
  mxCellRenderer.registerShape('switch', SwitchShape);
  function CalloutShape() { mxns.mxHexagon.call(this); }
  mxUtils.extend(CalloutShape, mxns.mxHexagon);
  CalloutShape.prototype.size = 30; CalloutShape.prototype.position = 0.5; CalloutShape.prototype.position2 = 0.5; CalloutShape.prototype.base = 20; CalloutShape.prototype.isRoundable = function () { return true; };
  CalloutShape.prototype.getLabelMargins = function () { return new mxns.mxRectangle(0, 0, 0, parseFloat(mxUtils.getValue(this.style, 'size', this.size)) * this.scale); };
  CalloutShape.prototype.redrawPath = function (c, x, y, w, h) { var arcSize = mxUtils.getValue(this.style, mxConstants.STYLE_ARCSIZE, mxConstants.LINE_ARCSIZE) / 2; var s = Math.max(0, Math.min(h, parseFloat(mxUtils.getValue(this.style, 'size', this.size)))); var dx = w * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, 'position', this.position)))); var dx2 = w * Math.max(0, Math.min(1, parseFloat(mxUtils.getValue(this.style, 'position2', this.position2)))); var base = Math.max(0, Math.min(w, parseFloat(mxUtils.getValue(this.style, 'base', this.base)))); this.addPoints(c, [new mxns.mxPoint(0, 0), new mxns.mxPoint(w, 0), new mxns.mxPoint(w, h - s), new mxns.mxPoint(Math.min(w, dx + base), h - s), new mxns.mxPoint(dx2, h), new mxns.mxPoint(Math.max(0, dx), h - s), new mxns.mxPoint(0, h - s)], this.isRounded, arcSize, true, [4]); };
  mxCellRenderer.registerShape('callout', CalloutShape);
  function MessageShape() { mxns.mxCylinder.call(this); }
  mxUtils.extend(MessageShape, mxns.mxCylinder);
  MessageShape.prototype.redrawPath = function (path, x, y, w, h, isForeground) { if (isForeground) { path.moveTo(0, 0); path.lineTo(w / 2, h / 2); path.lineTo(w, 0); path.end(); } else { path.moveTo(0, 0); path.lineTo(w, 0); path.lineTo(w, h); path.lineTo(0, h); path.close(); path.end(); } };
  mxCellRenderer.registerShape('message', MessageShape);

  // uml family
  function UmlActorShape() { mxns.mxShape.call(this); }
  mxUtils.extend(UmlActorShape, mxns.mxShape);
  UmlActorShape.prototype.paintBackground = function (c, x, y, w, h) { c.translate(x, y); c.ellipse(w / 4, 0, w / 2, h / 4); c.fillAndStroke(); c.begin(); c.moveTo(w / 2, h / 4); c.lineTo(w / 2, (2 * h) / 3); c.moveTo(w / 2, h / 3); c.lineTo(0, h / 3); c.moveTo(w / 2, h / 3); c.lineTo(w, h / 3); c.moveTo(w / 2, (2 * h) / 3); c.lineTo(0, h); c.moveTo(w / 2, (2 * h) / 3); c.lineTo(w, h); c.end(); c.stroke(); };
  mxCellRenderer.registerShape('umlActor', UmlActorShape);
  function UmlBoundaryShape() { mxns.mxShape.call(this); }
  mxUtils.extend(UmlBoundaryShape, mxns.mxShape);
  UmlBoundaryShape.prototype.getLabelMargins = function (rect) { return new mxns.mxRectangle(rect.width / 6, 0, 0, 0); };
  UmlBoundaryShape.prototype.paintBackground = function (c, x, y, w, h) { c.translate(x, y); c.begin(); c.moveTo(0, h / 4); c.lineTo(0, (3 * h) / 4); c.end(); c.stroke(); c.begin(); c.moveTo(0, h / 2); c.lineTo(w / 6, h / 2); c.end(); c.stroke(); c.ellipse(w / 6, 0, (5 * w) / 6, h); c.fillAndStroke(); };
  mxCellRenderer.registerShape('umlBoundary', UmlBoundaryShape);
  function UmlEntityShape() { mxEllipse.call(this); }
  mxUtils.extend(UmlEntityShape, mxEllipse);
  UmlEntityShape.prototype.paintVertexShape = function (c, x, y, w, h) { mxEllipse.prototype.paintVertexShape.apply(this, arguments); c.begin(); c.moveTo(x + w / 8, y + h); c.lineTo(x + (7 * w) / 8, y + h); c.end(); c.stroke(); };
  mxCellRenderer.registerShape('umlEntity', UmlEntityShape);
  function UmlDestroyShape() { mxns.mxShape.call(this); }
  mxUtils.extend(UmlDestroyShape, mxns.mxShape);
  UmlDestroyShape.prototype.paintVertexShape = function (c, x, y, w, h) { c.translate(x, y); c.begin(); c.moveTo(w, 0); c.lineTo(0, h); c.moveTo(0, 0); c.lineTo(w, h); c.end(); c.stroke(); };
  mxCellRenderer.registerShape('umlDestroy', UmlDestroyShape);
  function UmlControlShape() { mxns.mxShape.call(this); }
  mxUtils.extend(UmlControlShape, mxns.mxShape);
  UmlControlShape.prototype.getLabelMargins = function (rect) { return new mxns.mxRectangle(rect.x, rect.y + rect.height / 8, rect.width, (7 * rect.height) / 8); };
  UmlControlShape.prototype.paintBackground = function (c, x, y, w, h) { c.translate(x, y); c.begin(); c.moveTo((3 * w) / 8, (h / 8) * 1.1); c.lineTo((5 * w) / 8, 0); c.end(); c.stroke(); c.ellipse(0, h / 8, w, (7 * h) / 8); c.fillAndStroke(); };
  UmlControlShape.prototype.paintForeground = function (c, x, y, w, h) { c.begin(); c.moveTo((3 * w) / 8, (h / 8) * 1.1); c.lineTo((5 * w) / 8, h / 4); c.end(); c.stroke(); };
  mxCellRenderer.registerShape('umlControl', UmlControlShape);
  function UmlLifeline() { mxns.mxRectangleShape.call(this); }
  mxUtils.extend(UmlLifeline, mxns.mxRectangleShape);
  UmlLifeline.prototype.size = 40; UmlLifeline.prototype.isHtmlAllowed = function () { return false; };
  UmlLifeline.prototype.getLabelBounds = function (rect) { var size = Math.max(0, Math.min(rect.height, parseFloat(mxUtils.getValue(this.style, 'size', this.size)) * this.scale)); return new mxns.mxRectangle(rect.x, rect.y, rect.width, size); };
  UmlLifeline.prototype.paintBackground = function (c, x, y, w, h) { var size = Math.max(0, Math.min(h, parseFloat(mxUtils.getValue(this.style, 'size', this.size)))); mxns.mxRectangleShape.prototype.paintBackground.call(this, c, x, y, w, size); if (size < h) { c.setDashed(true); c.begin(); c.moveTo(x + w / 2, y + size); c.lineTo(x + w / 2, y + h); c.end(); c.stroke(); } };
  UmlLifeline.prototype.paintForeground = function (c, x, y, w, h) { var size = Math.max(0, Math.min(h, parseFloat(mxUtils.getValue(this.style, 'size', this.size)))); mxns.mxRectangleShape.prototype.paintForeground.call(this, c, x, y, w, Math.min(h, size)); };
  mxCellRenderer.registerShape('umlLifeline', UmlLifeline);
  function UmlFrame() { mxns.mxShape.call(this); }
  mxUtils.extend(UmlFrame, mxns.mxShape);
  UmlFrame.prototype.width = 60; UmlFrame.prototype.height = 30; UmlFrame.prototype.corner = 10;
  UmlFrame.prototype.getLabelMargins = function (rect) { return new mxns.mxRectangle(0, 0, rect.width - parseFloat(mxUtils.getValue(this.style, 'width', this.width) * this.scale), rect.height - parseFloat(mxUtils.getValue(this.style, 'height', this.height) * this.scale)); };
  UmlFrame.prototype.paintBackground = function (c, x, y, w, h) { var co = this.corner; var w0 = Math.min(w, Math.max(co, parseFloat(mxUtils.getValue(this.style, 'width', this.width)))); var h0 = Math.min(h, Math.max(co * 1.5, parseFloat(mxUtils.getValue(this.style, 'height', this.height)))); var bg = mxUtils.getValue(this.style, mxConstants.STYLE_SWIMLANE_FILLCOLOR, mxConstants.NONE); if (bg != mxConstants.NONE) { c.setFillColor(bg); c.rect(x, y, w, h); c.fill(); } c.begin(); c.moveTo(x, y); c.lineTo(x + w0, y); c.lineTo(x + w0, y + Math.max(0, h0 - co * 1.5)); c.lineTo(x + Math.max(0, w0 - co), y + h0); c.lineTo(x, y + h0); c.close(); c.fillAndStroke(); c.begin(); c.moveTo(x + w0, y); c.lineTo(x + w, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.lineTo(x, y + h0); c.stroke(); };
  mxCellRenderer.registerShape('umlFrame', UmlFrame);

  // module / component
  function ModuleShape() { mxns.mxCylinder.call(this); }
  mxUtils.extend(ModuleShape, mxns.mxCylinder);
  ModuleShape.prototype.jettyWidth = 20; ModuleShape.prototype.jettyHeight = 10;
  ModuleShape.prototype.redrawPath = function (path, x, y, w, h, isForeground) { var dx = parseFloat(mxUtils.getValue(this.style, 'jettyWidth', this.jettyWidth)); var dy = parseFloat(mxUtils.getValue(this.style, 'jettyHeight', this.jettyHeight)); var x0 = dx / 2; var x1 = x0 + dx / 2; var y0 = Math.min(dy, h - dy); var y1 = Math.min(y0 + 2 * dy, h - dy); if (isForeground) { path.moveTo(x0, y0); path.lineTo(x1, y0); path.lineTo(x1, y0 + dy); path.lineTo(x0, y0 + dy); path.moveTo(x0, y1); path.lineTo(x1, y1); path.lineTo(x1, y1 + dy); path.lineTo(x0, y1 + dy); path.end(); } else { path.moveTo(x0, 0); path.lineTo(w, 0); path.lineTo(w, h); path.lineTo(x0, h); path.lineTo(x0, y1 + dy); path.lineTo(0, y1 + dy); path.lineTo(0, y1); path.lineTo(x0, y1); path.lineTo(x0, y0 + dy); path.lineTo(0, y0 + dy); path.lineTo(0, y0); path.lineTo(x0, y0); path.close(); path.end(); } };
  mxCellRenderer.registerShape('module', ModuleShape);
  function ComponentShape() { mxns.mxCylinder.call(this); }
  mxUtils.extend(ComponentShape, mxns.mxCylinder);
  ComponentShape.prototype.jettyWidth = 32; ComponentShape.prototype.jettyHeight = 12;
  ComponentShape.prototype.redrawPath = function (path, x, y, w, h, isForeground) { var dx = parseFloat(mxUtils.getValue(this.style, 'jettyWidth', this.jettyWidth)); var dy = parseFloat(mxUtils.getValue(this.style, 'jettyHeight', this.jettyHeight)); var x0 = dx / 2; var x1 = x0 + dx / 2; var y0 = 0.3 * h - dy / 2; var y1 = 0.7 * h - dy / 2; if (isForeground) { path.moveTo(x0, y0); path.lineTo(x1, y0); path.lineTo(x1, y0 + dy); path.lineTo(x0, y0 + dy); path.moveTo(x0, y1); path.lineTo(x1, y1); path.lineTo(x1, y1 + dy); path.lineTo(x0, y1 + dy); path.end(); } else { path.moveTo(x0, 0); path.lineTo(w, 0); path.lineTo(w, h); path.lineTo(x0, h); path.lineTo(x0, y1 + dy); path.lineTo(0, y1 + dy); path.lineTo(0, y1); path.lineTo(x0, y1); path.lineTo(x0, y0 + dy); path.lineTo(0, y0 + dy); path.lineTo(0, y0); path.lineTo(x0, y0); path.close(); path.end(); } };
  mxCellRenderer.registerShape('component', ComponentShape);

  // table
  function TableShape() { mxns.mxSwimlane.call(this); }
  mxUtils.extend(TableShape, mxns.mxSwimlane);
  TableShape.prototype.getLabelBounds = function (rect) { var start = this.getTitleSize(); if (start == 0) return mxns.mxShape.prototype.getLabelBounds.apply(this, arguments); else return mxns.mxSwimlane.prototype.getLabelBounds.apply(this, arguments); };
  TableShape.prototype.paintVertexShape = function (c, x, y, w, h) { var start = this.getTitleSize(); if (start == 0) { mxns.mxRectangleShape.prototype.paintBackground.apply(this, arguments); } else { mxns.mxSwimlane.prototype.paintVertexShape.apply(this, arguments); c.translate(-x, -y); } this.paintForeground(c, x, y, w, h); };
  TableShape.prototype.paintForeground = function (c, x, y, w, h) { if (this.state != null) { var flipH = this.flipH, flipV = this.flipV; if (this.direction == mxConstants.DIRECTION_NORTH || this.direction == mxConstants.DIRECTION_SOUTH) { var tmp = flipH; flipH = flipV; flipV = tmp; } c.rotate(-this.getShapeRotation(), flipH, flipV, x + w / 2, y + h / 2); var s = this.scale; x = this.bounds.x / s; y = this.bounds.y / s; w = this.bounds.width / s; h = this.bounds.height / s; var graph = this.state.view.graph; var start = graph.getActualStartSize(this.state.cell); var rows = graph.model.getChildCells(this.state.cell, true); if (rows.length > 0) { var rowLines = mxUtils.getValue(this.state.style, 'rowLines', '1') != '0'; var columnLines = mxUtils.getValue(this.state.style, 'columnLines', '1') != '0'; if (rowLines) { for (var i = 1; i < rows.length; i++) { var geo = graph.getCellGeometry(rows[i]); if (geo != null) { c.begin(); c.moveTo(x + start.x, y + geo.y); c.lineTo(x + w - start.width, y + geo.y); c.end(); c.stroke(); } } } if (columnLines) { var cols = graph.model.getChildCells(rows[0], true); for (var i = 1; i < cols.length; i++) { var geo = graph.getCellGeometry(cols[i]); if (geo != null) { c.begin(); c.moveTo(x + geo.x + start.x, y + start.y); c.lineTo(x + geo.x + start.x, y + h - start.height); c.end(); c.stroke(); } } } } } };
  mxCellRenderer.registerShape('table', TableShape);

  // flexArrow handles integration
  const edgeCreateCustomHandles = mxns.mxEdgeHandler.prototype.createCustomHandles;
  mxns.mxEdgeHandler.prototype.createCustomHandles = function () {
    const prev = edgeCreateCustomHandles ? edgeCreateCustomHandles.apply(this, arguments) : null;
    const name = this.state.style['shape'];
    if (name === 'flexArrow') {
      return [];
    }
    return prev;
  };
  mxns.mxEdgeHandler.prototype.virtualBendsEnabled = true;
  mxns.mxEdgeHandler.prototype.isAddPointEvent = function (evt) { return mxns.mxEvent.isShiftDown(evt); };
}

export const SHAPE_FLEX_ARROW = 'flexArrow';
export const SHAPE_LINK = 'link';
export const SHAPE_CUBE = 'cube';
export const SHAPE_NOTE = 'note';
export const SHAPE_CARD = 'card';
export const SHAPE_TAPE = 'tape';
export const SHAPE_DOCUMENT = 'document';
export const SHAPE_PROCESS = 'process';
export const SHAPE_PARALLELOGRAM = 'parallelogram';
export const SHAPE_TRAPEZOID = 'trapezoid';
export const SHAPE_SINGLE_ARROW = 'singleArrow';
export const SHAPE_DOUBLE_ARROW = 'doubleArrow';
export const SHAPE_DATA_STORAGE = 'dataStorage';
export const SHAPE_DATASTORE = 'datastore';
export const SHAPE_OR = 'or';
export const SHAPE_XOR = 'xor';
export const SHAPE_LOOP_LIMIT = 'loopLimit';
export const SHAPE_OFF_PAGE_CONNECTOR = 'offPageConnector';
export const SHAPE_TAPE_DATA = 'tapeData';
export const SHAPE_OR_ELLIPSE = 'orEllipse';
export const SHAPE_SUM_ELLIPSE = 'sumEllipse';
export const SHAPE_LINE_ELLIPSE = 'lineEllipse';
export const SHAPE_DELAY = 'delay';
export const SHAPE_DISPLAY = 'display';
export const SHAPE_CORNER = 'corner';
export const SHAPE_CROSSBAR = 'crossbar';
export const SHAPE_TEE = 'tee';
export const SHAPE_SWITCH = 'switch';
export const SHAPE_CALLOUT = 'callout';
export const SHAPE_MESSAGE = 'message';
export const SHAPE_UML_ACTOR = 'umlActor';
export const SHAPE_UML_BOUNDARY = 'umlBoundary';
export const SHAPE_UML_ENTITY = 'umlEntity';
export const SHAPE_UML_DESTROY = 'umlDestroy';
export const SHAPE_UML_CONTROL = 'umlControl';
export const SHAPE_UML_LIFELINE = 'umlLifeline';
export const SHAPE_UML_FRAME = 'umlFrame';
export const SHAPE_MODULE = 'module';
export const SHAPE_COMPONENT = 'component';
export const SHAPE_TABLE = 'table';
export const SHAPE_LOLLIPOP = 'lollipop';
export const SHAPE_REQUIRES = 'requires';
export const SHAPE_REQUIRED_INTERFACE = 'requiredInterface';
export const SHAPE_PROVIDED_REQUIRED_INTERFACE = 'providedRequiredInterface';
