// @arcana/viz - D3-based visualization components

// Types
export type {
  VizController,
  VizOptions,
  VizColors,
  LayoutResult,
  NodePosition,
  LayoutEdge,
  PhraseFocusOptions,
} from "./types.js";

export { defaultColors, defaultOptions, defaultPhraseFocusOptions } from "./types.js";

// Layout
export { computeLayout, createPositionMap, groupByLevel } from "./layout.js";

// Phrase-focused layout
export {
  computePhraseFocusedLayout,
  computeDefaultLayout,
  getPhraseVisualState,
  getEdgeVisualState,
} from "./phrase-layout.js";

export type { PhraseFocusedLayout, PhraseVisualState, EdgeVisualState } from "./phrase-layout.js";

// Main entry point
export { createVisualization } from "./visualization.js";
