import MxGraphCanvas from "./src/MxGraphCanvas.vue";
import MxStencilSidebar from "./src/MxStencilSidebar.vue";
import MxEditDialog from "./src/MxEditDialog.vue";
import MxEdgeStylePicker from "./src/MxEdgeStylePicker.vue";
import MxStyleEditor from "./src/MxStyleEditor.vue";

export {
  MxGraphCanvas,
  MxStencilSidebar,
  MxEditDialog,
  MxEdgeStylePicker,
  MxStyleEditor,
};

export default {
  install(app) {
    app.component("MxGraphCanvas", MxGraphCanvas);
    app.component("MxStencilSidebar", MxStencilSidebar);
    app.component("MxEditDialog", MxEditDialog);
    app.component("MxEdgeStylePicker", MxEdgeStylePicker);
    app.component("MxStyleEditor", MxStyleEditor);
  },
};
