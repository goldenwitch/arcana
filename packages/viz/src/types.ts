// @arcana/viz - Type definitions

import type { Vocabulary } from "@arcana/vocabulary";

/**
 * Color scheme for visualization elements.
 */
export interface VizColors {
  /** Color for primitive types (e.g., string, int) */
  primitive?: string;
  /** Color for generic type definitions (e.g., List<T>) */
  generic?: string;
  /** Color for constructed generic types (e.g., List<string>) */
  constructed?: string;
  /** Color for user-defined types */
  user?: string;
  /** Color for dependency edges */
  edge?: string;
  /** Color for selected nodes */
  selected?: string;
  /** Color for highlighted nodes */
  highlighted?: string;
}

/**
 * Options for configuring the visualization.
 */
export interface VizOptions {
  /** Width of the SVG viewport */
  width?: number;
  /** Height of the SVG viewport */
  height?: number;
  /** Radius of word nodes */
  nodeRadius?: number;
  /** Vertical spacing between levels */
  levelHeight?: number;
  /** Horizontal spacing between nodes */
  nodeSpacing?: number;
  /** Custom color scheme */
  colors?: VizColors;
}

/**
 * Default color scheme using Tailwind palette.
 */
export const defaultColors: Required<VizColors> = {
  primitive: "#9ca3af", // gray-400
  generic: "#60a5fa", // blue-400
  constructed: "#818cf8", // indigo-400
  user: "#4ade80", // green-400
  edge: "#d1d5db", // gray-300
  selected: "#f59e0b", // amber-500
  highlighted: "#fbbf24", // amber-400
};

/**
 * Default visualization options.
 */
export const defaultOptions: Required<Omit<VizOptions, "colors">> & {
  colors: Required<VizColors>;
} = {
  width: 800,
  height: 600,
  nodeRadius: 8,
  levelHeight: 80,
  nodeSpacing: 120,
  colors: defaultColors,
};

/**
 * Controller interface for interacting with the visualization.
 */
export interface VizController {
  // Navigation
  /** Zoom in by a fixed factor */
  zoomIn(): void;
  /** Zoom out by a fixed factor */
  zoomOut(): void;
  /** Reset to initial view (centered, no zoom) */
  resetView(): void;
  /** Pan to center on given coordinates */
  panTo(x: number, y: number): void;
  /** Pan to center on a specific level */
  panToLevel(level: number): void;

  // Selection
  /** Select a word by ID, or clear selection with null */
  select(wordId: string | null): void;
  /** Get the currently selected word ID */
  getSelection(): string | null;

  // Highlighting
  /** Highlight multiple words by ID */
  highlight(wordIds: string[]): void;
  /** Clear all highlights */
  clearHighlight(): void;

  // Lifecycle
  /** Update the visualization with new vocabulary data */
  update(vocab: Vocabulary): void;
  /** Clean up and remove the visualization */
  destroy(): void;

  // Events
  /** Subscribe to selection changes, returns unsubscribe function */
  onSelect(callback: (wordId: string | null) => void): () => void;
  /** Subscribe to hover changes, returns unsubscribe function */
  onHover(callback: (wordId: string | null) => void): () => void;
}

/**
 * Position of a node in the layout.
 */
export interface NodePosition {
  id: string;
  x: number;
  y: number;
}

/**
 * Edge between two nodes.
 */
export interface LayoutEdge {
  sourceId: string;
  targetId: string;
}

/**
 * Result of layout computation.
 */
export interface LayoutResult {
  /** Positions of all nodes */
  nodes: NodePosition[];
  /** Edges between nodes */
  edges: LayoutEdge[];
  /** Total width of the layout */
  width: number;
  /** Total height of the layout */
  height: number;
  /** Y-coordinate for each level (level number -> Y position) */
  levelYPositions: Map<number, number>;
}
